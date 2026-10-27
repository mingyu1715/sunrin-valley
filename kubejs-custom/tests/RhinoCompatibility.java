import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Scriptable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import com.google.gson.Gson;

/** Runs the pinned real Rhino engine with explicit external boundaries.
 * This establishes engine behavior, not native Minecraft/Forge/inventory behavior. */
public class RhinoCompatibility {
  static void eval(Context cx, Scriptable scope, String source, String name) {
    cx.evaluateString(scope, source, name, 1, null);
  }
  static Scriptable boundary(Context cx) {
    Scriptable scope = cx.initStandardObjects();
    eval(cx,scope,"""
      var global = {}, harnessErrors = [], harnessListeners = {}, harnessRejections = [], harnessCommits = [];
      var console = {info:function(){},warn:function(){},error:function(x){harnessErrors.push(String(x));}};
      var Java = {loadClass:function(name){if(/^java\\.(nio|io)(\\.|$)/.test(name))throw Error('Class is not allowed by class filter: '+name);return {rejectOpen:function(p,id,msg){harnessRejections.push([p,id,msg]);}};}};
      var ForgeEvents = {onEvent:function(name,fn){harnessListeners[name]=fn;}};
      var ServerEvents = {}, PlayerEvents = {}, ItemEvents = {};
      ['loaded','unloaded','tick','commandRegistry'].forEach(function(name){ServerEvents[name]=function(fn){harnessListeners['server.'+name]=fn;};});
      ['loggedIn','loggedOut','tick'].forEach(function(name){PlayerEvents[name]=function(fn){harnessListeners['player.'+name]=fn;};});
      ItemEvents.rightClicked=function(id,fn){harnessListeners['item.'+id]=fn;};
      ""","registration-boundary");
    return scope;
  }
  public static void main(String[] args) throws Exception {
    Context cx = Context.enter();
    Path root = Path.of(args[0]);
    // Characterize the discovered engine restriction without Java/Core dependencies.
    boolean reproduced = false;
    try {
      eval(cx,cx.initStandardObjects(),"(function(){try{const value=1;}catch(e){throw e;}})();","try-const-capture");
    } catch (RuntimeException error) {
      reproduced = error.toString().contains("redeclaration of var value");
    }
    if (!reproduced) throw new AssertionError("Pinned try-block const restriction not reproduced");
    eval(cx,cx.initStandardObjects(),"(function(){let value;try{value={};var callback=()=>value;}catch(e){throw e;}})();","outer-let-capture");
    System.out.println("PASS: actual Rhino reproduces try-block const without closures; outer declaration works");

    String bridge = Files.readString(root.resolve("startup_scripts/sunrin_bridge.js"));
    Scriptable startup = boundary(cx);
    eval(cx,startup,bridge,"sunrin_bridge.js");
    eval(cx,startup,"""
      if(harnessErrors.length)throw Error(harnessErrors.join('; '));
      var listener=harnessListeners['dev.sunrin.core.api.BoxOpenRequestEvent'];
      if(typeof listener!=='function')throw Error('Real startup script did not register Forge listener');
      var request={getPlayer:function(){return 'player';},getRequestId:function(){return 'request';}};
      listener(request);
      if(harnessRejections.length!==1)throw Error('Missing-policy request was not rejected');
      var received=null;global.sunrinHandleBoxRequest=function(event){received=event;};listener(request);
      if(received!==request)throw Error('Reloadable policy did not receive request');
      ""","verify-startup-boundary");
    System.out.println("PASS: shipped startup bridge evaluates and dispatches in actual Rhino");

    Scriptable absent = boundary(cx);
    eval(cx,absent,"Java.loadClass=function(){throw Error('Core absent');};","absent-Core-boundary");
    eval(cx,absent,bridge,"sunrin_bridge.js");
    eval(cx,absent,"if(Object.keys(harnessListeners).length)throw Error('Listener registered with absent Core');","verify-absent-Core");
    System.out.println("PASS: missing Core remains safely unregistered in actual Rhino");

    Scriptable policy = boundary(cx);
    String source = Files.readString(root.resolve("server_scripts/sunrin_policy.js"));
    eval(cx,policy,source,"sunrin_policy.js");
    eval(cx,policy,source,"sunrin_policy-reload.js");
    eval(cx,policy,"""
      if(harnessErrors.length)throw Error(harnessErrors.join('; '));
      if(typeof global.sunrinHandleBoxRequest!=='function')throw Error('Policy function absent');
      if(typeof harnessListeners['server.tick']!=='function')throw Error('Lazy reload hook absent');
      if(typeof harnessListeners['item.kubejs:geonpi_ticket']!=='function')throw Error('Geonpi callback absent');
      ""","verify-policy-registration");
    System.out.println("PASS: shipped policy compiles/evaluates twice in actual Rhino (registration boundaries only)");
    Map<String,String> configs = new LinkedHashMap<>();
    for (String name : new String[]{"random-box","furniture-box","geonpi"}) {
      configs.put("config/sunrin/"+name+".json",Files.readString(root.resolve("data/sunrin/defaults/"+name+".json")));
    }
    eval(cx,policy,"var harnessConfigTexts = "+new Gson().toJson(configs)+";","real-default-config-fixture");
    eval(cx,policy,"""
      Java.loadClass=function(name){
        if(/^java\\.(nio|io)(\\.|$)/.test(name))throw Error('Class is not allowed by class filter: '+name);
        if(name==='com.mojang.brigadier.arguments.StringArgumentType')return {word:function(){return {};},getString:function(ctx){return ctx.token;}};
        if(name==='net.minecraft.resources.ResourceKey')return {create:function(reg,id){return id;}};
        if(name==='net.minecraft.core.registries.Registries')return {DIMENSION:'dimension'};
        if(name==='net.minecraft.resources.ResourceLocation')return function(id){this.id=id;};
        if(name==='java.util.UUID')return {fromString:function(id){return id;},randomUUID:function(){return 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';}};
        return {readConfig:function(name){return harnessConfigTexts['config/sunrin/'+name+'.json'];},rejectOpen:function(p,id,msg){harnessRejections.push([p,id,msg]);},commitBox:function(){harnessCommits.push(Array.prototype.slice.call(arguments));return true;},grant:function(){return true;},displayName:function(){return 'caller';}};
      };
      var JsonIO={readString:function(path){return harnessConfigTexts[path];}};
      // Controlled registry-existence boundary only: this is an engine evaluation
      // check, not an assertion that these items are registered in Minecraft.
      var Item={exists:function(){return true;},of:function(id,count,nbt){return {id:id,count:count,nbt:nbt,isEmpty:function(){return false;}};}};
      ""","config-engine-boundary");
    eval(cx,policy,source,"sunrin_policy-config-evaluation.js");
    eval(cx,policy,"""
      harnessListeners['server.tick']({});
      if(harnessErrors.length)throw Error(harnessErrors.join('; '));
      ""","verify-policy-config-engine");
    System.out.println("PASS: actual policy default-config validation runs in Rhino with controlled registry-existence boundary");
    eval(cx,policy,"""
      ['random','furniture'].forEach(function(kind){
        global.sunrinHandleBoxRequest({getPlayer:function(){return {};},getKind:function(){return kind;},getRequestId:function(){return 'request-'+kind;}});
      });
      if(harnessCommits.length!==2)throw Error('Expected two Core commits; rejects: '+JSON.stringify(harnessRejections)+'; logs: '+harnessErrors.join('; '));
      if(harnessErrors.length)throw Error(harnessErrors.join('; '));
      ""","verify-real-box-handler-engine");
    System.out.println("PASS: actual random/furniture handler reaches one Core commit per event in Rhino (item/Core boundaries controlled)");
    eval(cx,policy,"""
      var harnessMessages=[];
      var Text={of:function(){return {append:function(){return this;},green:function(){return this;},clickRunCommand:function(){return this;}};}};
      var harnessCaller={getUUID:function(){return '00000000-0000-0000-0000-000000000001';},isFake:function(){return false;},tell:function(msg){harnessMessages.push(String(msg));}};
      var harnessOperator={tell:function(){}};
      var harnessServer={getTickCount:function(){return 1;},getPlayerList:function(){return {getPlayer:function(){return harnessOperator;}};}};
      var harnessTicket={count:1,shrink:function(n){this.count-=n;}};
      harnessListeners['item.kubejs:geonpi_ticket']({hand:'MAIN_HAND',player:harnessCaller,server:harnessServer,item:harnessTicket});
      if(harnessTicket.count!==0)throw Error(harnessMessages.join('; '));
      ""","verify-geonpi-engine-scope");
    System.out.println("PASS: actual geonpi callback initializes lexical bindings in Rhino (notification boundaries only)");
    eval(cx,policy,"""
      harnessCaller.persistentData={getString:function(){return '';},putString:function(){}};
      harnessListeners['player.loggedIn']({player:harnessCaller});
      if(harnessErrors.length)throw Error(harnessErrors.join('; '));
      var harnessRoots=[];
      function commandNode(label){return {label:label,children:[],then:function(child){this.children.push(child);return this;},requires:function(){return this;},executes:function(fn){this.execute=fn;return this;}};}
      harnessListeners['server.commandRegistry']({commands:{literal:commandNode,argument:commandNode},register:function(node){harnessRoots.push(node);}});
      var geonpiRoot=harnessRoots.filter(function(node){return node.label==='sunringeonpi';})[0];
      var commandMessages=[];
      var commandPlayer={getUUID:function(){return 'd415f5f4-e89d-4dcf-be37-242f5495681e';},tell:function(msg){commandMessages.push(String(msg));},persistentData:{getString:function(){return '';}}};
      commandPlayer.server={getPlayerList:function(){return {getPlayer:function(){return null;}};},getLevel:function(){return null;}};
      var commandContext={token:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',source:{getPlayerOrException:function(){return commandPlayer;}}};
      var go=geonpiRoot.children.filter(function(node){return node.label==='go';})[0].children[0].execute;
      go(commandContext);
      if(!commandMessages.some(function(msg){return msg.indexOf('요청자가 접속 중이 아닙니다.')>=0;}))throw Error('Go lexical path failed: '+commandMessages.join('; '));
      commandMessages=[];
      commandPlayer.persistentData.getString=function(){return '{"dimension":"minecraft:overworld","x":0,"y":64,"z":0,"yaw":0,"pitch":0}';};
      var back=geonpiRoot.children.filter(function(node){return node.label==='back';})[0].execute;
      back(commandContext);
      if(!commandMessages.some(function(msg){return msg.indexOf('복귀 차원 또는 위치가 안전하지 않습니다.')>=0;}))throw Error('Back lexical path failed: '+commandMessages.join('; '));
      ""","verify-login-and-geonpi-command-engine-scopes");
    System.out.println("PASS: actual login/go/back callbacks initialize bindings in Rhino (grant/offline/unloaded-world boundaries only)");
    eval(cx,policy,"""
      var priorLoad=Java.loadClass;
      Java.loadClass=function(name){
        if(name==='net.minecraft.core.BlockPos')return {containing:function(x,y,z){return {x:x,y:y,z:z};}};
        if(name==='net.minecraft.core.Direction')return {UP:'up'};
        return priorLoad(name);
      };
      Text.of=function(text){return {text:text,children:[],append:function(child){this.children.push(child);return this;},green:function(){return this;},clickRunCommand:function(command){this.command=command;return this;}};};
      var world={dimension:function(){return {location:function(){return 'minecraft:overworld';}};},getMinBuildHeight:function(){return -64;},getMaxBuildHeight:function(){return 320;},hasChunkAt:function(){return true;},getWorldBorder:function(){return {isWithinBounds:function(){return true;}};},getBlockState:function(){return {isFaceSturdy:function(){return true;}};},getFluidState:function(){return {isEmpty:function(){return true;}};},noCollision:function(){return true;}};
      function positionPlayer(p,x){p.x=x;p.y=70;p.z=20;p.getX=function(){return this.x;};p.getY=function(){return this.y;};p.getZ=function(){return this.z;};p.getYRot=function(){return 0;};p.getXRot=function(){return 0;};p.serverLevel=function(){return world;};return p;}
      positionPlayer(harnessCaller,100);positionPlayer(commandPlayer,5);
      commandPlayer.getBoundingBox=function(){return {move:function(){return {};}};};
      var stored='',teleports=0;commandMessages=[];
      commandPlayer.persistentData={getString:function(){return stored;},putString:function(key,value){stored=value;}};
      commandPlayer.server.getPlayerList=function(){return {getPlayer:function(){return harnessCaller;}};};commandPlayer.server.getLevel=function(){return world;};
      commandPlayer.tell=function(msg){commandMessages.push(msg);};
      commandPlayer.teleportTo=function(level,x,y,z){teleports++;this.x=x;this.y=y;this.z=z;};
      if(go(commandContext)!==1)throw Error('Successful go failed: '+commandMessages.join('; '));
      var action=commandMessages[0].children[0];
      if(action.text!=='[복귀하기]' || action.command!=='/sunringeonpi back')throw Error('Return Component action absent');
      if(teleports!==1 || JSON.parse(stored).x!==5)throw Error('Arrival reset bookmark or teleported more than once');
      if(back(commandContext)!==1 || stored!=='' || commandPlayer.x!==5)throw Error('Actual command round trip failed');
      ""","verify-success-return-action-engine");
    System.out.println("PASS: actual Rhino successful go emits fixed return component and back completes round trip (world/Text boundaries controlled)");

  }
}
