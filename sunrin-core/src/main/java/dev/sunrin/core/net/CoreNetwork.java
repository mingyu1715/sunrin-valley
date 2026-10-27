package dev.sunrin.core.net;

import dev.sunrin.core.server.CoreRuntime;
import java.util.UUID;
import java.util.function.Consumer;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.*;
import net.minecraftforge.network.simple.SimpleChannel;

public final class CoreNetwork {
    private static final String PROTOCOL = "1";
    private static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(ResourceLocation.tryParse("sunrin_core:main"), () -> PROTOCOL, PROTOCOL::equals, PROTOCOL::equals);
    private static Consumer<CompoundTag> clientReceiver = ignored -> {};
    private CoreNetwork() {}
    public static void init() {
        CHANNEL.messageBuilder(ServerView.class, 0, NetworkDirection.PLAY_TO_CLIENT)
            .encoder((p, b) -> b.writeNbt(p.data())).decoder(b -> new ServerView(b.readNbt()))
            .consumerMainThread((p, context) -> { if (p.data() != null) clientReceiver.accept(p.data()); }).add();
        CHANNEL.messageBuilder(ClientAction.class, 1, NetworkDirection.PLAY_TO_SERVER)
            .encoder((p, b) -> { b.writeUtf(p.action(), 24); b.writeUUID(p.token()); b.writeUtf(p.value(), 128); b.writeUtf(p.style(), 16); b.writeUtf(p.color(), 24); })
            .decoder(b -> new ClientAction(b.readUtf(24), b.readUUID(), b.readUtf(128), b.readUtf(16), b.readUtf(24)))
            .consumerMainThread((p, context) -> {
                ServerPlayer sender = context.get().getSender();
                if (sender != null && CoreRuntime.current() != null) CoreRuntime.current().action(sender, p);
            }).add();
    }
    public static void setClientReceiver(Consumer<CompoundTag> receiver) { clientReceiver = receiver; }
    public static void send(ServerPlayer player, CompoundTag data) { CHANNEL.send(PacketDistributor.PLAYER.with(() -> player), new ServerView(data)); }
    public static void act(String action, UUID token, String value, String style, String color) { CHANNEL.sendToServer(new ClientAction(action, token, value, style, color)); }
    public record ServerView(CompoundTag data) {}
    public record ClientAction(String action, UUID token, String value, String style, String color) {}
}
