package dev.sunrin.core.server;

import com.google.gson.JsonObject;
import dev.sunrin.core.domain.ProfileRules;
import dev.sunrin.core.domain.ProfileRules.Profile;
import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;
import net.minecraft.world.entity.player.Player;

public final class Profiles {
    private final Path root;
    private final java.util.Set<UUID> blocked = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<UUID, Profile> cache = new ConcurrentHashMap<>();
    public Profiles(Path root) { this.root = root.resolve("profiles"); }
    public Profile get(UUID id) { return cache.getOrDefault(id, Profile.defaults()); }
    public void load(UUID id) throws IOException {
        JsonObject json;
        try { json = AtomicJson.read(root.resolve(id + ".json")); } catch (IOException invalid) { blocked.add(id); throw invalid; }
        Profile value = Profile.defaults();
        try {
            if (json.has("titleText") && !json.get("titleText").getAsString().isEmpty())
                value = value.withTitle(json.get("titleText").getAsString(), json.get("titleStyle").getAsString(), json.get("titleColor").getAsString());
            if (json.has("nameColor") && (!json.has("hasNameColor") || json.get("hasNameColor").getAsBoolean())) value = value.withNameColor(json.get("nameColor").getAsString());
        } catch (RuntimeException bad) { blocked.add(id); throw new IOException("Invalid stored profile " + id, bad); }
        cache.put(id, value); blocked.remove(id);
    }
    public void save(UUID id, Profile value) throws IOException {
        if (blocked.contains(id)) throw new IOException("기존 칭호 데이터 확인이 필요합니다. 원본 파일을 보존했습니다.");
        JsonObject json = new JsonObject(); json.addProperty("schemaVersion", 1);
        json.addProperty("titleText", value.titleText()); json.addProperty("titleStyle", value.titleStyle());
        json.addProperty("titleColor", value.titleColor()); json.addProperty("nameColor", value.nameColor()); json.addProperty("hasNameColor", value.hasNameColor());
        AtomicJson.write(root.resolve(id + ".json"), json); cache.put(id, value);
    }
    public MutableComponent display(Player player) {
        Profile p = get(player.getUUID()); MutableComponent result = Component.empty();
        if (!p.titleText().isEmpty()) result.append(Component.literal(ProfileRules.wrap(p.titleText(), p.titleStyle()) + " ").setStyle(Style.EMPTY.withColor(ProfileRules.color(p.titleColor()))));
        return result.append(Component.literal(player.getGameProfile().getName()).setStyle(p.hasNameColor() ? Style.EMPTY.withColor(ProfileRules.color(p.nameColor())) : Style.EMPTY));
    }
    public JsonObject json(UUID id) {
        Profile p = get(id); JsonObject json = new JsonObject();
        json.addProperty("titleText", p.titleText()); json.addProperty("titleStyle", p.titleStyle());
        json.addProperty("titleColor", p.titleColor()); json.addProperty("nameColor", p.nameColor()); json.addProperty("hasNameColor", p.hasNameColor()); return json;
    }
}
