// Forge event listeners must be registered during STARTUP, while policy reloads on server scripts.
;(function () {
  // Pinned Rhino cannot initialize a captured const inside a try block.
  let bridge
  try {
    bridge = Java.loadClass('dev.sunrin.core.api.SunrinBridge')
    ForgeEvents.onEvent('dev.sunrin.core.api.BoxOpenRequestEvent', event => {
      if (typeof global.sunrinHandleBoxRequest !== 'function') {
        bridge.rejectOpen(event.getPlayer(), String(event.getRequestId()), '선린 보상 정책이 준비되지 않았습니다.')
        return
      }
      try { global.sunrinHandleBoxRequest(event) }
      catch (error) { bridge.rejectOpen(event.getPlayer(), String(event.getRequestId()), '선린 보상 정책 오류: ' + error) }
    })
  } catch (error) { console.error('[SUNRIN] Core event bridge unavailable; boxes remain unconsumed: ' + error) }
})()
