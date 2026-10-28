const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(options = {}) {
  let click, logout, tick = 1;
  const exit = Symbol('KubeJS EventExit');
  const pos = (x,y,z) => ({getX:()=>x,getY:()=>y,getZ:()=>z});
  class AABB { constructor(...values) { this.values = values; } }
  const level = {
    spawn: pos(20,70,30), getSharedSpawnPos() { return this.spawn; }, getSharedSpawnAngle:()=>45,
    getDimension:()=> 'minecraft:overworld', getChunkAt:()=>({}),
    getMinBuildHeight:()=>-64, getMaxBuildHeight:()=>320,
    getWorldBorder:()=>({getMinX:()=>options.border ? 25 : -1000,getMaxX:()=>1000,getMinZ:()=>-1000,getMaxZ:()=>1000}),
    getBlockState:p=>({isFaceSturdy:()=>!options.noFloor,getBlock:()=>options.hazard && p.getY()===69 ? 'minecraft:magma_block' : 'minecraft:stone'}),
    getFluidState:()=>({isEmpty:()=>!options.fluid}), noCollision:(_p,box)=>{ assert.ok(box instanceof AABB); return !options.blocked; },
  };
  const server = {getTickCount:()=>tick,getOverworld:()=>options.noLevel ? null : level};
  const player = {
    world: {getDimension:()=> 'minecraft:the_nether'}, x:0,y:60,z:0,
    isFake:()=>!!options.fake, getUuid:()=> 'test-player', isPassenger:()=>!!options.passenger,
    getX(){return this.x;},getY(){return this.y;},getZ(){return this.z;},serverLevel(){return this.world;},
    messages:[],tell(message){this.messages.push(message);},
    teleportTo(world,x,y,z,relative,yaw,pitch) { assert.equal(arguments.length,7);assert.deepEqual(relative,[]);if(options.throwTeleport)throw Error('teleport failed'); if(options.cancelTeleport)return; Object.assign(this,{world,x,y,z,yaw,pitch}); },
    velocity:[1,2,3],setMotionX(v){this.velocity[0]=v;},setMotionY(v){this.velocity[1]=v;},setMotionZ(v){this.velocity[2]=v;},fallDistance:50,
  };
  const stack = {count:3,shrink(n){this.count-=n;}};
  const context = {
    console:{error(){}},ItemEvents:{rightClicked(id,fn){assert.equal(id,'kubejs:town_warp_ticket');click=fn;}},
    PlayerEvents:{loggedOut(fn){logout=fn;}},
    Java:{loadClass(name){
      const types = {
        'net.minecraft.resources.ResourceKey':{create:(_registry,key)=>key},
        'net.minecraft.resources.ResourceLocation':function(value){this.value=value;},
        'net.minecraft.core.registries.Registries':{DIMENSION:'dimension'},
        'net.minecraft.core.BlockPos':{containing:(x,y,z)=>pos(Math.floor(x),Math.floor(y),Math.floor(z))},
        'net.minecraft.core.Direction':{UP:'up'},'net.minecraft.world.phys.AABB':AABB,
        'net.minecraft.core.registries.BuiltInRegistries':{BLOCK:{getKey:block=>block}},
        'java.util.Collections':{emptySet:()=>[]},
      }; assert.ok(types[name],name); return types[name];
    }},
  };
  const script=path.join(__dirname,'../server_scripts/sunrin_town_warp.js');
  assert.ok(fs.existsSync(script),'Town warp server handler missing');
  vm.runInNewContext(fs.readFileSync(script,'utf8'),context,{filename:script});
  return {level,player,stack,logout:()=>logout({player}),nextTick:()=>tick++,use(hand='MAIN_HAND') {
    let result='none';
    try {click({server,player,item:stack,hand,success(){result='success';throw exit;},cancel(){result='cancel';throw exit;}});} catch(e){if(e!==exit)throw e;}
    return result;
  }};
}

test('town ticket uses current overworld spawn and consumes once after confirmed arrival',()=>{
  const f=fixture();assert.equal(f.use(),'success');
  assert.deepEqual([f.player.x,f.player.y,f.player.z,f.player.yaw],[20.5,70,30.5,45]);
  assert.equal(f.player.world,f.level);assert.equal(f.stack.count,2);assert.equal(f.player.fallDistance,0);
  assert.deepEqual(f.player.velocity,[0,0,0]);
  f.use();assert.equal(f.stack.count,2);
  f.nextTick();f.level.spawn={getX:()=>50,getY:()=>80,getZ:()=>60};f.use();
  assert.deepEqual([f.player.x,f.player.y,f.player.z],[50.5,80,60.5]);assert.equal(f.stack.count,1);
});

test('unsafe or cancelled travel retains the ticket',()=>{
  for(const failure of ['noLevel','border','noFloor','fluid','blocked','hazard','cancelTeleport','throwTeleport','passenger']) {
    const f=fixture({[failure]:true});assert.equal(f.use(),'cancel',failure);
    assert.equal(f.stack.count,3,failure);assert.ok(f.player.messages.length,failure);
  }
});

test('offhand and fake actors cannot consume tickets, and logout clears click guard',()=>{
  const f=fixture();f.use('OFF_HAND');assert.equal(f.stack.count,3);
  f.use();assert.equal(f.stack.count,2);f.logout();f.use();assert.equal(f.stack.count,1);
  const fake=fixture({fake:true});fake.use();assert.equal(fake.stack.count,3);
});
