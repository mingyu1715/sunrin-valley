package dev.sunrin.core.server;

import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.mojang.authlib.GameProfile;
import dev.sunrin.core.domain.OperatorLease;
import dev.sunrin.core.domain.OperatorLease.Entry;
import dev.sunrin.core.domain.OperatorLease.Receipt;
import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.players.ServerOpListEntry;
import net.minecraft.world.level.GameType;
import net.minecraftforge.event.ForgeEventFactory;
import net.minecraftforge.fml.loading.FMLPaths;

/** UUID allowlist; all actions are fixed operations on the requesting operator. */
public final class Operators {
    private final MinecraftServer server;
    private final Path journal;
    private record Saved(String name, Receipt receipt) {}

    public Operators(MinecraftServer server, Path root) {
        this.server = server;
        journal = root.resolve("temporary-ops.json");
    }

    /** Read again for every action so a revoked UUID cannot use a cached permission. */
    public boolean allowed(ServerPlayer player) {
        try {
            JsonObject settings = AtomicJson.read(FMLPaths.CONFIGDIR.get().resolve("sunrin/geonpi.json"));
            Set<UUID> values = new HashSet<>();
            if (settings.has("operatorUuids")) {
                for (JsonElement value : settings.getAsJsonArray("operatorUuids"))
                    values.add(UUID.fromString(string(value)));
            }
            return values.contains(player.getUUID());
        } catch (Exception invalid) { return false; }
    }

    public void toggle(ServerPlayer player, boolean enabled) throws IOException {
        if (!allowed(player)) throw new IOException("관리자 UUID 권한이 없습니다.");
        GameProfile profile = player.getGameProfile();
        if (!enabled && (server.getPlayerList().isAllowCheatsForAllPlayers()
                || (server.isSingleplayerOwner(profile) && server.getWorldData().getAllowCommands())))
            throw new IOException("통합 서버의 기본 관리자 권한은 OP 패널에서 끌 수 없습니다.");

        Map<UUID, Saved> records = readRecords();
        UUID id = player.getUUID();
        Saved previous = records.get(id);
        Entry current = entry(profile);
        Receipt intent;
        try {
            intent = OperatorLease.requested(previous == null ? null : previous.receipt(), current, enabled,
                    Entry.op(server.getOperatorUserPermissionLevel(), false));
        } catch (IllegalStateException external) {
            throw new IOException("외부에서 OP 설정이 변경되어 임시 변경을 중단했습니다.", external);
        }
        String name = previous == null ? profile.getName() : previous.name();
        records.put(id, new Saved(name, intent));
        writeRecords(records); // Durable intent BEFORE any native mutation, including repeated toggles.
        apply(profile, intent.pending());
        if (!entry(profile).equals(intent.pending()))
            throw new IOException("서버에서 OP 변경을 적용하지 않았습니다.");
        records.put(id, new Saved(name, new Receipt(intent.original(), intent.pending(), null)));
        writeRecords(records);
    }

    public void mode(ServerPlayer player, String value) throws IOException {
        if (!allowed(player)) throw new IOException("관리자 UUID 권한이 없습니다.");
        GameType type = switch (value) {
            case "survival" -> GameType.SURVIVAL;
            case "creative" -> GameType.CREATIVE;
            case "spectator" -> GameType.SPECTATOR;
            default -> throw new IOException("지원하지 않는 게임 모드입니다.");
        };
        player.setGameMode(type);
    }

    /** Cleanup restores only the exact native entry this lease still owns. */
    public void revokeTemporary(UUID only) throws IOException {
        Map<UUID, Saved> records = readRecords(); // Validate the entire journal before touching native state.
        for (UUID id : new ArrayList<>(records.keySet())) {
            if (only != null && !only.equals(id)) continue;
            Saved saved = records.get(id);
            GameProfile profile = new GameProfile(id, saved.name());
            Entry current = entry(profile);
            Entry restore = OperatorLease.restore(saved.receipt(), current);
            if (!restore.equals(current)) {
                apply(profile, restore);
                if (!entry(profile).equals(restore))
                    throw new IOException("서버에서 원래 OP 설정 복원을 적용하지 않았습니다.");
            }
            records.remove(id);
            writeRecords(records); // If interrupted after restoration, replay sees the original and only clears.
        }
    }

    private Entry entry(GameProfile profile) {
        ServerOpListEntry nativeEntry = server.getPlayerList().getOps().get(profile);
        return nativeEntry == null ? Entry.absent()
                : Entry.op(nativeEntry.getLevel(), nativeEntry.getBypassesPlayerLimit());
    }

