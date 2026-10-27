// Replaces Society's renderer at this exact path so chat has one formatter.
;(function () {
  const TextColor = Java.loadClass('net.minecraft.network.chat.TextColor')
  let bridge = null
  try { bridge = Java.loadClass('dev.sunrin.core.api.SunrinBridge') }
  catch (error) { console.error('[SUNRIN] Chat profile bridge unavailable; keeping account names and Curios colors: ' + error) }
  // Preserve Society's dye order: the last equipped match wins.
  const colorMap = [
    ['minecraft:white_dye',0xffffff], ['minecraft:light_gray_dye',0xaaaaaa],
    ['minecraft:gray_dye',0x555555], ['minecraft:black_dye',0x000000],
    ['minecraft:purple_dye',0x0000aa], ['minecraft:lime_dye',0x55ff55],
    ['minecraft:green_dye',0x00aa00], ['minecraft:brown_dye',0xaa0000],
    ['minecraft:red_dye',0xff5555], ['minecraft:orange_dye',0xffaa00],
    ['minecraft:magenta_dye',0xaa00aa], ['minecraft:yellow_dye',0xffff55],
    ['minecraft:cyan_dye',0x00aaaa], ['minecraft:light_blue_dye',0x55ffff],
    ['minecraft:blue_dye',0x5555ff], ['minecraft:pink_dye',0xff55ff]
  ]
  function addColor(text) {
    // Retain the upstream message-color syntax independently of name styling.
    return String(text).replace(/&#[a-fA-F0-9]{6}/g, hex => TextColor.fromRgb(parseInt(hex.substring(2),16)).toString()).replace(/&/g,'\u00a7')
  }
  PlayerEvents.chat(event => {
    if (!global.enableChatColors) return
    const player = event.player
    let color = 0xffffff
    colorMap.forEach(pair => { if (player.isCuriosEquipped(pair[0])) color = pair[1] })
    let name = Text.of(String(event.username)).color(color)
    if (bridge) {
      try { name = bridge.chatDisplayName(player,color) }
      catch (error) { console.error('[SUNRIN] Chat profile lookup failed; keeping account name: ' + error) }
    }
    event.server.tell(Text.of(' ').append(name).append(Text.of(' \u00a77»\u00a7r ')).append(Text.of(addColor(event.message))))
    event.cancel()
  })
})()
