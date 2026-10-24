const { _electron: electron } = require('@playwright/test')
const { resolve } = require('node:path')
const { mkdir } = require('node:fs/promises')
;(async () => {
  const root = resolve(__dirname, '../..')
  await mkdir(resolve(root, '.work'), { recursive: true })
  const packaged = process.argv.includes('--packaged')
  const app = await electron.launch({
    ...(packaged ? { executablePath: resolve(root, 'release/mac-arm64/Sunrin Valley.app/Contents/MacOS/Sunrin Valley'), args: [] } : { args: [resolve(__dirname, '../out/main/index.js')] }),
    env: { ...process.env, SUNRIN_APP_DATA: resolve(root, '.local-test/electron') }
  })
  try {
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.waitForFunction(async () => (await window.sunrin.getState()).phase !== 'checking')
    await page.getByRole('button', { name: /^(게임 설치|게임 시작|업데이트|복구)$/ }).waitFor()
    await page.screenshot({ path: resolve(root, '.work/launcher.png') })
    await page.getByRole('button', { name: '설정 열기' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByLabel('게임 메모리').fill('8')
    await page.getByRole('button', { name: '저장하고 닫기' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    const state = await page.evaluate(() => window.sunrin.getState())
    if (state.settings.memoryMb !== 8192) throw Error('IPC settings did not persist')
    await page.setViewportSize({ width: 768, height: 600 })
    await page.getByRole('button', { name: '설정 열기' }).click()
    await page.screenshot({ path: resolve(root, '.work/settings.png') })
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 1040, height: 708 })
    if (process.argv.includes('--prism')) {
      await page.evaluate(() => window.sunrin.openPrism())
      console.log('PRISM: official program spawned with dedicated data directory')
    }
    if (errors.length) throw Error(errors.join('\n'))
    console.log('PASS: Electron window, settings dialog, real IPC save; screenshot .work/launcher.png')
  } finally { await app.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