    private void apply(GameProfile profile, Entry target) throws IOException {
        if (entry(profile).equals(target)) return;
        var players = server.getPlayerList();
        if (target.present()) {
            // PlayerList.op always uses the configured default level. Use the public list API to retain metadata,
            // while honoring the same Forge permission hook used by PlayerList.op/deop.
            if (ForgeEventFactory.onPermissionChanged(profile, target.level(), players))
                throw new IOException("서버 권한 이벤트가 OP 변경을 취소했습니다.");
            players.getOps().add(new ServerOpListEntry(profile, target.level(), target.bypassesPlayerLimit()));
        } else {
            players.deop(profile);
        }
        // StoredUserList.add/remove log and swallow save failures; an explicit save keeps our receipt on failure.
        players.getOps().save();
        ServerPlayer online = players.getPlayer(profile.getId());
        if (online != null) players.sendPlayerPermissionLevel(online);
    }

    private Map<UUID, Saved> readRecords() throws IOException {
        JsonObject data = AtomicJson.read(journal);
        Map<UUID, Saved> records = new LinkedHashMap<>();
        try {
            for (String key : data.keySet()) {
                UUID id = UUID.fromString(key);
                if (!id.toString().equals(key)) throw new IllegalArgumentException("Noncanonical UUID");
                JsonObject record = data.getAsJsonObject(key);
                fields(record, "version", "name", "original", "applied", "pending");
                if (integer(record.get("version")) != 1) throw new IllegalArgumentException("Unknown OP journal version");
                String name = string(record.get("name"));
                if (name.isEmpty() || name.length() > 64) throw new IllegalArgumentException("Invalid profile name");
                Receipt receipt = new Receipt(decodeEntry(record.get("original")), decodeEntry(record.get("applied")),
                        record.get("pending").isJsonNull() ? null : decodeEntry(record.get("pending")));
                records.put(id, new Saved(name, receipt));
            }
        } catch (RuntimeException invalid) {
            throw new IOException("임시 OP 기록이 올바르지 않아 변경하지 않았습니다.", invalid);
        }
        return records;
    }

    private void writeRecords(Map<UUID, Saved> records) throws IOException {
        JsonObject data = new JsonObject();
        for (var record : records.entrySet()) {
            Saved saved = record.getValue();
            JsonObject value = new JsonObject();
            value.addProperty("version", 1);
            value.addProperty("name", saved.name());
            value.add("original", encodeEntry(saved.receipt().original()));
            value.add("applied", encodeEntry(saved.receipt().applied()));
            value.add("pending", saved.receipt().pending() == null ? JsonNull.INSTANCE : encodeEntry(saved.receipt().pending()));
            data.add(record.getKey().toString(), value);
        }
        AtomicJson.write(journal, data);
    }

    private static JsonObject encodeEntry(Entry entry) {
        JsonObject value = new JsonObject();
        value.addProperty("present", entry.present());
        if (entry.present()) {
            value.addProperty("level", entry.level());
            value.addProperty("bypassesPlayerLimit", entry.bypassesPlayerLimit());
        }
        return value;
    }

    private static Entry decodeEntry(JsonElement element) {
        JsonObject value = element.getAsJsonObject();
        boolean present = bool(value.get("present"));
        if (!present) {
            fields(value, "present");
            return Entry.absent();
        }
        fields(value, "present", "level", "bypassesPlayerLimit");
        return Entry.op(integer(value.get("level")), bool(value.get("bypassesPlayerLimit")));
    }

    private static void fields(JsonObject value, String... expected) {
        if (!value.keySet().equals(Set.of(expected))) throw new IllegalArgumentException("Unknown or missing OP journal fields");
    }
    private static String string(JsonElement value) {
        if (!(value instanceof JsonPrimitive primitive) || !primitive.isString()) throw new IllegalArgumentException("Expected string");
        return value.getAsString();
    }
    private static boolean bool(JsonElement value) {
        if (!(value instanceof JsonPrimitive primitive) || !primitive.isBoolean()) throw new IllegalArgumentException("Expected boolean");
        return value.getAsBoolean();
    }
    private static int integer(JsonElement value) {
        if (!(value instanceof JsonPrimitive primitive) || !primitive.isNumber()) throw new IllegalArgumentException("Expected integer");
        return value.getAsBigDecimal().intValueExact();
    }
}
