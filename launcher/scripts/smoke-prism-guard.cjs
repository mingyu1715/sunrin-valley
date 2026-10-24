const { _electron: electron } = require('@playwright/test')
const { resolve } = require('node:path')
const { readFile } = require('node:fs/promises')
;(async () => {
  const root = resolve(__dirname, '../..')
  const receipt = resolve(root, '.local-test/electron/game/prism-data/instances/SunrinValley/.minecraft/.sunrin/receipt.json')
  const before = await readFile(receipt)
  const app = await electron.launch({ args: [resolve(__dirname, '../out/main/index.js')], env: { ...process.env, SUNRIN_APP_DATA: resolve(root, '.local-test/electron') } })
  try {
    const page = await app.firstWindow()
    await page.waitForFunction(async () => (await window.sunrin.getState()).phase !== 'checking')
    const error = await page.evaluate(async () => { try { await window.sunrin.repair(); return '' } catch (error) { return String(error) } })
    if (!error.includes('Prism') || !error.includes('실행 중')) throw Error(`Busy engine was not protected: ${error}`)
    if (!before.equals(await readFile(receipt))) throw Error('Receipt changed while Prism was running')
    console.log('PASS: a newly started launcher detects the already running Prism and refuses repair without changing files')
  } finally { await app.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
