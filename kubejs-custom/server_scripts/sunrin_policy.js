// KubeJS 2001.6.5-build.16 / MC 1.20.1. Policy only: Core owns delivery/consumption/journal.
// Config is copied once, then validated without modifying operator edits. /sunrinpolicy reload.
;(function () {
  let bridge = null
  try { bridge = Java.loadClass('dev.sunrin.core.api.SunrinBridge') }
  catch (e) { console.error('[SUNRIN] Core unavailable; rewards disabled: ' + e) }
  let state = { random: null, furniture: null, geonpi: null, errors: {} }
  let initialized = false
  const sessions = {}
  const clicks = {}
  // EntityKJS exposes getUuid() in this pinned build; getUUID() is hidden by Rhino.
  const uuid = p => String(p.getUuid())
  const report = (kind, error) => {
    state.errors[kind] = String(error)
    console.error('[SUNRIN] ' + kind + ' disabled: ' + error)
  }
  function config(name) {
    // Core exposes only these named config reads and first-install copies. Native
    // JsonIO cannot distinguish existing JSON null from missing, or mkdir parents.
    if (!bridge) throw Error('Core config bridge unavailable: ' + name)
    const value = JSON.parse(String(bridge.readConfig(name)))
    if (!value || typeof value.version !== 'string' || !value.version) throw Error(name + ': missing version')
    return value
  }
  function checkedReward(row) {
    if (!row || typeof row.item !== 'string' || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(row.item)) throw Error('Invalid reward item ID')
    if (row.item === 'minecraft:air') throw Error('Empty configured reward: minecraft:air')
    if (!Item.exists(row.item)) throw Error('Missing configured item: ' + row.item)
    if (row.count !== undefined && row.count !== 1) throw Error('Box reward count must equal 1: ' + row.item)
    if (row.initializer && row.initializer !== 'upstream_plushie') throw Error('Unknown initializer: ' + row.item)
    if (row.item.split(':')[1].indexOf('adv_') === 0 && row.initializer !== 'upstream_plushie') throw Error('Missing upstream plushie initializer: ' + row.item)
    return row
  }
  function loadRandom() {
    const cfg = config('random-box')
    if (cfg.denominator !== 10000 || !Array.isArray(cfg.rewards)) throw Error('Random denominator must equal 10000')
    const allowed = ['simplehats:hatbag_easter','simplehats:hatbag_summer','simplehats:hatbag_halloween','simplehats:hatbag_festive']
    const season = cfg.seasonal
    if (!season || !Number.isInteger(season.totalWeight) || season.totalWeight <= 0 || season.totalWeight % 4 !== 0 || season.missingPolicy !== 'fail_if_any_missing' || !Array.isArray(season.items) || season.items.length !== 4 || allowed.some(id => season.items.indexOf(id) < 0)) throw Error('Invalid seasonal policy')
    const rows = cfg.rewards.map(checkedReward)
    const seasonalRows = season.items.map(id => {
      if (!Item.exists(id)) throw Error('Missing configured seasonal hatbag: ' + id)
      return checkedReward({item:id,tier:'seasonal',weight:season.totalWeight/4})
    })
    // Seasonal rows stay between bags and tickets so the public table is stable.
    rows.splice.apply(rows, [4,0].concat(seasonalRows))
    const seen = {}
    let total = 0
    rows.forEach(row => {
      if (!Number.isInteger(row.weight) || row.weight <= 0 || typeof row.tier !== 'string' || !row.tier) throw Error('Invalid weight/tier: ' + row.item)
      if (seen[row.item]) throw Error('Duplicate random item: ' + row.item)
      seen[row.item] = true
      if (row.item === 'minecraft:brown_dye' && (row.weight !== 1 || row.tier !== 'poop')) throw Error('Poop must have weight 1 and tier poop')
      if (row.tier === 'poop' && row.item !== 'minecraft:brown_dye') throw Error('Poop may only be brown dye')
      total += row.weight
    })
    if (total !== 10000) throw Error('Random weights must sum to 10000; got ' + total)
    return {version:cfg.version,rows:rows,probabilities:JSON.stringify(rows.map(r=>({item:r.item,tier:r.tier,weight:r.weight})))}
  }
  function loadFurniture() {
    const cfg = config('furniture-box')
    if (!Array.isArray(cfg.rewards) || !cfg.rewards.length) throw Error('Furniture rewards cannot be empty')
    const seen = {}
    cfg.rewards.forEach(row => {
      checkedReward(row)
      if (seen[row.item]) throw Error('Duplicate furniture item: ' + row.item)
      seen[row.item] = true
      if (row.weight !== undefined || row.tier !== undefined) throw Error('Furniture must be uniform without weights/tiers: ' + row.item)
    })
    return {version:cfg.version,rows:cfg.rewards,probabilities:'[]'}
  }
  function load() {
    initialized = true
    state = {random:null,furniture:null,geonpi:null,errors:{}}
    try { state.random = loadRandom() } catch(e) { report('random', e) }
    try { state.furniture = loadFurniture() } catch(e) { report('furniture', e) }
    let cfg
    try {
      cfg = config('geonpi')
      if (!Array.isArray(cfg.operatorUuids) || cfg.tokenTtlSeconds !== 600) throw Error('Geonpi requires UUID allowlist and 600-second TTL')
      cfg.operatorUuids.forEach(id => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw Error('Invalid operator UUID: ' + id) })
      state.geonpi = cfg
    } catch(e) { report('geonpi',e) }
  }
  // ServerEvents.loaded fires only at serverStarting in this pinned KubeJS build.
  // Ordinary script reevaluation must validate on the next running-server event,
  // when item registries are ready. Failed validation stays closed until reload.
  function ensurePolicy() { if (!initialized) load() }
  function reward(row) {
    if (row.tier === 'poop') return Item.of(row.item, 1, {display:{Name:JSON.stringify({text:'똥',italic:false}),Lore:[JSON.stringify({text:'꽝입니다. 확률이 0.01%인',italic:false})]}})
    if (row.initializer === 'upstream_plushie') return Item.of(row.item, 1, {quality_food:{quality:0},type:Math.floor(Math.random()*15),quest_id:1+Math.floor(Math.random()*3),affection:0})
    return Item.of(row.item, 1)
  }
  function logBoxRejection(kind,requestId,reason) {
    // No player name, inventory or NBT; one bounded line to diagnose headless requests.
    console.error('[SUNRIN] Box request ' + String(requestId).replace(/[^a-zA-Z0-9_-]/g,'?').slice(0,64) +
      ' (' + String(kind).replace(/[^a-zA-Z0-9_-]/g,'?').slice(0,32) + ') rejected: ' + String(reason).replace(/[\r\n]/g,' ').slice(0,1200))
  }
  global.sunrinHandleBoxRequest = event => {
    if (!bridge) return
    ensurePolicy()
    const p = event.getPlayer(), kind = String(event.getKind()), requestId = String(event.getRequestId())
    const cfg = kind === 'random' ? state.random : kind === 'furniture' ? state.furniture : null
    if (!cfg) { logBoxRejection(kind,requestId,state.errors[kind] || kind); bridge.rejectOpen(p,requestId,'상자 설정을 확인해 주세요: ' + (state.errors[kind] || kind)); return }
    // Pinned Rhino also requires this try-block result binding at function scope.
    let stack
    try {
      let row
      if (kind === 'furniture') row = cfg.rows[Math.floor(Math.random()*cfg.rows.length)]
      else {
        let n = Math.floor(Math.random()*10000)
        for (let i=0;i<cfg.rows.length;i++) { n -= cfg.rows[i].weight; if (n<0) { row = cfg.rows[i]; break } }
      }
      if (!row) throw Error('Random source outside valid range')
      checkedReward(row)
      stack = reward(row)
      if (stack.isEmpty()) throw Error('Empty configured reward: ' + row.item)
      bridge.commitBox(p,requestId,kind === 'random'?'kubejs:random_box':'kubejs:furniture_random_box',stack,kind === 'furniture'?'furniture':row.tier,cfg.version,cfg.probabilities)
    } catch(e) { logBoxRejection(kind,requestId,e); bridge.rejectOpen(p,requestId,'보상 설정 오류: ' + e) }
  }
  function mainHand(event) { return String(event.hand) === 'MAIN_HAND' }
  function onceThisTick(event) {
    const id = uuid(event.player), tick = event.server.getTickCount()
    if (clicks[id] === tick) return false
    clicks[id] = tick
    return true
  }
  ;[['kubejs:random_box','random'],['kubejs:furniture_random_box','furniture']].forEach(pair => {
    ItemEvents.rightClicked(pair[0],event => {
      if (!mainHand(event) || event.player.isFake() || !onceThisTick(event)) return
      if (!bridge) { event.player.tell('선린 Core를 사용할 수 없어 상자를 열 수 없습니다.'); return }
      bridge.requestOpen(event.player,pair[1])
    })
  })
  // Player persistent NBT survives logout, restart and ordinary world saves. No offline backpay.
  // The Core grant journal owns idempotency if a crash occurs before this NBT is saved.
  function persisted(p) {
    const text = String(p.persistentData.getString('sunrinRewardsV1'))
    const data = text ? JSON.parse(text) : {first:false,elapsedMs:0,paidRounds:0}
    if (typeof data.first !== 'boolean' || !Number.isFinite(data.elapsedMs) || data.elapsedMs < 0 || !Number.isInteger(data.paidRounds) || data.paidRounds < 0 || data.paidRounds > Math.floor(data.elapsedMs/1800000)) throw Error('Invalid Sunrin playtime persistence')
    return data
  }
  function save(p,data) { p.persistentData.putString('sunrinRewardsV1',JSON.stringify(data)) }
  // Food uses the same elapsed clock, with its own cursor and Core journal namespace.
  // Seed before either payout so adding this stream never backpays old online rounds.
  function mealPersistence(p,data) {
    try {
      var text = String(p.persistentData.getString('sunrinMealRewardsV1'))
      var due = Math.floor(data.elapsedMs/1800000)
      var meal = text ? JSON.parse(text) : {paidThroughRound:due}
      if (!meal || !Number.isInteger(meal.paidThroughRound) || meal.paidThroughRound < 0 || meal.paidThroughRound > due) throw Error('Invalid Sunrin meal persistence')
      if (!text) saveMeal(p,meal)
      return meal
    } catch(e) {
      console.error('[SUNRIN] Meal disabled for ' + uuid(p) + ': ' + e)
      return null
    }
  }
  function saveMeal(p,meal) { p.persistentData.putString('sunrinMealRewardsV1',JSON.stringify(meal)) }
  function payMeal(p,data,meal) {
    if (!meal) return
    try {
      var due = Math.floor(data.elapsedMs/1800000)
      while (meal.paidThroughRound < due) {
        var round = meal.paidThroughRound + 1
        if (!bridge || !bridge.grantJson(p,'sunrin:meal-online:v1:' + uuid(p) + ':' + round,JSON.stringify([{item:'kubejs:sunrin_meal',count:10}]))) break
        meal.paidThroughRound = round
        saveMeal(p,meal)
      }
    } catch(e) { console.error('[SUNRIN] Meal grant failed for ' + uuid(p) + ': ' + e) }
  }
  function grant(p,id,count) {
    // A distinct method avoids Rhino's ambiguous String / ItemStack[] conversion.
    return bridge && bridge.grantJson(p,id,JSON.stringify([{item:'kubejs:random_box',count:count},{item:'kubejs:furniture_random_box',count:count}]))
  }
  function pay(p,data) {
    if (!data.first) {
      if (!grant(p,'sunrin:first:v1:' + uuid(p),15)) return
      data.first = true
      save(p,data)
    }
    const due = Math.floor(data.elapsedMs/1800000)
    while (data.paidRounds < due) {
      const round = data.paidRounds + 1
      if (!grant(p,'sunrin:online:v1:' + uuid(p) + ':' + round,5)) break
      data.paidRounds = round
      save(p,data)
    }
  }
  function notifyOnline(p,data,meal,previousBoxes,previousMeals) {
    // Cursor deltas count only Core-acknowledged rounds, never migration or login gifts.
    // Keep bindings function-scoped for the pinned Rhino engine.
    try {
      var boxes = (data.paidRounds-previousBoxes)*5
      var meals = meal ? (meal.paidThroughRound-previousMeals)*10 : 0
      var received = []
      if (boxes > 0) { received.push('랜덤상자 ' + boxes + '개'); received.push('가구 랜덤상자 ' + boxes + '개') }
      if (meals > 0) received.push('선린 급식 ' + meals + '개')
      if (received.length) p.tell('30분 접속 보상을 받았습니다: ' + received.join(', '))
    } catch(e) { console.error('[SUNRIN] Reward notification failed for ' + uuid(p) + ': ' + e) }
  }
  function login(p) {
    if (p.isFake()) return
    try {
      let data = persisted(p)
      sessions[uuid(p)] = {last:Date.now(),data:data,meal:mealPersistence(p,data)}
      var previousBoxes = data.paidRounds
      var previousMeals = sessions[uuid(p)].meal ? sessions[uuid(p)].meal.paidThroughRound : 0
      pay(p,data)
      payMeal(p,data,sessions[uuid(p)].meal)
      notifyOnline(p,data,sessions[uuid(p)].meal,previousBoxes,previousMeals)
    } catch(e) { console.error('[SUNRIN] Playtime disabled for ' + uuid(p) + ': ' + e) }
  }
  function sample(p,finish) {
    const session = sessions[uuid(p)]
    if (!session) { if (!finish) login(p); return }
    const now = Date.now(), delta = now-session.last
    session.last = now
    // One-second samples; discard reversed clocks and cap delayed ticks at five seconds.
    session.data.elapsedMs += Math.max(0,Math.min(5000,delta))
    var previousBoxes = session.data.paidRounds
    var previousMeals = session.meal ? session.meal.paidThroughRound : 0
    pay(p,session.data)
    save(p,session.data)
    payMeal(p,session.data,session.meal)
    notifyOnline(p,session.data,session.meal,previousBoxes,previousMeals)
    if (finish) delete sessions[uuid(p)]
  }
  PlayerEvents.loggedIn(event => login(event.player))
  PlayerEvents.tick(event => { if (event.server.getTickCount()%20 === 0) sample(event.player,false) })
  PlayerEvents.loggedOut(event => { sample(event.player,true); delete clicks[uuid(event.player)] })
  ServerEvents.loaded(event => { load(); event.server.players.forEach(p => login(p)) })
  ServerEvents.tick(() => ensurePolicy())
  ServerEvents.unloaded(event => { event.server.players.forEach(p => sample(p,true)) })
  const tokens = {}
  const returnKey = 'sunrinGeonpiReturnV1'
  function online(server,id) {
    const UUID = Java.loadClass('java.util.UUID')
    return server.getPlayerList().getPlayer(UUID.fromString(id))
  }
  function allowed(p) { ensurePolicy(); return state.geonpi && state.geonpi.operatorUuids.indexOf(uuid(p)) >= 0 }
  ItemEvents.rightClicked('kubejs:geonpi_ticket',event => {
    if (!mainHand(event) || event.player.isFake() || !onceThisTick(event)) return
    ensurePolicy()
    if (!bridge || !state.geonpi) { event.player.tell('건피티켓 설정을 확인해 주세요.'); return }
    // Keep captured declarations out of try blocks for pinned Rhino.
    let operators, UUID, now, token
    try {
      operators = state.geonpi.operatorUuids.map(id=>online(event.server,id)).filter(p=>p !== null)
      if (!operators.length) { event.player.tell('접속 중인 운영진이 없어 티켓을 사용하지 않았습니다.'); return }
      UUID = Java.loadClass('java.util.UUID')
      now = Date.now()
      Object.keys(tokens).forEach(key=>{ if (tokens[key].expires < now) delete tokens[key] })
      token = String(UUID.randomUUID())
      tokens[token] = {caller:uuid(event.player),expires:now+600000}
      operators.forEach(p=>{
        const message = Text.of('').append(bridge.displayName(event.player)).append(' 님이 건피티켓을 사용했습니다. ')
        message.append(Text.of('이동하기').green().clickRunCommand('/sunringeonpi go '+token))
        p.tell(message)
      })
      event.item.shrink(1)
      event.player.tell('운영진에게 건피티켓 사용 요청을 보냈습니다.')
    } catch(e) { event.player.tell('건피티켓 알림 오류: ' + e) }
  })
  function location(p) {
    return {dimension:String(p.serverLevel().dimension().location()),x:p.getX(),y:p.getY(),z:p.getZ(),yaw:p.getYRot(),pitch:p.getXRot()}
  }
  function world(server,id) {
    const Key = Java.loadClass('net.minecraft.resources.ResourceKey')
    const Registries = Java.loadClass('net.minecraft.core.registries.Registries')
    const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
    return server.getLevel(Key.create(Registries.DIMENSION,new ResourceLocation(id)))
  }
  function safe(p,level,dest) {
    if (!level || ![dest.x,dest.y,dest.z,dest.yaw,dest.pitch].every(Number.isFinite)) return false
    const Pos = Java.loadClass('net.minecraft.core.BlockPos'), Direction = Java.loadClass('net.minecraft.core.Direction')
    const feet = Pos.containing(dest.x,dest.y,dest.z), head = Pos.containing(dest.x,dest.y+1,dest.z), below = Pos.containing(dest.x,dest.y-1,dest.z)
    if (dest.y < level.getMinBuildHeight()+1 || dest.y+2 >= level.getMaxBuildHeight()) return false
    if (!level.hasChunkAt(feet) || !level.hasChunkAt(head) || !level.hasChunkAt(below) || !level.getWorldBorder().isWithinBounds(feet)) return false
    if (!level.getBlockState(below).isFaceSturdy(level,below,Direction.UP)) return false
    if (!level.getFluidState(feet).isEmpty() || !level.getFluidState(head).isEmpty()) return false
    return level.noCollision(p,p.getBoundingBox().move(dest.x-p.getX(),dest.y-p.getY(),dest.z-p.getZ()))
  }
  function teleport(p,level,dest) {
    p.teleportTo(level,dest.x,dest.y,dest.z,dest.yaw,dest.pitch)
    const current = location(p)
    if (current.dimension !== dest.dimension || Math.abs(current.x-dest.x)>0.001 || Math.abs(current.y-dest.y)>0.001 || Math.abs(current.z-dest.z)>0.001) throw Error('Teleport did not reach destination')
  }
  function go(p,token) {
    if (!allowed(p)) { p.tell('운영진 UUID 권한이 없습니다.'); return 0 }
    const request = tokens[token], now = Date.now()
    if (!request || now > request.expires || now < request.expires-600000) { p.tell('만료되었거나 유효하지 않은 요청입니다.'); return 0 }
    if (String(p.persistentData.getString(returnKey))) { p.tell('/sunringeonpi back으로 먼저 복귀해 주세요.'); return 0 }
    try {
      let caller = online(p.server,request.caller)
      if (!caller || uuid(caller) !== request.caller) throw Error('요청자가 접속 중이 아닙니다.')
      let dest = location(caller), level = world(p.server,dest.dimension)
      // A current player position can be unsafe (flying, lava, blocked portal). Refuse safely.
      if (!safe(p,level,dest)) throw Error('이동할 차원 또는 발 디딜 위치가 안전하지 않습니다.')
      p.persistentData.putString(returnKey,JSON.stringify(location(p)))
      teleport(p,level,dest)
      let message = Text.of('요청자에게 이동했습니다. ')
      message.append(Text.of('[복귀하기]').green().clickRunCommand('/sunringeonpi back'))
      p.tell(message)
      return 1
    } catch(e) { p.tell('이동하지 못했습니다: '+e); return 0 }
  }
  function back(p) {
    if (!allowed(p)) { p.tell('운영진 UUID 권한이 없습니다.'); return 0 }
    try {
      let stored = String(p.persistentData.getString(returnKey))
      if (!stored) throw Error('저장된 복귀 위치가 없습니다.')
      let dest = JSON.parse(stored)
      if (typeof dest.dimension !== 'string' || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(dest.dimension)) throw Error('잘못된 차원입니다.')
      let level = world(p.server,dest.dimension)
      if (!safe(p,level,dest)) throw Error('복귀 차원 또는 위치가 안전하지 않습니다. 위치는 보존됩니다.')
      teleport(p,level,dest)
      p.persistentData.putString(returnKey,'')
      return 1
    } catch(e) { p.tell('복귀하지 못했습니다: '+e); return 0 }
  }
  // Commands are separate from Core's /sunrin tree. Registry callback is defined below.
  ServerEvents.commandRegistry(event => {
    const C = event.commands
    const StringArgument = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
    event.register(C.literal('sunringeonpi')
      .then(C.literal('go').then(C.argument('token',StringArgument.word()).executes(ctx=>go(ctx.source.getPlayerOrException(),String(StringArgument.getString(ctx,'token'))))))
      .then(C.literal('back').executes(ctx=>back(ctx.source.getPlayerOrException()))))
    event.register(C.literal('sunrinpolicy').requires(source=>source.hasPermission(2)).then(C.literal('reload').executes(ctx=>{
      load()
      ctx.source.sendSuccess(()=>Text.of(Object.keys(state.errors).length ? '설정 오류: '+JSON.stringify(state.errors) : '선린 설정을 다시 불러왔습니다.'),false)
      return Object.keys(state.errors).length ? 0 : 1
    })))
  })
})()
