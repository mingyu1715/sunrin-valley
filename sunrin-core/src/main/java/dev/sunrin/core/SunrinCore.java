package dev.sunrin.core;

import com.mojang.logging.LogUtils;
import dev.sunrin.core.client.ClientProfiles;
import dev.sunrin.core.client.ClientScreens;
import dev.sunrin.core.net.CoreNetwork;
import dev.sunrin.core.server.CoreRuntime;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.UuidArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.event.entity.item.ItemExpireEvent;
import net.minecraftforge.event.entity.EntityLeaveLevelEvent;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.scores.PlayerTeam;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.server.ServerStartingEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.fml.common.Mod;
import org.slf4j.Logger;

@Mod(SunrinCore.ID)
public final class SunrinCore {
    public static final String ID = "sunrin_core";
    public static final Logger LOG = LogUtils.getLogger();
    public SunrinCore() {
        CoreNetwork.init(); MinecraftForge.EVENT_BUS.register(this);
        DistExecutor.safeRunWhenOn(Dist.CLIENT, () -> ClientScreens::install);
    }
    @SubscribeEvent public void starting(ServerStartingEvent event) {
        try { new CoreRuntime(event.getServer()); }
        catch (Exception error) { LOG.error("Sunrin permission recovery could not be verified; startup aborted and state preserved", error); throw new IllegalStateException("Sunrin 권한 복구 기록을 확인하지 못해 서버 시작을 중단했습니다.", error); }
    }
    @SubscribeEvent public void stopping(ServerStoppingEvent event) { CoreRuntime.stop(); }
    @SubscribeEvent(priority = EventPriority.HIGHEST) public void login(PlayerEvent.PlayerLoggedInEvent event) { if (event.getEntity() instanceof ServerPlayer p && CoreRuntime.current() != null) CoreRuntime.current().login(p); }
    @SubscribeEvent(priority = EventPriority.LOWEST) public void logout(PlayerEvent.PlayerLoggedOutEvent event) { if (event.getEntity() instanceof ServerPlayer p && CoreRuntime.current() != null) CoreRuntime.current().logout(p); }
    @SubscribeEvent public void clonePlayer(PlayerEvent.Clone event) {
        for (String key : java.util.List.of("sunrin_core_receipts", "sunrin_pickup_receipts"))
            if (event.getOriginal().getPersistentData().contains(key)) event.getEntity().getPersistentData().put(key, event.getOriginal().getPersistentData().getCompound(key).copy());
    }
    @SubscribeEvent public void changedDimension(PlayerEvent.PlayerChangedDimensionEvent event) {
        if (event.getEntity() instanceof ServerPlayer p && CoreRuntime.current() != null) { p.refreshDisplayName(); p.refreshTabListName(); CoreRuntime.current().syncProfiles(); }
    }
    @SubscribeEvent public void name(PlayerEvent.NameFormat event) {
        if (event.getEntity().level().isClientSide) event.setDisplayname(ClientProfiles.display(event.getEntity()));
        else if (CoreRuntime.current() != null) event.setDisplayname(CoreRuntime.current().profiles.display(event.getEntity()));
    }
    @SubscribeEvent public void tab(PlayerEvent.TabListNameFormat event) {
        if (CoreRuntime.current() != null) event.setDisplayName(PlayerTeam.formatNameForTeam(event.getEntity().getTeam(), CoreRuntime.current().profiles.display(event.getEntity())));
    }
    @SubscribeEvent(priority = EventPriority.LOWEST) public void beforePickup(net.minecraftforge.event.entity.player.EntityItemPickupEvent event) {
        if (event.getEntity() instanceof ServerPlayer player && CoreRuntime.current() != null
                && !CoreRuntime.current().deliveries.preparePickup(player, event.getItem())) event.setCanceled(true);
    }
    @SubscribeEvent public void finishPickups(net.minecraftforge.event.TickEvent.ServerTickEvent event) {
        if (event.phase == net.minecraftforge.event.TickEvent.Phase.END && CoreRuntime.current() != null) CoreRuntime.current().deliveries.finishPickups();
    }
    @SubscribeEvent public void pickedUp(PlayerEvent.ItemPickupEvent event) {
        if (event.getEntity() instanceof ServerPlayer p && CoreRuntime.current() != null)
            CoreRuntime.current().deliveries.recordPickup(p, event.getOriginalEntity(), event.getStack().getCount());
    }
    @SubscribeEvent(priority = EventPriority.LOWEST) public void expired(ItemExpireEvent event) {
        if (!event.getEntity().level().isClientSide && CoreRuntime.current() != null && !event.isCanceled()) CoreRuntime.current().deliveries.terminalDrop(event.getEntity(), "expired");
    }
    @SubscribeEvent public void removed(EntityLeaveLevelEvent event) {
        if (!event.getLevel().isClientSide && event.getEntity() instanceof ItemEntity item && item.getRemovalReason() == Entity.RemovalReason.KILLED && CoreRuntime.current() != null)
            CoreRuntime.current().deliveries.terminalDrop(item, "destroyed");
    }
    @SubscribeEvent public void rightClick(PlayerInteractEvent.RightClickItem event) {
        if (event.getHand() != InteractionHand.MAIN_HAND || !(event.getEntity() instanceof ServerPlayer player) || CoreRuntime.current() == null) return;
        ResourceLocation id = net.minecraft.core.registries.BuiltInRegistries.ITEM.getKey(event.getItemStack().getItem());
        String kind = switch (id.toString()) { case "kubejs:rename_ticket" -> "title"; case "kubejs:name_color_ticket" -> "color"; default -> ""; };
        if (!kind.isEmpty()) { CoreRuntime.current().ticket(player, kind); event.setCancellationResult(InteractionResult.SUCCESS); event.setCanceled(true); }
    }
    @SubscribeEvent public void commands(RegisterCommandsEvent event) {
        event.getDispatcher().register(Commands.literal("sunrin").then(Commands.literal("admin").executes(context -> {
            if (CoreRuntime.current() != null) CoreRuntime.current().admin(context.getSource().getPlayerOrException()); return 1;
        })).then(Commands.literal("recovery")
            .requires(source -> CoreRuntime.current() != null && (source.getEntity() instanceof ServerPlayer p ? CoreRuntime.current().operators.allowed(p) : source.hasPermission(4)))
            .then(Commands.literal("recheck").then(Commands.argument("player", UuidArgument.uuid()).executes(context -> {
                ServerPlayer target = context.getSource().getServer().getPlayerList().getPlayer(UuidArgument.getUuid(context, "player"));
                if (target == null) { context.getSource().sendFailure(Component.literal("접속 중인 플레이어가 필요합니다.")); return 0; }
                CoreRuntime.current().recheck(target);
                boolean blocked = CoreRuntime.current().deliveries.isBlocked(target);
                context.getSource().sendSuccess(() -> Component.literal(blocked ? "아직 확인이 필요한 기록이 있습니다." : "복구 기록 검증을 통과했습니다."), false); return blocked ? 0 : 1;
            })))
            .then(Commands.literal("acknowledge").then(Commands.argument("player", UuidArgument.uuid()).then(Commands.argument("transaction", UuidArgument.uuid()).executes(context -> {
                ServerPlayer target = context.getSource().getServer().getPlayerList().getPlayer(UuidArgument.getUuid(context, "player"));
                if (target == null) { context.getSource().sendFailure(Component.literal("접속 중인 플레이어가 필요합니다.")); return 0; }
                try {
                    var transaction = UuidArgument.getUuid(context, "transaction");
                    CoreRuntime.current().deliveries.acknowledge(target, transaction, context.getSource().getTextName());
                    LOG.warn("Recovery manually acknowledged for {} transaction {} by {}", target.getUUID(), transaction, context.getSource().getTextName());
                    context.getSource().sendSuccess(() -> Component.literal("확인 기록을 저장했습니다. 자동 재지급은 하지 않았습니다."), false); return 1;
                } catch (Exception error) { context.getSource().sendFailure(Component.literal(error.getMessage())); return 0; }
            }))))));
    }
}
