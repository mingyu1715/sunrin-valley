package dev.sunrin.core.api;

import com.google.gson.*;
import dev.sunrin.core.server.CoreRuntime;
import java.util.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;

public final class SunrinBridge {
    private SunrinBridge() {}
    public static String readConfig(String name) {
        return dev.sunrin.core.server.ConfigFiles.read(net.minecraftforge.fml.loading.FMLPaths.CONFIGDIR.get().resolve("sunrin"), net.minecraftforge.fml.loading.FMLPaths.GAMEDIR.get().resolve("kubejs/data/sunrin/defaults"), name);
    }
    public static void requestOpen(ServerPlayer player, String kind) { if (CoreRuntime.current() != null) CoreRuntime.current().requestOpen(player, kind); }
    public static void rejectOpen(ServerPlayer player, String id, String message) { if (CoreRuntime.current() != null) CoreRuntime.current().reject(player, id, message); }
    public static boolean commitBox(ServerPlayer player, String id, String box, ItemStack reward, String tier, String version, String probabilities) { return CoreRuntime.current() != null && CoreRuntime.current().commitBox(player, id, box, reward, tier, version, probabilities); }
    public static boolean grant(ServerPlayer player, String grantId, ItemStack[] rewards) { return CoreRuntime.current() != null && CoreRuntime.current().grant(player, grantId, Arrays.stream(rewards).map(ItemStack::copy).toList()); }
    public static boolean grantJson(ServerPlayer player, String grantId, String json) {
        if (CoreRuntime.current() == null || json == null || json.length() > 16384) return false;
        try {
            JsonArray array = JsonParser.parseString(json).getAsJsonArray(); if (array.isEmpty() || array.size() > 16) return false;
            List<ItemStack> rewards = new ArrayList<>();
            for (JsonElement element : array) {
                JsonObject value = element.getAsJsonObject(); ResourceLocation id = ResourceLocation.tryParse(value.get("item").getAsString());
                int count = value.get("count").getAsInt(); if (!BuiltInRegistries.ITEM.containsKey(id) || count < 1 || count > 4096) return false;
                rewards.add(new ItemStack(BuiltInRegistries.ITEM.get(id), count));
            }
            return CoreRuntime.current().grant(player, grantId, rewards);
        } catch (RuntimeException invalid) { return false; }
    }
    public static Component displayName(ServerPlayer player) { return CoreRuntime.current() == null ? Component.literal(player.getGameProfile().getName()) : player.getDisplayName(); }
    public static Component chatDisplayName(ServerPlayer player, int fallbackNameColor) {
        var runtime = CoreRuntime.current();
        Component display = runtime == null ? Component.literal(player.getGameProfile().getName()).withStyle(style -> style.withColor(fallbackNameColor)) : runtime.profiles.display(player, fallbackNameColor);
        return net.minecraft.world.scores.PlayerTeam.formatNameForTeam(player.getTeam(), display);
    }
    public static boolean isOperator(ServerPlayer player) { return CoreRuntime.current() != null && CoreRuntime.current().operators.allowed(player); }
}
