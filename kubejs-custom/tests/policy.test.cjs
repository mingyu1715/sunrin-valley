// These tests execute the shipped server script at KubeJS/Java boundaries.
// Removing fail-closed validation, range boundaries or session accounting must fail them.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const copy = x => JSON.parse(JSON.stringify(x));
function fixture(options = {}) {
  const handlers = {}, files = new Map(), commits = [], rejections = [], grants = [], requests = [], errors = [];
  let now = 100000, roll = 0;
  const missing = new Set(options.missing || []), delivered = new Set();
  const items = { exists: id => !missing.has(id), of(id, count = 1, nbt) { if(options.failItem)throw Error('fixture item construction failed '+ 'x'.repeat(5000)); if (typeof count !== 'number') { nbt = count; count = 1; } return { id, count, nbt: nbt || null, isEmpty() { return id === 'minecraft:air' || missing.has(id); } }; } };
  const bridge = {
    readConfig(name) {
      const dest='config/sunrin/'+name+'.json';
      if (!files.has(dest)) files.set(dest,JSON.parse(fs.readFileSync(path.join(root,'data/sunrin/defaults',name+'.json'),'utf8')));
      const value=files.get(dest);
      if(value && value.__fixtureDirectory) throw Error('Config must be a regular file: '+dest);
      return typeof value==='string'?value:JSON.stringify(value);
    },
    commitBox(...args) { commits.push(args); return true; }, rejectOpen(...args) { rejections.push(args); },
    requestOpen(...args) { requests.push(args); }, isOperator(p) { return !!p.operator; }, displayName(p) { return p.username; },
    grant(p, id, payload) { const rewards=JSON.parse(payload).map(x=>({id:x.item,count:x.count})); grants.push({ p, id, rewards }); if (options.failGrant) return false; if (!delivered.has(id)) { delivered.add(id); p.received.push(...rewards); } return true; },
  };
  const players = [], server = { getTickCount: () => 20, players, getPlayerList: () => ({ getPlayer: uuid => players.find(p => p.uuid === String(uuid)) || null }) };
  function player(uuid = '00000000-0000-0000-0000-000000000001') {
    const p = { uuid, username: 'tester', server, persistentData: { getString(k) { return this[k] || ''; }, putString(k, v) { this[k] = v; } }, received: [], messages: [], tell(x) { this.messages.push(x); }, getUUID: () => uuid, isFake: () => false };
    players.push(p); return p;
  }
  const commandTrees = [];
  function node(label) { return {label,children:[],then(child){this.children.push(child);return this;},requires(fn){this.allowed=fn;return this;},executes(fn){this.execute=fn;return this;}}; }
  function commands() { handlers['server.commandRegistry']({commands:{literal:node,argument:node},register:tree=>commandTrees.push(tree)}); }
  function run(p, root, action, token) { const tree=commandTrees.find(n=>n.label===root);assert.ok(tree,'command must be registered: '+root);let n=tree.children.find(n=>n.label===action);if(token)n=n.children[0];return n.execute({source:{player:p,getPlayerOrException:()=>p,hasPermission:()=>!!p.operator,sendSuccess(){}},token}); }

  function component(s) { return { text: s, children:[], append(t) { this.children.push(t); return this; }, clickRunCommand(command) { this.command = command; return this; }, green() { return this; }, red() { return this; } }; }
  const context = { global: {}, console: { info() {}, error(x) { errors.push(String(x)); }, warn() {} }, Date: { now: () => now }, Math: Object.assign(Object.create(Math), { random: () => roll }),
    JsonIO: { readString(p) { if (files.has(p)) return JSON.stringify(files.get(p)); const rel = p.replace(/^kubejs\//, ''); return fs.readFileSync(path.join(root, rel), 'utf8'); }, of: x => x, write(p, x) { files.set(p, copy(x)); } },
    Java: { loadClass(name) {
      if (name === 'dev.sunrin.core.api.SunrinBridge') { if (options.noCore) throw Error('missing Core'); return bridge; }
      if (/^java\.(nio|io)(\.|$)/.test(name)) throw Error('Class is not allowed by class filter: '+name);
      if (name === 'java.util.UUID') return { fromString: x => x, randomUUID: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
      if (name === 'net.minecraft.resources.ResourceLocation') return function(a,b) { this.value = b ? a + ':' + b : a; this.toString=()=>this.value; };
      if (name === 'com.mojang.brigadier.arguments.StringArgumentType') return { word:()=> 'word',getString:(ctx,key)=>ctx[key] };
      if (name === 'net.minecraft.core.Direction') return { UP:'up' };
      if (name === 'net.minecraft.resources.ResourceKey') return { create: (_, key) => key };
      if (name === 'net.minecraft.core.registries.Registries') return { DIMENSION: 'dimension' };
      if (name === 'net.minecraft.core.BlockPos') return { containing: (x,y,z) => ({x,y,z}) };
      throw Error('Unverified Java dependency: ' + name);
    } }, Item: items, Text: { of: component, translate: component },
    ServerEvents: new Proxy({}, { get(_, name) { return fn => { handlers['server.' + name] = fn; }; } }),
    PlayerEvents: new Proxy({}, { get(_, name) { return fn => { handlers['player.' + name] = fn; }; } }),
    ItemEvents: { rightClicked(id, fn) { handlers['item.' + id] = fn; } },
  };
  const world={dimension:()=>({location:()=>({toString:()=> 'minecraft:overworld'})}), hasChunkAt:()=>true,getMinBuildHeight:()=>-64,getMaxBuildHeight:()=>320,getWorldBorder:()=>({isWithinBounds:()=>true}),getBlockState:()=>({isFaceSturdy:()=>true}),getFluidState:()=>({isEmpty:()=>true}),noCollision:()=>true};
  server.getLevel=()=>world;
  const oldPlayer=player;
  function worldPlayer(id) {const p=oldPlayer(id);p.x=10;p.y=70;p.z=20;p.yaw=45;p.pitch=20;p.world=world;p.serverLevel=()=>p.world;p.getX=()=>p.x;p.getY=()=>p.y;p.getZ=()=>p.z;p.getYRot=()=>p.yaw;p.getXRot=()=>p.pitch;p.getBoundingBox=()=>({move:()=>({})});p.teleportTo=(level,x,y,z,yaw,pitch)=>{if(p.failTeleport)throw Error('teleport failed');p.world=level;p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.pitch=pitch;};return p;}
  const script = path.join(root, 'server_scripts/sunrin_policy.js');
  assert.ok(fs.existsSync(script), 'Server reward policy script must exist');
  function reload() { vm.runInNewContext(fs.readFileSync(script, 'utf8'), context, { filename: script }); }
  reload();
  return { context, handlers, files, commits, rejections, grants, requests, errors, player:worldPlayer, server, world, commands, run, commandTrees, reload, setNow: x => now = x, advance: x => now += x, setRoll: x => roll = x,
    load() { handlers['server.loaded']({server}); }, open(p, kind='random', id='request-1') { context.global.sunrinHandleBoxRequest({ getPlayer:()=>p, getRequestId:()=>id, getKind:()=>kind }); },
    login(p) { handlers['player.loggedIn']({player:p, server}); }, tick(p) { handlers['player.tick']({player:p, server}); }, logout(p) { handlers['player.loggedOut']({player:p, server}); },
  };
}

test('all 10000 random outcomes select exactly one configured item and one delivery', () => {
  const f=fixture(); f.load(); const p=f.player();
  for(let i=0;i<10000;i++) { f.setRoll((i+0.5)/10000); f.open(p,'random',String(i)); }
  const counts={}; for(const c of f.commits) { const reward=c[3]; assert.equal(reward.count,1); counts[reward.id]=(counts[reward.id]||0)+1; }
  assert.deepEqual(counts, {'simplehats:hatbag_common':3899,'simplehats:hatbag_uncommon':2700,'simplehats:hatbag_rare':1200,'simplehats:hatbag_epic':300,'simplehats:hatbag_easter':100,'simplehats:hatbag_summer':100,'simplehats:hatbag_halloween':100,'simplehats:hatbag_festive':100,'kubejs:rename_ticket':300,'kubejs:name_color_ticket':200,'kubejs:geonpi_ticket':1000,'minecraft:brown_dye':1});
  assert.equal(f.commits.length,10000); assert.equal(p.received.length,0);
  const poop=f.commits.at(-1); assert.equal(poop[4],'poop'); assert.deepEqual(copy(poop[3].nbt), {display:{Name:'{"text":"똥","italic":false}',Lore:['{"text":"꽝입니다. 확률이 0.01%인","italic":false}']}});
  assert.equal(JSON.parse(poop[6]).reduce((n,r)=>n+r.weight,0),10000);
});

test('missing fixed rewards and invalid reload block all opening before Core commit', () => {
  const f=fixture({missing:['simplehats:hatbag_rare']}); f.load(); const p=f.player(); f.open(p);
  assert.equal(f.commits.length,0); assert.match(f.rejections[0][2],/hatbag_rare/);
  const g=fixture();g.load(); const cfg=g.files.get('config/sunrin/random-box.json');cfg.rewards[0].weight=1;g.files.set('config/sunrin/random-box.json',cfg);g.load();g.open(g.player());
  assert.equal(g.commits.length,0); assert.match(g.rejections[0][2],/10000/);
});

test('four separate seasonal outcomes each carry 1% with a 10000 total', () => {
  const f=fixture();f.load();f.open(f.player());
  const probabilities=JSON.parse(f.commits[0][6]);
  assert.deepEqual(probabilities.filter(row=>row.tier==='seasonal').map(row=>[row.item,row.weight]),[
    ['simplehats:hatbag_easter',100],['simplehats:hatbag_summer',100],['simplehats:hatbag_halloween',100],['simplehats:hatbag_festive',100]
  ]);
  assert.equal(probabilities.reduce((total,row)=>total+row.weight,0),10000);
  assert.equal(f.commits[0][5],'2026-10-27-1');
});

test('any missing seasonal bag disables every opening without requesting consumption', () => {
  const seasonal=['simplehats:hatbag_easter','simplehats:hatbag_summer','simplehats:hatbag_halloween','simplehats:hatbag_festive'];
  for(const missing of [...seasonal.map(id=>[id]),seasonal]) {
    const f=fixture({missing});f.load();const p=f.player();
    for(const roll of [0,0.5,0.99]){f.setRoll(roll);f.open(p);}
    assert.equal(f.commits.length,0,missing.join(','));
    assert.equal(f.rejections.length,3);assert.ok(f.rejections.every(row=>row[2].includes('seasonal')));
  }
});

test('operator seasonal weights stay configurable and persisted without redistribution', () => {
  const f=fixture();f.load();const cfg=f.files.get('config/sunrin/random-box.json');
  cfg.seasonal.totalWeight=800;cfg.rewards[0].weight=3499;cfg.version='operator-seasonal';
  f.reload();f.open(f.player());
  assert.equal(f.commits.length,1,'valid operator weights must open successfully');
  const probabilities=JSON.parse(f.commits[0][6]);
  assert.deepEqual(probabilities.filter(row=>row.tier==='seasonal').map(row=>row.weight),[200,200,200,200]);
  assert.equal(probabilities.reduce((total,row)=>total+row.weight,0),10000);
  assert.equal(f.files.get('config/sunrin/random-box.json').seasonal.totalWeight,800);
  assert.equal(f.commits[0][5],'operator-seasonal');
});

test('invalid seasonal totals or a redistribution policy fail closed', () => {
  for(const totalWeight of [0,-4,401,400.5,'400',null]) {
    const f=fixture();f.load();f.files.get('config/sunrin/random-box.json').seasonal.totalWeight=totalWeight;
    f.load();f.open(f.player());assert.equal(f.commits.length,0);assert.match(f.rejections[0][2],/seasonal/);
  }
  const f=fixture();f.load();f.files.get('config/sunrin/random-box.json').seasonal.missingPolicy='redistribute_equally_among_registered_listed_bags_fail_if_none';
  f.load();f.open(f.player());assert.equal(f.commits.length,0);assert.match(f.rejections[0][2],/seasonal/);
});

test('furniture is uniform, deduplicated, initialized and missing configured IDs block', () => {
  const f=fixture();f.load();const cfg=f.files.get('config/sunrin/furniture-box.json');
  assert.ok(cfg.rewards.length>20);assert.equal(new Set(cfg.rewards.map(x=>x.item)).size,cfg.rewards.length);
  f.files.set('config/sunrin/furniture-box.json',{version:'test',rewards:[{item:'tanukidecor:antique_clock'},{item:'cluttered:adv_pastel_bunny_plushie',initializer:'upstream_plushie'}]});f.load();const p=f.player();
  f.setRoll(0);f.open(p,'furniture','f1');f.setRoll(0.5);f.open(p,'furniture','f2');
  assert.equal(f.commits[0][3].id,'tanukidecor:antique_clock');assert.equal(f.commits[1][3].id,'cluttered:adv_pastel_bunny_plushie');
  assert.ok(f.commits[1][3].nbt.quality_food);assert.equal(f.commits[1][3].nbt.affection,0);
  const bad=fixture({missing:['tanukidecor:antique_clock']});bad.load();bad.open(bad.player(),'furniture');assert.equal(bad.commits.length,0);assert.ok(bad.errors.some(x=>x.includes('antique_clock')));
});

test('edited configuration survives subsequent loads and absent Core never consumes', () => {
  const f=fixture();f.load();f.files.get('config/sunrin/geonpi.json').operatorUuids=['00000000-0000-0000-0000-000000000099'];f.load();assert.equal(f.files.get('config/sunrin/geonpi.json').operatorUuids.length,1);
  const g=fixture({noCore:true});g.load();const p=g.player();const e={player:p,server:g.server,hand:'MAIN_HAND',item:{count:1}};g.handlers['item.kubejs:random_box'](e);assert.equal(e.item.count,1);assert.equal(g.requests.length,0);assert.ok(p.messages.length);
});

test('right click forwards only main hand and suppresses duplicate tick requests', () => {
  const f=fixture();f.load();const p=f.player();const e={player:p,server:f.server,hand:'MAIN_HAND',item:{count:2}};const click=f.handlers['item.kubejs:random_box'];click({...e,hand:'OFF_HAND'});click(e);click(e);assert.equal(f.requests.length,1);assert.equal(e.item.count,2);
});

test('first grant happens once and online rounds exclude offline and clock jumps', () => {
  const f=fixture();f.load();const p=f.player();f.login(p);assert.deepEqual(f.grants[0].rewards.map(x=>[x.id,x.count]),[['kubejs:random_box',15],['kubejs:furniture_random_box',15]]);
  f.logout(p);f.advance(86400000);f.login(p);assert.equal(f.grants.length,1);
  for(let i=0;i<1800;i++){f.advance(1000);f.tick(p);}assert.equal(f.grants.length,2);assert.deepEqual(f.grants[1].rewards.map(x=>x.count),[5,5]);
  f.advance(-100000);f.tick(p);f.advance(86400000);f.tick(p);assert.equal(f.grants.length,2);
  f.logout(p);f.login(p);assert.equal(f.grants.length,2);
});

test('failed grants preserve deterministic retry IDs without increasing paid rounds', () => {
  const f=fixture({failGrant:true});f.load();const p=f.player();f.login(p);f.advance(1000);f.tick(p);assert.equal(f.grants[0].id,f.grants[1].id);assert.equal(p.received.length,0);
});
module.exports={fixture};


test('geonpi consumes after notification only for online allowlisted operators', () => {
  const f=fixture();f.load();const caller=f.player();const ticket={count:2,shrink(n){this.count-=n;}};
  const click=f.handlers['item.kubejs:geonpi_ticket'];assert.equal(typeof click,'function','geonpi ticket must have handler');
  const e={player:caller,server:f.server,hand:'MAIN_HAND',item:ticket};click(e);assert.equal(ticket.count,2);
  const op=f.player('00000000-0000-0000-0000-000000000099');f.files.get('config/sunrin/geonpi.json').operatorUuids=[op.uuid];f.load();f.handlers['player.loggedOut']({player:caller,server:f.server});click(e);
  assert.equal(ticket.count,1);assert.ok(op.messages.some(x=>JSON.stringify(x).includes('/sunringeonpi go ')));
});

test('geonpi token checks identity, TTL and current caller position; back preserves bookmark on failure',()=>{
  const f=fixture();f.load();f.commands();const caller=f.player();const op=f.player('00000000-0000-0000-0000-000000000099');const outsider=f.player('00000000-0000-0000-0000-000000000088');
  f.files.get('config/sunrin/geonpi.json').operatorUuids=[op.uuid];f.load();
  f.handlers['item.kubejs:geonpi_ticket']({player:caller,server:f.server,hand:'MAIN_HAND',item:{shrink(){}}});
  const token='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';caller.x=100;op.x=5;op.yaw=17;op.pitch=9;
  assert.equal(f.run(outsider,'sunringeonpi','go',token),0);assert.equal(outsider.x,10);
  assert.equal(f.run(op,'sunringeonpi','go',token),1);assert.equal(op.x,100);
  caller.x=200;assert.equal(f.run(op,'sunringeonpi','go',token),0);assert.equal(op.x,100);
  op.failTeleport=true;assert.equal(f.run(op,'sunringeonpi','back'),0);assert.ok(op.persistentData.getString('sunrinGeonpiReturnV1'));
  op.failTeleport=false;assert.equal(f.run(op,'sunringeonpi','back'),1);assert.equal(op.x,5);assert.equal(op.yaw,17);assert.equal(op.pitch,9);assert.equal(op.persistentData.getString('sunrinGeonpiReturnV1'),'');
  f.advance(600001);assert.equal(f.run(op,'sunringeonpi','go',token),0);assert.equal(op.x,5);
});

test('geonpi unsafe or unloaded destination keeps bookmark and caller offline invalidates token',()=>{
  const f=fixture();f.load();f.commands();const caller=f.player();const op=f.player('00000000-0000-0000-0000-000000000099');f.files.get('config/sunrin/geonpi.json').operatorUuids=[op.uuid];f.load();
  f.handlers['item.kubejs:geonpi_ticket']({player:caller,server:f.server,hand:'MAIN_HAND',item:{shrink(){}}});
  f.world.noCollision=()=>false;assert.equal(f.run(op,'sunringeonpi','go','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),0);assert.equal(op.persistentData.getString('sunrinGeonpiReturnV1'),'');
  f.world.noCollision=()=>true;assert.equal(f.run(op,'sunringeonpi','go','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),1);
  f.world.hasChunkAt=()=>false;assert.equal(f.run(op,'sunringeonpi','back'),0);assert.ok(op.persistentData.getString('sunrinGeonpiReturnV1'));
});

test('furniture rejects uninitialized adv items and duplicate IDs without delivery',()=>{
 const f=fixture();f.load();f.files.set('config/sunrin/furniture-box.json',{version:'bad',rewards:[{item:'cluttered:adv_pastel_bunny_plushie'}]});f.load();f.open(f.player(),'furniture');assert.equal(f.commits.length,0);assert.match(f.rejections[0][2],/initializer/);
 const g=fixture();g.load();g.files.set('config/sunrin/furniture-box.json',{version:'bad',rewards:[{item:'tanukidecor:antique_clock'},{item:'tanukidecor:antique_clock'}]});g.load();g.open(g.player(),'furniture');assert.equal(g.commits.length,0);assert.match(g.rejections[0][2],/Duplicate/);
});

test('playtime restart reuses persisted total and Core journal grant IDs prevent crash replay',()=>{
 const f=fixture();f.load();const p=f.player();f.login(p);for(let i=0;i<900;i++){f.advance(1000);f.tick(p);}f.logout(p);
 const g=fixture();g.load();const restored=g.player();restored.persistentData.sunrinRewardsV1=p.persistentData.sunrinRewardsV1;g.login(restored);assert.equal(g.grants.length,0);
 for(let i=0;i<900;i++){g.advance(1000);g.tick(restored);}assert.equal(g.grants.length,1);assert.match(g.grants[0].id,/:1$/);
 // Simulate a successful Core delivery whose player NBT had not been saved before a crash.
 const h=fixture();h.load();const c=h.player();h.login(c);c.persistentData.sunrinRewardsV1='';h.logout(c);c.persistentData.sunrinRewardsV1='';h.login(c);assert.equal(h.grants[0].id,h.grants[1].id);assert.equal(c.received.length,2);
});

test('furniture delivery omits random-screen probability payload',()=>{
 const f=fixture();f.load();f.open(f.player(),'furniture');assert.equal(f.commits[0][6],'[]');
});


test('ordinary script reevaluation restores both box policies and geonpi without serverStarting',()=>{
  const f=fixture();f.load();const caller=f.player();const op=f.player('00000000-0000-0000-0000-000000000099');
  f.files.get('config/sunrin/random-box.json').version='operator-edited-version';
  f.files.get('config/sunrin/geonpi.json').operatorUuids=[op.uuid];
  const before=copy([...f.files]);
  f.reload(); // KubeJS reevaluates server scripts; it does not post ServerEvents.loaded again.
  f.open(caller,'random','after-reload-random');f.open(caller,'furniture','after-reload-furniture');
  assert.equal(f.commits.length,2);assert.equal(f.commits[0][5],'operator-edited-version');
  const item={count:1,shrink(n){this.count-=n;}};
  f.handlers['item.kubejs:geonpi_ticket']({player:caller,server:f.server,hand:'MAIN_HAND',item});
  assert.equal(item.count,0);assert.ok(op.messages.some(x=>JSON.stringify(x).includes('/sunringeonpi go ')));
  assert.deepEqual(copy([...f.files]),before);
});

test('first running-server tick after reevaluation validates once and invalid edits remain fail closed',()=>{
  const f=fixture();f.load();const cfg=f.files.get('config/sunrin/random-box.json');cfg.rewards[0].weight=1;
  f.reload();assert.equal(typeof f.handlers['server.tick'],'function','running-server tick must initialize reloaded policy');
  f.handlers['server.tick']({server:f.server});
  assert.ok(f.errors.some(x=>x.includes('10000')));f.open(f.player());assert.equal(f.commits.length,0);assert.match(f.rejections[0][2],/10000/);const errors=f.errors.length;
  f.handlers['server.tick']({server:f.server});assert.equal(f.errors.length,errors,'invalid policy must not revalidate every tick');
  assert.equal(f.files.get('config/sunrin/random-box.json').rewards[0].weight,1);
});


test('restricted filesystem classes are unnecessary and malformed/null/nonregular configs are preserved',()=>{
  const f=fixture();f.load();const p=f.player();f.open(p);assert.equal(f.commits.length,1);
  const invalids=['{broken json',null,{__fixtureDirectory:true}];
  for(const value of invalids){
    f.files.set('config/sunrin/random-box.json',value);f.reload();f.open(p,'random','invalid');
    assert.equal(f.commits.length,1);assert.deepEqual(f.files.get('config/sunrin/random-box.json'),value);
    assert.ok(f.rejections.at(-1)[2].includes('상자 설정'));
  }
});


test('rejected box policies and construction errors emit bounded diagnostic logs before rejection',()=>{
 const f=fixture();f.load();f.files.get('config/sunrin/random-box.json').rewards[0].weight=1;f.load();f.open(f.player(),'random','invalid-config');
 assert.ok(f.errors.some(x=>x.includes('Box request')&&x.includes('invalid-config')&&x.includes('10000')));
 const g=fixture({failItem:true});g.load();g.open(g.player(),'random','request-'+ 'y'.repeat(200));
 const log=g.errors.find(x=>x.includes('Box request'));
 assert.ok(log && log.includes('fixture item construction failed'));assert.ok(log.length<=1400);assert.equal(g.rejections.length,1);assert.equal(g.commits.length,0);
});

test('registered air in a weighted reward invalidates every opening before selection or commit',()=>{
  const f=fixture();f.load();const cfg=f.files.get('config/sunrin/random-box.json');
  cfg.rewards[0].item='minecraft:air';f.load();const p=f.player();
  for(const roll of [0,0.5,0.99]){f.setRoll(roll);f.open(p,'random','air-'+roll);}
  assert.equal(f.commits.length,0,'non-air outcomes must also be blocked by an air reward row');
  assert.equal(f.rejections.length,3);assert.ok(f.rejections.every(r=>r[2].includes('minecraft:air')));
  assert.ok(f.errors.some(message=>message.includes('minecraft:air')));
});


test('geonpi emits a fixed clickable return action only after verified successful arrival',()=>{
  function actions(p) {
    const found=[];
    function visit(c) { if(!c || typeof c!=='object')return; if(c.command)found.push(c); for(const child of c.children || [])visit(child); }
    p.messages.forEach(visit);return found.filter(c=>c.command==='/sunringeonpi back');
  }
  for(const mode of ['success','unsafe','offline','failed','unverified']) {
    const f=fixture();f.load();f.commands();const caller=f.player();const op=f.player('00000000-0000-0000-0000-000000000099');
    f.files.get('config/sunrin/geonpi.json').operatorUuids=[op.uuid];f.load();
    f.handlers['item.kubejs:geonpi_ticket']({player:caller,server:f.server,hand:'MAIN_HAND',item:{shrink(){}}});
    caller.x=100;op.x=5;let teleports=0;const original=op.teleportTo;
    op.teleportTo=(...args)=>{teleports++;if(mode!=='unverified')original(...args);};
    if(mode==='unsafe')f.world.noCollision=()=>false;
    if(mode==='offline')f.server.players.splice(f.server.players.indexOf(caller),1);
    if(mode==='failed')op.failTeleport=true;
    assert.equal(f.run(op,'sunringeonpi','go','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),mode==='success'?1:0,mode);
    assert.equal(actions(op).length,mode==='success'?1:0,mode+' return action');
    if(mode==='success') {
      assert.equal(actions(op)[0].text,'[복귀하기]');assert.equal(teleports,1);
      assert.ok(op.messages.some(c=>typeof c==='object' && /이동/.test(c.text)),'localized arrival confirmation');
      const bookmark=op.persistentData.getString('sunrinGeonpiReturnV1');assert.equal(JSON.parse(bookmark).x,5);
      assert.equal(f.run(op,'sunringeonpi','go','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),0);
      assert.equal(op.persistentData.getString('sunrinGeonpiReturnV1'),bookmark);assert.equal(teleports,1);
      assert.equal(f.run(op,'sunringeonpi','back'),1);assert.equal(op.x,5);assert.equal(op.persistentData.getString('sunrinGeonpiReturnV1'),'');
    }
  }
});
