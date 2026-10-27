package dev.sunrin.core.api;

import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.eventbus.api.Event;

/** Server-only policy hook. KubeJS decides the reward; Core never rolls it. */
public final class BoxOpenRequestEvent extends Event {
    private final ServerPlayer player;
    private final String requestId, kind;
    public BoxOpenRequestEvent(ServerPlayer player, String requestId, String kind) {
        this.player = player; this.requestId = requestId; this.kind = kind;
    }
    public ServerPlayer getPlayer() { return player; }
    public String getRequestId() { return requestId; }
    public String getKind() { return kind; }
}
