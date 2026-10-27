package dev.sunrin.core.client;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.sunrin.core.domain.ProfileRules;
import dev.sunrin.core.domain.ProfileRules.Profile;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;
import net.minecraft.world.entity.player.Player;

/** Common Minecraft types only; this cache does not load client renderer classes. */
public final class ClientProfiles {
    private static final Map<UUID, Profile> profiles = new ConcurrentHashMap<>();
    private ClientProfiles() {}
    public static void update(CompoundTag tag) {
        profiles.clear();
        for (String key : tag.getAllKeys()) {
            JsonObject json = JsonParser.parseString(tag.getString(key)).getAsJsonObject();
            Profile value = Profile.defaults();
            if (!json.get("titleText").getAsString().isEmpty()) value = value.withTitle(json.get("titleText").getAsString(), json.get("titleStyle").getAsString(), json.get("titleColor").getAsString());
            if (!json.has("hasNameColor") || json.get("hasNameColor").getAsBoolean()) value = value.withNameColor(json.get("nameColor").getAsString()); profiles.put(UUID.fromString(key), value);
        }
    }
    public static MutableComponent display(Player player) {
        Profile value = profiles.getOrDefault(player.getUUID(), Profile.defaults()); MutableComponent result = Component.empty();
        if (!value.titleText().isEmpty()) result.append(Component.literal(ProfileRules.wrap(value.titleText(), value.titleStyle()) + " ").setStyle(Style.EMPTY.withColor(ProfileRules.color(value.titleColor()))));
        return result.append(Component.literal(player.getGameProfile().getName()).setStyle(value.hasNameColor() ? Style.EMPTY.withColor(ProfileRules.color(value.nameColor())) : Style.EMPTY));
    }
}
