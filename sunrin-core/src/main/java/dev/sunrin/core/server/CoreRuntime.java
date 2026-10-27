package dev.sunrin.core.server;

import com.google.gson.*;
import dev.sunrin.core.api.BoxOpenRequestEvent;
import dev.sunrin.core.domain.ProfileRules.Profile;
import dev.sunrin.core.net.CoreNetwork;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.LevelResource;
import net.minecraftforge.common.MinecraftForge;

public final class CoreRuntime {
    private static CoreRuntime instance;
    private final MinecraftServer server;
    public final Profiles profiles;
    public final Operators operators;
    public final Deliveries deliveries;
    private final Map<UUID, Pending> pending = new HashMap<>();
    private final Set<UUID> recoveryChecked = new HashSet<>();
    private final Map<UUID, UUID> shown = new HashMap<>();
    private final Map<UUID, Integer> lastOpenTick = new HashMap<>();
    private final Map<UUID, Integer> errorTicks = new HashMap<>();
    private record Pending(UUID token, String kind, long deadline) {}
    public CoreRuntime(MinecraftServer server) throws IOException {
        this.server = server; Path root = server.getWorldPath(LevelResource.ROOT).resolve("data/sunrin-core");
        profiles = new Profiles(root); operators = new Operators(server, root); deliveries = new Deliveries(server, root);
        operators.revokeTemporary(null); instance = this;
    }
    public static CoreRuntime current() { return instance; }
    public static void stop() { if (instance != null) { try { instance.operators.revokeTemporary(null); } catch (IOException error) { dev.sunrin.core.SunrinCore.LOG.error("Temporary OP cleanup failed", error); } instance = null; } }
    private void main(ServerPlayer player) {
        if (!server.isSameThread() || player.getServer() != server) throw new IllegalStateException("Server main thread required");
    }
    private boolean ensureRecovery(ServerPlayer player) {
        if (recoveryChecked.add(player.getUUID())) {
            boolean profileValid = true;
            try { profiles.load(player.getUUID()); } catch (IOException error) { profileValid = false; deliveries.block(player); fail(player, error.getMessage()); }
            try { deliveries.checkRecovery(player); } catch (IOException error) { fail(player, error.getMessage()); }
            if (!profileValid) deliveries.block(player);
        }
        return !deliveries.isBlocked(player);
    }
    public void login(ServerPlayer player) {
        try { operators.revokeTemporary(player.getUUID()); }
        catch (IOException error) {
            deliveries.block(player);
            dev.sunrin.core.SunrinCore.LOG.error("Reconnect permission recovery failed; login refused and lease preserved", error);
            player.connection.disconnect(Component.literal("임시 관리자 권한 복구를 확인하지 못했습니다. 운영자에게 문의해 주세요."));
            return;
        }
        ensureRecovery(player); player.refreshDisplayName(); player.refreshTabListName(); syncProfiles();
    }
    public void recheck(ServerPlayer player) { recoveryChecked.remove(player.getUUID()); login(player); }
    public void logout(ServerPlayer player) {
        pending.remove(player.getUUID()); shown.remove(player.getUUID()); lastOpenTick.remove(player.getUUID()); errorTicks.remove(player.getUUID()); recoveryChecked.remove(player.getUUID());
        try { operators.revokeTemporary(player.getUUID()); } catch (IOException error) { dev.sunrin.core.SunrinCore.LOG.error("OP logout cleanup failed", error); }
    }
    public void requestOpen(ServerPlayer player, String kind) {
        main(player);
        if (!Set.of("random", "furniture").contains(kind) || !player.isAlive() || !ensureRecovery(player)) return;
        int tick = server.getTickCount();
        if (tick - lastOpenTick.getOrDefault(player.getUUID(), tick - 8) < 4) return;
        Pending old = pending.get(player.getUUID());
        if (old != null && old.deadline > System.currentTimeMillis()) return;
        if (deliveries.isBlocked(player)) { fail(player, "미완료 지급 기록을 운영자에게 확인해 주세요."); return; }
        String box = kind.equals("random") ? "kubejs:random_box" : "kubejs:furniture_random_box";
        if (Deliveries.count(player, box) < 1) { fail(player, "남은 상자가 없습니다."); return; }
        lastOpenTick.put(player.getUUID(), tick);
        Pending request = new Pending(UUID.randomUUID(), kind, System.currentTimeMillis() + 10_000);
        pending.put(player.getUUID(), request);
        MinecraftForge.EVENT_BUS.post(new BoxOpenRequestEvent(player, request.token.toString(), kind));
        if (pending.get(player.getUUID()) == request) reject(player, request.token.toString(), "보상 설정을 불러오지 못했습니다.");
    }
    public boolean commitBox(ServerPlayer player, String requestId, String boxId, ItemStack reward, String tier, String version, String probabilityJson) {
        main(player); Pending request = pending.get(player.getUUID());
        try {
            if (request == null || !request.token.toString().equals(requestId) || request.deadline < System.currentTimeMillis()) return false;
            String expected = request.kind.equals("random") ? "kubejs:random_box" : "kubejs:furniture_random_box";
            if (!expected.equals(boxId) || reward.isEmpty() || reward.getCount() != 1 || tier.length() > 32 || version.length() > 128 || probabilityJson.length() > 32768)
                throw new IOException("잘못된 보상 요청입니다.");
            JsonArray table = JsonParser.parseString(probabilityJson.isBlank() ? "[]" : probabilityJson).getAsJsonArray();
            if (table.size() > 64) throw new IOException("확률 표시 데이터가 너무 큽니다.");
            pending.remove(player.getUUID());
            JsonObject metadata = new JsonObject(); metadata.addProperty("configVersion", version); metadata.addProperty("tier", tier); metadata.add("probabilities", table);
            boolean delivered = deliveries.deliver(player, request.token, "box", boxId, List.of(reward.copy()), metadata, () -> {});
            if (!delivered) return false;
            if (request.kind.equals("random")) {
                shown.put(player.getUUID(), request.token);
                CompoundTag data = view("box"); data.putUUID("transaction", request.token);
                data.put("reward", reward.save(new CompoundTag())); data.putString("tier", tier);
                data.putString("version", version); data.putString("probabilities", probabilityJson);
                data.putInt("remaining", Deliveries.count(player, boxId)); CoreNetwork.send(player, data);
            } else player.displayClientMessage(Component.literal("가구랜덤박스: ").append(reward.getHoverName()), true);
            return true;
        } catch (Exception failure) { pending.remove(player.getUUID()); fail(player, failure.getMessage()); return false; }
    }
    public void reject(ServerPlayer player, String id, String message) {
        Pending request = pending.get(player.getUUID());
        if (request != null && request.token.toString().equals(id)) { pending.remove(player.getUUID()); fail(player, message); }
    }
    public boolean grant(ServerPlayer player, String grantId, List<ItemStack> rewards) {
        main(player);
        if (!ensureRecovery(player)) return false;
        if (grantId == null || grantId.length() > 160 || rewards.isEmpty() || rewards.size() > 16) return false;
        UUID id = UUID.nameUUIDFromBytes((player.getUUID() + ":" + grantId).getBytes(StandardCharsets.UTF_8));
        try {
            boolean fresh = deliveries.deliver(player, id, grantId, "", rewards);
            UUID transaction = shown.get(player.getUUID());
            if (transaction != null) { CompoundTag update = view("box_count"); update.putUUID("transaction", transaction); update.putInt("remaining", Deliveries.count(player, "kubejs:random_box")); CoreNetwork.send(player, update); }
            // Existing completed grant is an acknowledged idempotent success for KubeJS paid-round state.
            return fresh || !deliveries.isBlocked(player);
        } catch (IOException error) { fail(player, error.getMessage()); return false; }
    }
    public void ticket(ServerPlayer player, String kind) {
        main(player); if (!ensureRecovery(player)) { fail(player, "미완료 거래를 먼저 확인해 주세요."); return; }
        String item = kind.equals("title") ? "kubejs:rename_ticket" : "kubejs:name_color_ticket";
        if (Deliveries.find(player, item) < 0) return;
        Pending request = new Pending(UUID.randomUUID(), kind, System.currentTimeMillis() + 600_000);
        pending.put(player.getUUID(), request); CompoundTag data = view(kind); data.putUUID("token", request.token);
        data.putString("profile", profiles.json(player.getUUID()).toString()); data.putInt("defaultNameColor", player.getTeam() != null && player.getTeam().getColor().getColor() != null ? player.getTeam().getColor().getColor() : 0xffffff); data.putString("account", player.getGameProfile().getName());
        CoreNetwork.send(player, data);
    }
    public void admin(ServerPlayer player) {
        if (!operators.allowed(player)) { fail(player, "관리자 UUID 권한이 없습니다."); return; }
        Pending request = new Pending(UUID.randomUUID(), "admin", System.currentTimeMillis() + 600_000);
        pending.put(player.getUUID(), request); sendAdmin(player, request);
    }
    private void sendAdmin(ServerPlayer player, Pending request) {
        CompoundTag data = view("admin"); data.putUUID("token", request.token); data.putBoolean("op", server.getPlayerList().isOp(player.getGameProfile()));
        data.putString("mode", player.gameMode.getGameModeForPlayer().getName()); CoreNetwork.send(player, data);
    }
    public void action(ServerPlayer player, CoreNetwork.ClientAction action) {
        main(player);
        if (action.action().equals("next")) {
            if (action.token().equals(shown.get(player.getUUID()))) {
                if (server.getTickCount() - lastOpenTick.getOrDefault(player.getUUID(), server.getTickCount() - 8) < 4) fail(player, "잠시 후 한 번 더 눌러 주세요.");
                else requestOpen(player, "random");
            }
            return;
        }
        if (action.action().equals("close")) { shown.remove(player.getUUID(), action.token()); Pending p = pending.get(player.getUUID()); if (p != null && p.token.equals(action.token())) pending.remove(player.getUUID()); return; }
        Pending request = pending.get(player.getUUID());
        if (request == null || !request.token.equals(action.token())) return;
        if (request.deadline < System.currentTimeMillis() || !player.isAlive()) { fail(player, "창을 닫고 다시 열어 주세요. 이용권은 사용하지 않았습니다."); return; }
        try {
            if (request.kind.equals("admin")) {
                if (action.action().equals("op")) { if (!Set.of("on", "off").contains(action.value())) throw new IOException("잘못된 OP 동작입니다."); operators.toggle(player, action.value().equals("on")); }
                else if (action.action().equals("mode")) operators.mode(player, action.value()); else return;
                sendAdmin(player, request); return;
            }
            Profile before = profiles.get(player.getUUID()); Profile after; String ticket;
            if (request.kind.equals("title") && action.action().equals("title")) { after = before.withTitle(action.value(), action.style(), action.color()); ticket = "kubejs:rename_ticket"; }
            else if (request.kind.equals("color") && action.action().equals("color")) { after = before.withNameColor(action.color()); ticket = "kubejs:name_color_ticket"; } else return;
            JsonObject metadata = new JsonObject(); metadata.add("profileBefore", profiles.json(player.getUUID()));
            metadata.addProperty("titleText", after.titleText()); metadata.addProperty("titleStyle", after.titleStyle()); metadata.addProperty("titleColor", after.titleColor()); metadata.addProperty("nameColor", after.nameColor()); metadata.addProperty("hasNameColor", after.hasNameColor());
            deliveries.deliver(player, request.token, "profile", ticket, List.of(), metadata, () -> profiles.save(player.getUUID(), after));
            pending.remove(player.getUUID()); player.refreshDisplayName(); player.refreshTabListName(); syncProfiles();
            CompoundTag ack = view("saved"); ack.putUUID("token", request.token); CoreNetwork.send(player, ack);
        } catch (Exception error) { fail(player, error.getMessage()); }
    }
    public void syncProfiles() {
        CompoundTag data = view("profiles"), map = new CompoundTag();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) map.putString(player.getUUID().toString(), profiles.json(player.getUUID()).toString());
        data.put("profiles", map);
        for (ServerPlayer player : server.getPlayerList().getPlayers()) CoreNetwork.send(player, data);
    }
    private static CompoundTag view(String kind) { CompoundTag tag = new CompoundTag(); tag.putString("kind", kind); return tag; }
    public static void fail(ServerPlayer player, String message) {
        CoreRuntime runtime = current();
        if (runtime != null) {
            int tick = runtime.server.getTickCount();
            if (tick - runtime.errorTicks.getOrDefault(player.getUUID(), tick - 20) >= 20) {
                runtime.errorTicks.put(player.getUUID(), tick);
                dev.sunrin.core.SunrinCore.LOG.warn("Sunrin action rejected for {}: {}", player.getUUID(), message);
            }
        }
        CompoundTag data = view("error"); data.putString("message", message == null ? "처리 중 오류가 발생했습니다." : message.substring(0, Math.min(300, message.length()))); CoreNetwork.send(player, data);
    }
}
