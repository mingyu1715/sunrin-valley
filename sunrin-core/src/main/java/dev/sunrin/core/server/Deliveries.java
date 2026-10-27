package dev.sunrin.core.server;

import com.google.gson.*;
import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.util.*;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtIo;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.LevelResource;

/** Delivery bridge only: policy, reward selection and weights remain in KubeJS. */
public final class Deliveries {
    private static final String RECEIPTS = "sunrin_core_receipts", PICKUPS = "sunrin_pickup_receipts", DROP_TAG = "sunrin_delivery_drop";
    private final MinecraftServer server;
    private final Path root;
    private final Set<UUID> blocked = new HashSet<>();
    private final Map<UUID, ItemEntity> pickupGuards = new HashMap<>();
    public Deliveries(MinecraftServer server, Path dataRoot) { this.server = server; root = dataRoot.resolve("deliveries"); }
    private Path directory(UUID player) { return root.resolve(player.toString()); }
    private Path path(UUID player, UUID id) { return directory(player).resolve(id + ".json"); }
    public boolean isBlocked(ServerPlayer player) { return blocked.contains(player.getUUID()); }
    public void block(ServerPlayer player) { blocked.add(player.getUUID()); }
    @FunctionalInterface public interface Mutation { void run() throws IOException; }
    public boolean deliver(ServerPlayer player, UUID id, String grantId, String boxId, List<ItemStack> rewards) throws IOException {
        return deliver(player, id, grantId, boxId, rewards, new JsonObject(), () -> {});
    }
    public boolean deliver(ServerPlayer player, UUID id, String grantId, String boxId, List<ItemStack> rewards, JsonObject metadata, Mutation mutation) throws IOException {
        if (isBlocked(player)) throw new IOException("미완료 지급 기록을 운영자가 확인해야 합니다.");
        Path file = path(player.getUUID(), id);
        CompoundTag receipts = player.getPersistentData().getCompound(RECEIPTS);
        try {
            // Recovery is cached for this session, so recheck this pair before acknowledging any retry.
            if (receipts.contains(id.toString()) || Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
                validateDelivered(AtomicJson.read(file), player.getUUID(), id.toString(), receipts);
                return false;
            }
        } catch (Exception failure) {
            block(player); throw new IOException("지급 기록과 저장 영수증을 확인해야 합니다. 원본을 보존했습니다.", failure);
        }
        int slot = boxId.isEmpty() ? -1 : find(player, boxId);
        if (!boxId.isEmpty() && slot < 0) throw new IOException("상자 또는 이용권이 없습니다.");
        if ((rewards.isEmpty() && !boxId.equals("kubejs:rename_ticket") && !boxId.equals("kubejs:name_color_ticket")) || rewards.stream().anyMatch(s -> s.isEmpty() || s.getCount() < 1 || s.getCount() > s.getMaxStackSize())) throw new IOException("잘못된 보상입니다.");
        JsonObject record = new JsonObject(); record.addProperty("schemaVersion", 1);
        record.addProperty("player", player.getUUID().toString()); record.addProperty("transaction", id.toString());
        record.addProperty("grantId", grantId); record.addProperty("boxId", boxId); record.addProperty("createdAt", System.currentTimeMillis());
        record.addProperty("state", "PREPARED"); record.addProperty("inputSlot", slot);
        if (slot >= 0) record.addProperty("inputBefore", player.getInventory().getItem(slot).save(new CompoundTag()).toString());
        JsonArray stacks = new JsonArray(); for (ItemStack stack : rewards) stacks.add(stack.save(new CompoundTag()).toString());
        record.add("rewards", stacks); record.add("metadata", metadata); AtomicJson.write(file, record);
        try {
            mutation.run();
            if (slot >= 0) player.getInventory().removeItem(slot, 1);
            JsonArray drops = new JsonArray(); JsonObject dropInfo = new JsonObject();
            for (ItemStack reward : rewards) {
                ItemStack remainder = net.minecraftforge.items.ItemHandlerHelper.insertItemStacked(new net.minecraftforge.items.wrapper.PlayerMainInvWrapper(player.getInventory()), reward.copy(), false);
                if (!remainder.isEmpty()) {
                    ItemEntity entity = player.drop(remainder, false);
                    if (entity == null || !entity.isAddedToWorld()) throw new IOException("바닥 보상 생성에 실패했습니다. 드롭 제한과 청크 상태를 확인해 주세요.");
                    entity.getPersistentData().putString("sunrin_transaction", id.toString());
                    entity.getPersistentData().putString("sunrin_recipient", player.getUUID().toString());
                    // Unique only while on the ground: prevents unrelated reward entities merging away their receipt UUID.
                    entity.getItem().getOrCreateTag().putUUID(DROP_TAG, entity.getUUID());
                    entity.setPickUpDelay(40); drops.add(entity.getUUID().toString());
                    JsonObject info = new JsonObject(); info.addProperty("dimension", entity.level().dimension().location().toString());
                    info.addProperty("count", entity.getItem().getCount()); info.addProperty("x", entity.getX()); info.addProperty("y", entity.getY()); info.addProperty("z", entity.getZ()); dropInfo.add(entity.getUUID().toString(), info);
                }
            }
            record.add("dropEntities", drops); record.add("dropInfo", dropInfo);
            player.getInventory().setChanged(); putReceipt(player, RECEIPTS, id.toString()); saveAndVerify(player, RECEIPTS, id.toString());
            record.addProperty("state", "DELIVERED"); AtomicJson.write(file, record); return true;
        } catch (Exception failure) {
            block(player); record.addProperty("state", "REVIEW"); record.addProperty("error", failure.toString());
            try { AtomicJson.write(file, record); } catch (IOException ignored) { /* PREPARED intent remains recoverable. */ }
            throw new IOException("지급을 중단했습니다. 거래 " + id + "의 복구 기록을 확인해 주세요.", failure);
        }
    }
    private static void putReceipt(ServerPlayer player, String group, String id) {
        CompoundTag receipts = player.getPersistentData().getCompound(group); receipts.putBoolean(id, true); player.getPersistentData().put(group, receipts);
    }
    private Path playerFile(UUID id) { return server.getWorldPath(LevelResource.PLAYER_DATA_DIR).resolve(id + ".dat"); }
    private CompoundTag savedData(UUID id) throws IOException {
        Path file = playerFile(id); if (!Files.isRegularFile(file) || Files.isSymbolicLink(file)) throw new IOException("플레이어 저장 파일을 확인할 수 없습니다: " + id);
        return NbtIo.readCompressed(file.toFile()).getCompound("ForgeData");
    }
    private void saveAndVerify(ServerPlayer player, String group, String receipt) throws IOException {
        server.getPlayerList().saveAll(); Path file = playerFile(player.getUUID());
        if (!Files.isRegularFile(file) || Files.isSymbolicLink(file)) throw new IOException("플레이어 저장 파일이 없습니다.");
        try (FileChannel channel = FileChannel.open(file, StandardOpenOption.WRITE)) { channel.force(true); }
        if (!savedData(player.getUUID()).getCompound(group).getBoolean(receipt)) throw new IOException("플레이어 저장 확인에 실패했습니다.");
    }
    /** Remove our merge guard only across the native inventory insertion, retaining all publisher NBT. */
    public boolean preparePickup(ServerPlayer picker, ItemEntity entity) {
        if (!entity.getPersistentData().contains("sunrin_transaction")) return true;
        ItemStack nativeStack = entity.getItem().copy();
        clearGuard(nativeStack, entity.getUUID());
        int originalCount = nativeStack.getCount();
        ItemStack remainder = net.minecraftforge.items.ItemHandlerHelper.insertItemStacked(new net.minecraftforge.items.wrapper.PlayerMainInvWrapper(picker.getInventory()), nativeStack, true);
        // Creative Inventory.add can otherwise destroy overflow. Survival may partially insert normally.
        if (picker.getAbilities().instabuild && !remainder.isEmpty()) return false;
        if (remainder.getCount() >= originalCount) return true;
        clearGuard(entity.getItem(), entity.getUUID());
        pickupGuards.put(entity.getUUID(), entity);
        return true;
    }
    private static void clearGuard(ItemStack stack, UUID entity) {
        CompoundTag tag = stack.getTag();
        if (tag != null && tag.hasUUID(DROP_TAG) && tag.getUUID(DROP_TAG).equals(entity)) {
            tag.remove(DROP_TAG); if (tag.isEmpty()) stack.setTag(null);
        }
    }
    private void restoreGuard(ItemEntity entity) {
        pickupGuards.remove(entity.getUUID());
        if (!entity.getItem().isEmpty() && !entity.isRemoved()) entity.getItem().getOrCreateTag().putUUID(DROP_TAG, entity.getUUID());
    }
    /** Also restores guards if a later mod cancelled pickup and no post-pickup event was emitted. */
    public void finishPickups() {
        for (ItemEntity entity : new ArrayList<>(pickupGuards.values())) restoreGuard(entity);
    }
    public void recordPickup(ServerPlayer picker, ItemEntity entity, int count) {
        CompoundTag data = entity.getPersistentData(); if (!data.contains("sunrin_transaction") || count <= 0) return;
        UUID recipient;
        try {
            recipient = UUID.fromString(data.getString("sunrin_recipient")); UUID id = UUID.fromString(data.getString("sunrin_transaction"));
            Path file = path(recipient, id); JsonObject record = AtomicJson.read(file);
            if (!record.has("dropInfo") || !record.getAsJsonObject("dropInfo").has(entity.getUUID().toString())) throw new IOException("알 수 없는 바닥 보상입니다.");
            UUID receipt = UUID.randomUUID(); putReceipt(picker, PICKUPS, receipt.toString());
            // Keep every native item's NBT and remove only our temporary merge guard after insertion.
            for (int i = 0; i < picker.getInventory().getContainerSize(); i++) {
                clearGuard(picker.getInventory().getItem(i), entity.getUUID());
            }
            picker.getInventory().setChanged(); saveAndVerify(picker, PICKUPS, receipt.toString());
            JsonArray pickups = record.has("pickups") ? record.getAsJsonArray("pickups") : new JsonArray();
            JsonObject pickup = new JsonObject(); pickup.addProperty("entity", entity.getUUID().toString()); pickup.addProperty("player", picker.getUUID().toString()); pickup.addProperty("receipt", receipt.toString()); pickup.addProperty("count", count); pickups.add(pickup);
            record.add("pickups", pickups); AtomicJson.write(file, record);
        } catch (Exception error) {
            try { blocked.add(UUID.fromString(data.getString("sunrin_recipient"))); } catch (IllegalArgumentException ignored) {}
            dev.sunrin.core.SunrinCore.LOG.error("Pickup receipt needs review; original rewards retained in journal", error);
        } finally { restoreGuard(entity); }
    }
    public void terminalDrop(ItemEntity entity, String reason) {
        CompoundTag data = entity.getPersistentData(); if (!data.contains("sunrin_transaction")) return;
        try {
            Path file = path(UUID.fromString(data.getString("sunrin_recipient")), UUID.fromString(data.getString("sunrin_transaction")));
            JsonObject record = AtomicJson.read(file); JsonObject terminal = record.has("terminalDrops") ? record.getAsJsonObject("terminalDrops") : new JsonObject();
            terminal.addProperty(entity.getUUID().toString(), reason); record.add("terminalDrops", terminal); AtomicJson.write(file, record);
        } catch (Exception error) { dev.sunrin.core.SunrinCore.LOG.error("Drop lifecycle receipt needs review", error); }
    }
    private void checkDrops(JsonObject record) throws IOException {
        if (!record.has("dropEntities")) return;
        for (JsonElement drop : record.getAsJsonArray("dropEntities")) {
            String id = drop.getAsString(); UUID entityId = UUID.fromString(id);
            if (record.has("terminalDrops") && record.getAsJsonObject("terminalDrops").has(id)) continue;
            int picked = 0;
            if (record.has("pickups")) for (JsonElement entry : record.getAsJsonArray("pickups")) {
                JsonObject pickup = entry.getAsJsonObject(); if (!id.equals(pickup.get("entity").getAsString())) continue;
                UUID picker = UUID.fromString(pickup.get("player").getAsString());
                if (!savedData(picker).getCompound(PICKUPS).getBoolean(pickup.get("receipt").getAsString())) throw new IOException("습득 저장 기록을 확인할 수 없습니다: " + id);
                picked += pickup.get("count").getAsInt();
            }
            if (!record.has("dropInfo") || !record.getAsJsonObject("dropInfo").has(id)) throw new IOException("바닥 지급 기록을 확인해야 합니다: " + id);
            int expected = record.getAsJsonObject("dropInfo").getAsJsonObject(id).get("count").getAsInt();
            if (picked == expected) continue;
            ItemEntity found = null;
            for (var level : server.getAllLevels()) if (level.getEntity(entityId) instanceof ItemEntity entity) { found = entity; break; }
            if (found == null || found.getItem().getCount() + picked != expected) throw new IOException("바닥 보상 존재/수량을 확인해야 합니다: " + id + ". 자동 재지급하지 않았습니다.");
        }
    }
    public void checkRecovery(ServerPlayer player) throws IOException {
        block(player); Path directory = directory(player.getUUID());
        try {
            CompoundTag receipts = player.getPersistentData().getCompound(RECEIPTS);
            if (!Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) {
                if (!receipts.isEmpty()) throw new IOException("저장 영수증에 해당하는 지급 기록 폴더가 없습니다.");
                blocked.remove(player.getUUID()); return;
            }
            if (!Files.isDirectory(directory) || Files.isSymbolicLink(directory)) throw new IOException("복구 기록 폴더가 잘못됐습니다.");
            Set<String> journals = new HashSet<>();
            try (var files = Files.list(directory)) {
                for (Path file : files.filter(p -> p.getFileName().toString().endsWith(".json")).toList()) {
                    JsonObject record = AtomicJson.read(file); String id = UUID.fromString(record.get("transaction").getAsString()).toString();
                    if (!file.getFileName().toString().equals(id + ".json")) throw new IOException("복구 기록 신원이 다릅니다.");
                    validateDelivered(record, player.getUUID(), id, receipts); journals.add(id);
                    if (!record.has("manualAcknowledgement")) checkDrops(record);
                }
            }
            for (String receipt : receipts.getAllKeys()) {
                if (!receipts.getBoolean(receipt) || !journals.contains(receipt)) throw new IOException("저장 영수증에 해당하는 지급 기록이 없습니다: " + receipt);
            }
            blocked.remove(player.getUUID());
        } catch (Exception failure) { throw new IOException("지급 복구 검증을 중단했습니다. 원본을 보존했습니다: " + failure.getMessage(), failure); }
    }
    private static void validateDelivered(JsonObject record, UUID player, String id, CompoundTag receipts) throws IOException {
        if (!player.toString().equals(record.get("player").getAsString()) || !id.equals(record.get("transaction").getAsString())) throw new IOException("복구 기록 신원이 다릅니다.");
        if (!"DELIVERED".equals(record.get("state").getAsString()) || !receipts.getBoolean(id)) throw new IOException("이전 지급 기록 확인이 필요합니다: " + id);
    }
    /** Operator confirmation only, after inspecting the journal and native inventory/drop state. Never re-rolls or re-grants. */
    public void acknowledge(ServerPlayer target, UUID id, String operator) throws IOException {
        Path file = path(target.getUUID(), id); if (!Files.isRegularFile(file)) throw new IOException("거래 기록이 없습니다.");
        JsonObject record = AtomicJson.read(file);
        if (!target.getUUID().toString().equals(record.get("player").getAsString()) || !id.toString().equals(record.get("transaction").getAsString())) throw new IOException("거래 신원이 다릅니다.");
        putReceipt(target, RECEIPTS, id.toString()); saveAndVerify(target, RECEIPTS, id.toString());
        record.addProperty("state", "DELIVERED"); record.addProperty("manualAcknowledgement", operator + " @ " + System.currentTimeMillis()); AtomicJson.write(file, record);
        checkRecovery(target);
    }
    public static int find(ServerPlayer player, String id) {
        for (int slot = 0; slot < player.getInventory().getContainerSize(); slot++) {
            ItemStack stack = player.getInventory().getItem(slot);
            if (!stack.isEmpty() && net.minecraft.core.registries.BuiltInRegistries.ITEM.getKey(stack.getItem()).toString().equals(id)) return slot;
        }
        return -1;
    }
    public static int count(ServerPlayer player, String id) {
        int total = 0;
        for (int slot = 0; slot < player.getInventory().getContainerSize(); slot++) {
            ItemStack stack = player.getInventory().getItem(slot);
            if (net.minecraft.core.registries.BuiltInRegistries.ITEM.getKey(stack.getItem()).toString().equals(id)) total += stack.getCount();
        }
        return total;
    }
}
