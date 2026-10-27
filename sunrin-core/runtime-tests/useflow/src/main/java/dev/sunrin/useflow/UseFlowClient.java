package dev.sunrin.useflow;

import com.google.gson.*;
import java.nio.file.*;
import java.util.*;
import io.netty.channel.*;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.components.*;
import net.minecraft.client.gui.screens.*;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.world.InteractionHand;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.client.event.ClientChatReceivedEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid="sunrin_useflow_observer",value=Dist.CLIENT,bus=Mod.EventBusSubscriber.Bus.FORGE)
public final class UseFlowClient {
    private record Stage(String name,String item,String kind,boolean repeated,String title){}
    private static final List<Stage> STAGES=List.of(new Stage("random","kubejs:random_box","box",false,""),new Stage("random-repeat","kubejs:random_box","box",true,""),new Stage("furniture","kubejs:furniture_random_box","furniture",false,""),new Stage("title","kubejs:rename_ticket","title",false,"실험"),new Stage("color","kubejs:name_color_ticket","color",false,""),new Stage("title-repeat","kubejs:rename_ticket","title",true,"재시도"));
    private static final JsonArray events=new JsonArray(),results=new JsonArray(),chats=new JsonArray();
    private static int index,phase,ticks,boot; private static boolean connecting,done,traced,chatSent; private static long start=System.currentTimeMillis(),phaseAt; private static volatile UUID expectedBoxTransaction;
    private static void log(String kind,String value){JsonObject row=new JsonObject();row.addProperty("ms",System.currentTimeMillis()-start);row.addProperty("kind",kind);row.addProperty("value",value);events.add(row);System.out.println("USEFLOW_CLIENT="+row);}
    @SubscribeEvent(priority=net.minecraftforge.eventbus.api.EventPriority.LOWEST,receiveCanceled=true) public static void chat(ClientChatReceivedEvent e){if(!Boolean.getBoolean("sunrin.useFlowTest")||!e.getMessage().getString().contains("UseFlowFinal"))return;JsonObject row=new JsonObject();row.addProperty("text",e.getMessage().getString());row.addProperty("componentJson",net.minecraft.network.chat.Component.Serializer.toJson(e.getMessage()));row.addProperty("cancelled",e.isCanceled());chats.add(row);log("actualFormattedChat",row.toString());}
    @SubscribeEvent public static void tick(TickEvent.ClientTickEvent e) {
        if(!Boolean.getBoolean("sunrin.useFlowTest")||done||e.phase!=TickEvent.Phase.END)return;
        Minecraft mc=Minecraft.getInstance();
        try {
            if(!connecting){if(!(mc.screen instanceof TitleScreen)||mc.getOverlay()!=null||++boot<40)return;connecting=true;ConnectScreen.startConnecting(mc.screen,mc,ServerAddress.parseString("127.0.0.1:25597"),new ServerData("Sunrin isolated use-flow","127.0.0.1:25597",false),false);log("connect","native ConnectScreen loopback25597");return;}
            if(mc.player==null||mc.gameMode==null){if(System.currentTimeMillis()-start>240000)finish("connect-timeout");return;}
            if(!traced){traced=true;mc.getConnection().getConnection().channel().pipeline().addBefore("packet_handler","sunrin_useflow_trace",new ChannelDuplexHandler(){@Override public void write(ChannelHandlerContext ctx,Object packet,ChannelPromise promise)throws Exception{UseFlowObserver.tracePacket("clientOutbound",packet,UseFlowClient::log);super.write(ctx,packet,promise);}@Override public void channelRead(ChannelHandlerContext ctx,Object packet)throws Exception{UseFlowObserver.tracePacket("clientInbound",packet,UseFlowClient::log);if(packet instanceof net.minecraft.network.protocol.game.ClientboundCustomPayloadPacket custom&&custom.getIdentifier().toString().equals("sunrin_core:main")){var data=new net.minecraft.network.FriendlyByteBuf(custom.getData().duplicate());if(data.readVarInt()==0){var tag=data.readNbt();if(tag!=null&&tag.getString("kind").equals("box"))expectedBoxTransaction=tag.getUUID("transaction");}}super.channelRead(ctx,packet);}});log("realLogin",mc.player.getUUID()+" "+mc.player.getGameProfile().getName());ticks=0;}
            if(index>=STAGES.size()){if(!chatSent){chatSent=true;ticks=0;mc.getConnection().sendChat("UseFlowFinal");log("nativeSendChat","UseFlowFinal");return;}if(++ticks<40)return;capture(mc,"actual-chat");finish("completed");mc.stop();return;} Stage stage=STAGES.get(index);ticks++;
            if(phase==0){if(ticks<30)return;close(mc);JsonObject c=new JsonObject();c.addProperty("index",index);c.addProperty("item",stage.item);UseFlowObserver.write("stage.json",c);log("requestFixture",stage.name);phase=1;ticks=0;return;}
            JsonObject state=readState();
            if(phase==1){mc.player.getInventory().selected=0;if(state.get("prepared").getAsInt()!=index||mc.player.getMainHandItem().isEmpty()||!BuiltInRegistries.ITEM.getKey(mc.player.getMainHandItem().getItem()).toString().equals(stage.item)){if(ticks>300)complete(false,"inventory-sync-timeout",state);return;}mc.setScreen(null);log("nativeUse",stage.name+" hand="+mc.player.getMainHandItem());expectedBoxTransaction=null;mc.gameMode.useItem(mc.player,InteractionHand.MAIN_HAND);if(stage.repeated)mc.gameMode.useItem(mc.player,InteractionHand.MAIN_HAND);phase=2;ticks=0;phaseAt=System.currentTimeMillis();return;}
            if(phase==2){
                boolean open=mc.screen!=null&&mc.screen.getClass().getName().startsWith("dev.sunrin.core.client.ClientScreens$");
                if(stage.kind.equals("furniture")){if(count(state,stage.item)==2&&delivered(state,null,stage.item))complete(true,"native furniture consumption + DELIVERED receipt",state);else if(System.currentTimeMillis()-phaseAt>15000)complete(false,"native furniture receipt/count observation timeout",state);return;}
                if(!open){if(ticks>120)complete(false,"native item use never opened real Core screen",state);return;}
                log("actualScreen",mc.screen.getClass().getName()+" title="+mc.screen.getTitle().getString());capture(mc,stage.name+"-opened");
                if(stage.kind.equals("box")){mc.screen.mouseClicked(1,1,0);phase=3;ticks=0;phaseAt=System.currentTimeMillis();return;}
                if(stage.kind.equals("title")){for(var child:mc.screen.children())if(child instanceof EditBox edit){edit.setValue("");mc.screen.setFocused(edit);for(char ch:stage.title.toCharArray())mc.screen.charTyped(ch,0);break;}}
                if(stage.kind.equals("color")){List<Button> palette=new ArrayList<>();for(var child:mc.screen.children())if(child instanceof Button b&&b.getMessage().getString().equals("■"))palette.add(b);click(mc,palette.get(4));}
                phase=4;ticks=0;return;
            }
            if(phase==3){if(ticks<8)return;boolean consumed=count(state,stage.item)==2&&expectedBoxTransaction!=null&&delivered(state,expectedBoxTransaction,stage.item);if(!consumed&&System.currentTimeMillis()-phaseAt<15000)return;capture(mc,stage.name+"-result");close(mc);complete(consumed,"real BoxScreen exact transaction receipt/close; boxCount="+count(state,stage.item)+" transaction="+expectedBoxTransaction,state);return;}
            if(phase==4){if(ticks<5)return;Button apply=button(mc,"적용하기");if(apply==null){complete(false,"Apply button absent",state);return;}log("nativeClickApply",apply.getMessage().getString()+" active="+apply.active);click(mc,apply);phase=5;ticks=0;return;}
            if(phase==5){boolean profile=stage.kind.equals("title")?state.getAsJsonObject("profile").get("titleText").getAsString().equals(stage.title):state.getAsJsonObject("profile").get("nameColor").getAsString().equals("red");if(ticks>15&&profile&&count(state,stage.item)==2){complete(true,"native C2S applied; profile saved",state);return;}if(ticks>120){capture(mc,stage.name+"-save-timeout");complete(false,"native Apply did not persist expected profile/consume1; screen="+(mc.screen==null?"null":mc.screen.getClass().getName()),state);}}
        }catch(Throwable error){error.printStackTrace();log("error",error.toString());try{complete(false,error.toString(),readState());}catch(Throwable nested){finish(nested.toString());}}
    }
    private static JsonObject readState()throws Exception{return JsonParser.parseString(Files.readString(UseFlowObserver.CONTROL.resolve("server-state.json"))).getAsJsonObject();}
    private static int count(JsonObject state,String id){int count=0;for(JsonElement row:state.getAsJsonArray("inventory")){JsonObject item=row.getAsJsonObject();if(item.get("id").getAsString().equals(id))count+=item.get("count").getAsInt();}return count;}
    private static boolean delivered(JsonObject state,UUID transaction,String input){for(JsonElement e:state.getAsJsonArray("journals")){JsonObject r=e.getAsJsonObject();if(r.has("boxId")&&r.get("boxId").getAsString().equals(input)&&r.get("state").getAsString().equals("DELIVERED")&&(transaction==null||r.get("transaction").getAsString().equals(transaction.toString())))return true;}return false;}
    private static Button button(Minecraft mc,String text){if(mc.screen==null)return null;for(var child:mc.screen.children())if(child instanceof Button b&&b.getMessage().getString().contains(text))return b;return null;}
    private static void click(Minecraft mc,Button b){log("screenMouseClicked",b.getMessage().getString()+" x="+(b.getX()+b.getWidth()/2)+" y="+(b.getY()+b.getHeight()/2));mc.screen.mouseClicked(b.getX()+b.getWidth()/2.0,b.getY()+b.getHeight()/2.0,0);}
    private static void close(Minecraft mc){Button close=button(mc,"닫기");if(close==null)close=button(mc,"취소");if(close!=null)click(mc,close);}
    private static void complete(boolean passed,String detail,JsonObject state)throws Exception{JsonObject row=new JsonObject();row.addProperty("stage",STAGES.get(index).name);row.addProperty("passed",passed);row.addProperty("detail",detail);row.add("actualServerState",state.deepCopy());results.add(row);log("stageResult",row.get("stage")+" passed="+passed+" "+detail);close(Minecraft.getInstance());index++;phase=0;ticks=0;writeReport("running");}
    private static void capture(Minecraft mc,String name)throws Exception{Path path=UseFlowObserver.CONTROL.resolve("screenshots").resolve(name+".png");Files.createDirectories(path.getParent());try(var image=Screenshot.takeScreenshot(mc.getMainRenderTarget())){image.writeToFile(path);}log("actualScreenshot",path.toString());}
    private static void writeReport(String reason)throws Exception{JsonObject out=new JsonObject();out.addProperty("reason",reason);out.addProperty("scope","real offline multiplayer client -> real dedicated server; native useItem + native Screen.mouseClicked; no direct Core action or reflected GUI");out.add("stages",results);out.add("clientEvents",events);out.add("actualChats",chats);String chat=chats.toString();out.addProperty("chatProfileApplied",chat.contains("재시도")&&chat.contains("SunrinGuiTest")&&(chat.toLowerCase(Locale.ROOT).contains("ff5555")||chat.contains("red")||chat.contains("§c")));Path welcomePath=UseFlowObserver.CONTROL.resolve("welcome-state.json");if(Files.exists(welcomePath)){JsonObject welcome=JsonParser.parseString(Files.readString(welcomePath)).getAsJsonObject();out.add("actualWelcome",welcome);boolean receipt=false;for(JsonElement record:welcome.getAsJsonArray("journals")){JsonObject r=record.getAsJsonObject();if(r.get("grantId").getAsString().startsWith("sunrin:first:v1:")&&r.get("state").getAsString().equals("DELIVERED"))receipt=true;}out.addProperty("initial15Plus15WelcomeGranted",count(welcome,"kubejs:random_box")==15&&count(welcome,"kubejs:furniture_random_box")==15&&receipt);}UseFlowObserver.write("useflow-results.json",out);}
    private static void finish(String reason){done=true;try{writeReport(reason);UseFlowObserver.write("done.json",new JsonPrimitive(reason));}catch(Exception error){error.printStackTrace();}log("done",reason);}
}
