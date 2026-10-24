const { _electron: electron, expect } = require('@playwright/test')
const { resolve } = require('node:path')
const { mkdir, readFile } = require('node:fs/promises')
const closedApplications = new WeakSet()
async function closeWindow(app) {
  if (closedApplications.has(app)) return
  if (app.process().exitCode !== null) { closedApplications.add(app); return }
  const closed = app.waitForEvent('close', { timeout: 30000 })
  await app.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.close() }).catch(() => {})
  await closed
  closedApplications.add(app)
}
;(async () => {
  const root = resolve(__dirname, '../..')
  await mkdir(resolve(root, '.work'), { recursive: true })
  const packaged = process.argv.includes('--packaged')
  const profile = process.env.SUNRIN_SMOKE_PROFILE || resolve(root, '.local-test/electron')
  const version = require('../package.json').version
  const launchOptions = {
    ...(packaged ? { executablePath: resolve(root, `release/${version}/mac-arm64/Sunrin Valley.app/Contents/MacOS/Sunrin Valley`), args: [] } : { args: [resolve(__dirname, '../out/main/index.js')] }),
    env: { ...process.env, SUNRIN_APP_DATA: profile }
  }
  let app = await electron.launch(launchOptions)
  try {
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await expect.poll(() => page.evaluate(() => window.sunrin.getState().then(state => state.phase)), { timeout: 60000 }).not.toBe('checking')
    if (process.argv.includes('--default-memory')) {
      const initial = await page.evaluate(() => window.sunrin.getState())
      if (!initial.memoryRecommendation || initial.settings.memoryMb !== initial.memoryRecommendation.recommendedMb) throw Error('Fresh installation did not use hardware memory recommendation')
    }
    if (process.argv.includes('--background')) {
      const state = await page.evaluate(() => window.sunrin.getState())
      if (state.phase !== 'ready') throw Error(`Expected installed fixture, received ${state.phase}`)
      const receiptPath = resolve(state.settings.dataPath, 'prism-data/instances/SunrinValley/.minecraft/.sunrin/receipt.json')
      const before = await readFile(receiptPath)
      if (process.argv.includes('--restart')) await page.evaluate(() => window.sunrin.primaryAction())
      else await page.getByRole('button', { name: '게임 시작', exact: true }).click()
      await expect.poll(() => page.evaluate(() => window.sunrin.getState().then(state => state.phase)), { timeout: 30000 }).toBe('authenticating')
      const label = page.getByRole('button', { name: '준비하는 중', exact: true })
      if (!await label.isDisabled()) throw Error('Launch button did not disable during authentication')
      await expect.poll(async () => {
        try { const session = JSON.parse(await readFile(resolve(state.settings.dataPath, '.sunrin-launch.json'), 'utf8')); return session.stage }
        catch { return undefined }
      }, { timeout: 30000 }).toBe('authenticating')
      await page.screenshot({ path: resolve(root, '.work/launcher-preparing.png') })
      await page.getByRole('button', { name: '설정 열기' }).click()
      await page.getByText('문제 해결', { exact: true }).click()
      if (!await page.getByRole('button', { name: 'Prism 직접 열기' }).isEnabled()) throw Error('Recovery window cannot be opened during authentication')
      if (!before.equals(await readFile(receiptPath))) throw Error('Normal launch changed the install receipt')
      console.log('PASS: real installed pack launches Prism in the background; fixed authentication status and recovery control work; no reinstall')
      if (process.argv.includes('--restart')) {
        if (!profile.endsWith('.local-test/background-electron')) throw Error('Restart cycle requires the isolated test profile')
        const session = JSON.parse(await readFile(resolve(state.settings.dataPath, '.sunrin-launch.json'), 'utf8'))
        const pid = Number(session.identity.split(':')[0])
        process.kill(pid, 0)
        console.log('PASS: persisted engine PID is live before frontend close')
        await new Promise(resolve => setTimeout(resolve, 10000))
        process.kill(pid, 0)
        console.log('PASS: engine remains alive with frontend open for 10 seconds')
        await closeWindow(app)
        await new Promise(resolve => setTimeout(resolve, 10000))
        process.kill(pid, 0)
        console.log('PASS: detached engine remains alive 10 seconds after the first frontend window closes')
        app = await electron.launch(launchOptions)
        const reopened = await app.firstWindow()
        await expect.poll(() => reopened.evaluate(() => window.sunrin.getState().then(state => state.phase)), { timeout: 60000 }).not.toBe('checking')
        const resumed = await reopened.evaluate(() => window.sunrin.getState())
        if (!['authenticating', 'preparing'].includes(resumed.phase)) throw Error(`Restart cycle lost in-flight engine: ${resumed.phase}`)
        if (!await reopened.getByRole('button', { name: '준비하는 중', exact: true }).isDisabled()) throw Error('Duplicate launch enabled after restart')
        await closeWindow(app)
        await new Promise(resolve => setTimeout(resolve, 10000))
        process.kill(pid, 0)
        console.log('PASS: same engine survives both window closes for 10 seconds and restores preparation after reopening within one smoke runner')
        process.kill(pid, 'SIGTERM')
      }
      return
    }
    if (process.argv.includes('--failed-engine')) {
      await page.getByRole('button', { name: '게임 시작', exact: true }).click()
      await expect.poll(() => page.evaluate(() => window.sunrin.getState().then(state => state.phase)), { timeout: 30000 }).toBe('error')
      await new Promise(resolve => setTimeout(resolve, 3500))
      if ((await page.evaluate(() => window.sunrin.getState())).phase !== 'error') throw Error('Fast engine failure was erased by background monitoring')
      console.log('PASS: immediate engine failure remains visible after multiple monitor intervals')
      return
    }
    if (process.argv.includes('--resume-prism')) {
      const state = await page.evaluate(() => window.sunrin.getState())
      if (!['authenticating', 'preparing'].includes(state.phase)) throw Error(`In-flight engine was not restored: ${state.phase}`)
      if (!await page.getByRole('button', { name: '준비하는 중', exact: true }).isDisabled()) throw Error('Duplicate launch is possible while resuming')
      await page.getByRole('button', { name: '설정 열기' }).click()
      await page.getByText('문제 해결', { exact: true }).click()
      if (!await page.getByRole('button', { name: 'Prism 직접 열기' }).isEnabled()) throw Error('Resumed account recovery control disabled')
      console.log('PASS: closing/reopening frontend restores the same in-flight engine stage and prevents duplicate launch')
      return
    }
    if (process.argv.includes('--manage-prism')) {
      await page.evaluate(() => window.sunrin.openPrism())
      console.log('PASS: opened only account management without a game launch request')
      return
    }
    if (process.argv.includes('--idle-prism')) {
      const state = await page.evaluate(() => window.sunrin.getState())
      if (state.phase !== 'ready') throw Error(`Idle Prism trapped launcher in ${state.phase}`)
      if (!state.message.includes('계정 창이 열려 있습니다')) throw Error('No live idle Prism detected; this test requires the detached background engine')
      await page.getByRole('button', { name: '설정 열기' }).click()
      await page.getByText('문제 해결', { exact: true }).click()
      if (!await page.getByRole('button', { name: 'Prism 직접 열기' }).isEnabled()) throw Error('Idle Prism recovery control disabled')
      console.log('PASS: restarting the launcher with an idle account window remains usable')
      return
    }
    await page.getByRole('button', { name: /^(게임 설치|게임 시작|업데이트|복구)$/ }).waitFor()
    await page.screenshot({ path: resolve(root, '.work/launcher.png') })
    await page.getByRole('button', { name: '설정 열기' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: '권장 12 GB', exact: true }).click()
    if (await page.getByLabel('게임 메모리').inputValue() !== '12') throw Error('Recommended memory preset did not apply')
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
  } finally { await closeWindow(app) }
})().catch(error => { console.error(error); process.exitCode = 1 })
