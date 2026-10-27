const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('startup Forge event dispatch reaches reloadable policy and rejects when policy is unavailable',()=>{
 const script=path.join(__dirname,'../startup_scripts/sunrin_bridge.js');assert.ok(fs.existsSync(script),'Startup Forge event bridge must exist');
 let callback;const rejects=[];const global={};
 vm.runInNewContext(fs.readFileSync(script,'utf8'),{global,console,Java:{loadClass:()=>({rejectOpen:(...args)=>rejects.push(args)})},ForgeEvents:{onEvent(name,fn){assert.equal(name,'dev.sunrin.core.api.BoxOpenRequestEvent');callback=fn;}}});
 const e={getPlayer:()=> 'player',getRequestId:()=> 'request'};callback(e);assert.equal(rejects.length,1);
 const calls=[];global.sunrinHandleBoxRequest=e=>calls.push(e);callback(e);assert.deepEqual(calls,[e]);
});
test('missing Core startup registration fails safe',()=>{
 const script=path.join(__dirname,'../startup_scripts/sunrin_bridge.js');assert.ok(fs.existsSync(script));let registered=false;
 vm.runInNewContext(fs.readFileSync(script,'utf8'),{global:{},console:{error(){}},Java:{loadClass(){throw Error('no Core');}},ForgeEvents:{onEvent(){registered=true;}}});assert.equal(registered,false);
});
