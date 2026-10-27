import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Scriptable;
import java.nio.file.Files;
import java.nio.file.Path;

/** Pinned-engine regression; Text, Curios and Core remain controlled boundaries. */
public class ChatRhinoCompatibility {
    public static void main(String[] args) throws Exception {
        Context cx = Context.enter();
        String source = Files.readString(Path.of(args[0]).resolve("server_scripts/playerEvents/chatColors.js"));
        for (String mode : new String[]{"profile", "title-only", "missing", "failed", "disabled"}) {
            Scriptable scope = cx.initStandardObjects();
            cx.evaluateString(scope, "var mode='"+mode+"';", "scenario", 1, null);
            cx.evaluateString(scope, """
                var errors=[],sent=[],calls=[],handler,canceled=0;
                var global={enableChatColors:mode!=='disabled'};
                var console={error:function(message){errors.push(String(message));}};
                function text(value){return {text:String(value),rgb:null,children:[],color:function(rgb){this.rgb=rgb;return this;},append:function(child){this.children.push(child);return this;}};}
                var Text={of:text};
                var Java={loadClass:function(name){
                    if(name==='net.minecraft.network.chat.TextColor')return {fromRgb:function(rgb){return {toString:function(){return '#'+rgb.toString(16);}};}};
                    if(name!=='dev.sunrin.core.api.SunrinBridge')throw Error('Unexpected dependency '+name);
                    if(mode==='missing')throw Error('Core unavailable');
                    return {chatDisplayName:function(player,rgb){
                        calls.push(rgb);if(mode==='failed')throw Error('Profile unavailable');
                        return text('').append(text('[선린] ').color(0xffaa00)).append(text('peach_min').color(mode==='profile'?0x55ffff:rgb));
                    }};
                }};
                var PlayerEvents={chat:function(callback){handler=callback;}};
                var player={isCuriosEquipped:function(dye){return dye==='minecraft:red_dye'||dye==='minecraft:pink_dye';}};
                var event={player:player,username:'peach_min',message:'hello &agreen&r',server:{tell:function(message){sent.push(message);}},cancel:function(){canceled++;}};
                """, "chat-boundaries", 1, null);
            cx.evaluateString(scope, source, "chatColors.js", 1, null);
            cx.evaluateString(scope, """
                if(typeof handler!=='function')throw Error('Chat listener absent');
                handler(event);
                if(mode==='disabled'){
                    if(sent.length||canceled||calls.length)throw Error('Disabled chat was intercepted');
                }else{
                    if(sent.length!==1||canceled!==1)throw Error('Chat duplicated or uncanceled');
                    var name=sent[0].children[0];
                    if(mode==='profile'||mode==='title-only'){
                        if(calls[0]!==0xff55ff)throw Error('Last-equipped-dye order changed');
                        if(name.children[0].text!=='[선린] '||name.children[0].rgb!==0xffaa00)throw Error('Title lost or recolored');
                        if(name.children[1].rgb!==(mode==='profile'?0x55ffff:0xff55ff))throw Error('Name precedence changed');
                    }else if(name.text!=='peach_min'||name.rgb!==0xff55ff)throw Error('Native account/dye fallback failed');
                    if(sent[0].children[1].text!==' §7»§r ')throw Error('Arrow formatting changed');
                    if(sent[0].children[2].text!=='hello §agreen§r')throw Error('Message colors lost');
                    if((mode==='profile'||mode==='title-only')&&errors.length)throw Error(errors.join('; '));
                }
                """, "verify-chat-rendering", 1, null);
            System.out.println("PASS: actual pinned Rhino chat renderer " + mode);
        }
    }
}
