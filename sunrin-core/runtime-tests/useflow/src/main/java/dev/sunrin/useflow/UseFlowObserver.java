package dev.sunrin.useflow;

import com.google.gson.*;
import dev.sunrin.core.api.BoxOpenRequestEvent;
import dev.sunrin.core.server.CoreRuntime;
import java.nio.file.*;
import java.util.*;
import io.netty.channel.*;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.protocol.game.*;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.LevelResource;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.fml.common.Mod;

@Mod("sunrin_useflow_observer")
public final class UseFlowObserver {
    static final Gson JSON=new GsonBuilder().setPrettyPrinting().serializeNulls().create();
    static final Path CONTROL=Path.of(System.getProperty("sunrin.useFlowDirectory","../control")).toAbsolutePath();
    private MinecraftServer server; private int prepared=-1; private final Set<UUID> traced=new HashSet<>(); private JsonObject welcome;
    private final JsonArray events=new JsonArray();
    public UseFlowObserver() {
        if(!Boolean.getBoolean("sunrin.useFlowServer")) return;
        MinecraftForge.EVENT_BUS.addListener(this::started); MinecraftForge.EVENT_BUS.addListener(this::tick);
        MinecraftForge.EVENT_BUS.addListener(EventPriority.LOWEST,true,PlayerInteractEvent.RightClickItem.class,this::rightClick);
        MinecraftForge.EVENT_BUS.addListener(EventPriority.HIGHEST,this::box);
    }
    private void started(ServerStartedEvent e) { server=e.getServer(); log("started",server.getServerVersion()); }
    private void log(String kind,String value) { JsonObject row=new JsonObject(); row.addProperty("tick",server==null?-1:server.getTickCount()); row.addProperty("kind",kind); row.addProperty("value",value); synchronized(events) {events.add(row);} System.out.println("USEFLOW_SERVER="+row); }
    private boolean actor(ServerPlayer p) { return p.getGameProfile().getName().equals("SunrinGuiTest") && !(p instanceof net.minecraftforge.common.util.FakePlayer); }
    private void rightClick(PlayerInteractEvent.RightClickItem e) { if(e.getEntity() instanceof ServerPlayer p && actor(p)) log("nativeRightClick",BuiltInRegistries.ITEM.getKey(e.getItemStack().getItem())+" hand="+e.getHand()+" cancelled="+e.isCanceled()+" result="+e.getCancellationResult()); }
    private void box(BoxOpenRequestEvent e) { if(actor(e.getPlayer())) log("realBoxPolicyEvent",e.getKind()+" token="+e.getRequestId()); }
    static void tracePacket(String direction,Object packet,java.util.function.BiConsumer<String,String> logger) {
        try {
            if(packet instanceof ClientboundCustomPayloadPacket custom && custom.getIdentifier().toString().equals("sunrin_core:main")) {
                FriendlyByteBuf data=new FriendlyByteBuf(custom.getData().duplicate());int id=data.readVarInt();var tag=data.readNbt();logger.accept(direction+"CoreS2C","discriminator="+id+" data="+tag);
            }
            if(packet instanceof ServerboundUseItemPacket use) logger.accept(direction+"UseItem",use.getHand()+" seq="+use.getSequence());
            if(packet instanceof ServerboundCustomPayloadPacket custom && custom.getIdentifier().toString().equals("sunrin_core:main")) {
                FriendlyByteBuf data=new FriendlyByteBuf(custom.getData().duplicate()); int discriminator=data.readVarInt();
                String detail="discriminator="+discriminator+" bytes="+data.readableBytes();
                if(discriminator==1) detail+=" action="+data.readUtf(24)+" token="+data.readUUID()+" value="+data.readUtf(128)+" style="+data.readUtf(16)+" color="+data.readUtf(24);
                logger.accept(direction+"CoreC2S",detail);
            }
        } catch(Throwable error) {logger.accept(direction+"TraceError",error.toString());}
    }
    private void tick(TickEvent.ServerTickEvent e) {
        if(server==null || e.phase!=TickEvent.Phase.END || server.getTickCount()%5!=0) return;
        try {
            Files.createDirectories(CONTROL);
            ServerPlayer p=server.getPlayerList().getPlayers().stream().filter(this::actor).findFirst().orElse(null);
            if(p==null) {write("server-state.json",status(null)); return;}
            if(welcome==null){welcome=status(p);write("welcome-state.json",welcome);log("actualWelcomeSnapshot",welcome.toString());}
            if(traced.add(p.getUUID())) p.connection.connection.channel().pipeline().addBefore("packet_handler","sunrin_useflow_trace",new ChannelDuplexHandler(){@Override public void channelRead(ChannelHandlerContext ctx,Object packet)throws Exception{tracePacket("serverInbound",packet,UseFlowObserver.this::log);super.channelRead(ctx,packet);}});
            Path command=CONTROL.resolve("stage.json");
            if(Files.exists(command)) {
                JsonObject c=JsonParser.parseString(Files.readString(command)).getAsJsonObject(); int index=c.get("index").getAsInt();
                if(index!=prepared) {
                    String item=c.get("item").getAsString(); p.getInventory().clearContent(); p.getInventory().selected=0;
                    p.getInventory().setItem(0,new ItemStack(BuiltInRegistries.ITEM.get(new ResourceLocation(item)),3));
                    p.setInvulnerable(true); p.getInventory().setChanged(); p.inventoryMenu.broadcastChanges(); p.containerMenu.broadcastChanges();
                    server.getPlayerList().saveAll(); prepared=index; log("prepared",index+" "+item+" realUuid="+p.getUUID());
                }
            }
            write("server-state.json",status(p));
        } catch(Throwable error) {log("observerError",error.toString()); error.printStackTrace();}
    }
    private JsonObject status(ServerPlayer p)throws Exception {
        JsonObject out=new JsonObject();out.addProperty("tick",server.getTickCount());out.addProperty("prepared",prepared);out.addProperty("connected",p!=null);
        if(p!=null) {
            out.addProperty("uuid",p.getUUID().toString());out.addProperty("isFake",p instanceof net.minecraftforge.common.util.FakePlayer); JsonArray inventory=new JsonArray();
            for(int i=0;i<p.getInventory().getContainerSize();i++) {ItemStack s=p.getInventory().getItem(i);if(!s.isEmpty()){JsonObject row=new JsonObject();row.addProperty("slot",i);row.addProperty("id",BuiltInRegistries.ITEM.getKey(s.getItem()).toString());row.addProperty("count",s.getCount());row.addProperty("nbt",s.save(new net.minecraft.nbt.CompoundTag()).toString());inventory.add(row);}}
            out.add("inventory",inventory);out.add("profile",CoreRuntime.current().profiles.json(p.getUUID()));out.addProperty("blocked",CoreRuntime.current().deliveries.isBlocked(p));
            JsonArray journals=new JsonArray();Path dir=server.getWorldPath(LevelResource.ROOT).resolve("data/sunrin-core/deliveries").resolve(p.getUUID().toString());
            if(Files.isDirectory(dir))try(var files=Files.list(dir)){for(Path f:files.filter(Files::isRegularFile).toList())journals.add(JsonParser.parseString(Files.readString(f)));}
            out.add("journals",journals);
        }
        synchronized(events){out.add("events",events.deepCopy());}return out;
    }
    static void write(String name,JsonElement data)throws Exception {Files.createDirectories(CONTROL);Path temp=CONTROL.resolve(name+".tmp");Files.writeString(temp,JSON.toJson(data));Files.move(temp,CONTROL.resolve(name),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
}
