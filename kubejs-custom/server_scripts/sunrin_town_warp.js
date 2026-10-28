// KubeJS 2001.6.5-build.16 / Minecraft 1.20.1. Global spawn, never a personal bed.
;(function () {
  const clicks = {}
  const hazards = ['minecraft:magma_block', 'minecraft:campfire', 'minecraft:soul_campfire',
    'minecraft:fire', 'minecraft:soul_fire', 'minecraft:cactus', 'minecraft:sweet_berry_bush',
    'minecraft:wither_rose', 'minecraft:powder_snow', 'minecraft:lava', 'minecraft:pointed_dripstone']
  const uuid = p => String(p.getUuid())
  PlayerEvents.loggedOut(event => { delete clicks[uuid(event.player)] })

  ItemEvents.rightClicked('kubejs:town_warp_ticket', event => {
    const p = event.player
    if (String(event.hand) !== 'MAIN_HAND' || p.isFake()) return
    const id = uuid(p), tick = event.server.getTickCount()
    if (clicks[id] === tick) { event.cancel(); return }
    clicks[id] = tick
    let arrived = false
    // Pinned Rhino rejects const declarations inside try blocks.
    let level, spawn, x, y, z, yaw
    let Pos, Direction, AABB, Blocks, feet, head, below, box, floor, border, Collections
    try {
      if (p.isPassenger()) throw Error('탑승 중에는 내린 뒤 사용해 주세요.')
      // Unique KubeJS helper avoids Rhino's ambiguous getLevel overloads.
      level = event.server.getOverworld()
      if (!level) throw Error('마을이 있는 오버월드를 찾을 수 없습니다.')
      spawn = level.getSharedSpawnPos(); x = spawn.getX() + 0.5; y = spawn.getY(); z = spawn.getZ() + 0.5
      yaw = level.getSharedSpawnAngle()
      if (![x,y,z,yaw].every(Number.isFinite) || y < level.getMinBuildHeight()+1 || y+2 >= level.getMaxBuildHeight()) throw Error('스폰 좌표가 올바르지 않습니다.')
      Pos = Java.loadClass('net.minecraft.core.BlockPos'); Direction = Java.loadClass('net.minecraft.core.Direction')
      AABB = Java.loadClass('net.minecraft.world.phys.AABB')
      Blocks = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').BLOCK
      feet = Pos.containing(x,y,z); head = Pos.containing(x,y+1,z); below = Pos.containing(x,y-1,z)
      box = new AABB(x-0.3,y,z-0.3,x+0.3,y+1.8,z+0.3)
      // Numeric bounds avoid Rhino's AABB/BlockPos/ChunkPos overload ambiguity.
      border = level.getWorldBorder()
      if (x-0.3 < border.getMinX() || x+0.3 > border.getMaxX()
          || z-0.3 < border.getMinZ() || z+0.3 > border.getMaxZ()) throw Error('스폰이 월드 경계 밖에 있습니다.')
      // Load only the destination chunk; never inspect it as though unloaded air were safe.
      level.getChunkAt(feet)
      floor = level.getBlockState(below)
      if (!floor.isFaceSturdy(level,below,Direction.UP) || !level.noCollision(p,box)
          || !level.getFluidState(feet).isEmpty() || !level.getFluidState(head).isEmpty()
          || [below,feet,head].some(pos => hazards.indexOf(String(Blocks.getKey(level.getBlockState(pos).getBlock()))) >= 0)) {
        throw Error('스폰 위치가 막혀 있거나 위험합니다. 서버장에게 스폰 위치 확인을 요청해 주세요.')
      }
      // Seven arguments select the unique native overload, not the KubeJS dimension helper.
      Collections = Java.loadClass('java.util.Collections')
      p.teleportTo(level,x,y,z,Collections.emptySet(),yaw,0)
      if (String(p.serverLevel().getDimension()) !== 'minecraft:overworld'
          || Math.abs(p.getX()-x)>0.001 || Math.abs(p.getY()-y)>0.001 || Math.abs(p.getZ()-z)>0.001) {
        throw Error('서버가 이동을 허용하지 않았습니다.')
      }
      p.setMotionX(0)
      p.setMotionY(0)
      p.setMotionZ(0)
      p.fallDistance = 0
      event.item.shrink(1)
      arrived = true
      p.tell('마을로 이동했습니다.')
    } catch (e) { p.tell('마을 이동권을 사용하지 않았습니다: ' + e) }
    // KubeJS success/cancel throw EventExit. Keep them outside the error handler.
    if (arrived) event.success()
    else event.cancel()
  })
})()
