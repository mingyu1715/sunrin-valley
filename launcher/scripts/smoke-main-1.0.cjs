const { _electron: electron, expect } = require('@playwright/test')
const { mkdtemp, mkdir, writeFile, readFile, rm } = require('node:fs/promises')
const { join, resolve } = require('node:path')

// Run the production main/preload/renderer, replacing only remote HTTP and
// native dialog choices. No game download, login, or real profile is touched.
;(async () => {
  const root = await mkdtemp('/private/tmp/sunrin-main-1.0-')
  const profile = join(root, 'profile'), saved = join(root, 'report.txt')
  const seed = { id: 'controlled-report', createdAt: new Date().toISOString(), summary: '테스트 오류 안내', details: 'Controlled sanitized report\nHTTP 503\nNo authentication data' }
  await mkdir(join(profile, 'logs'), { recursive: true })
  await writeFile(join(profile, 'logs/latest-diagnostic.json'), JSON.stringify(seed))
  const entry = join(root, 'entry.cjs')
  await writeFile(entry, `
    const { dialog } = require('electron')
    global.fixtureDialogs = []
    global.fetch = async () => {
      if (global.fixtureHoldFetch) {
        global.fixtureFetchPending = true
        await new Promise(resolve => { global.releaseFixtureFetch = () => { global.fixtureHoldFetch = false; resolve() } })
      }
      return new Response('', {status: 503})
    }
    dialog.showMessageBox = async (_window, options) => { global.fixtureDialogs.push(options); return { response: options.title === '선린밸리 설치 용량' ? 1 : 0 } }
    dialog.showSaveDialog = async () => ({canceled:false, filePath:${JSON.stringify(saved)}})
    require(${JSON.stringify(resolve(__dirname, '../out/main/index.js'))})
  `)
  let app
  try {
    app = await electron.launch({ args: [entry], env: { ...process.env, SUNRIN_APP_DATA: profile } })
    const page = await app.firstWindow()
    await expect(page.getByRole('dialog', {name:'작업을 마치지 못했어요'})).toBeVisible()
    await page.getByRole('button', {name:'오류 정보 복사', exact:true}).click()
    expect(await app.evaluate(({clipboard}) => clipboard.readText())).toBe(seed.details)
    await page.getByRole('button', {name:'진단 파일 저장', exact:true}).click()
    expect(await readFile(saved, 'utf8')).toBe(seed.details)
    await page.keyboard.press('Escape')
    await expect.poll(() => page.evaluate(() => window.sunrin.getState().then(value => value.phase))).toBe('not-installed')
    const storage = await page.evaluate(() => window.sunrin.getStorageInfo())
    expect(storage.installedBytes).toBe(0)
    expect(storage.requiredBytes).toBeGreaterThan(storage.downloadBytes)
    expect(storage.freeBytes).toBeGreaterThan(0)
    await page.evaluate(() => window.sunrin.primaryAction())
    expect((await page.evaluate(() => window.sunrin.getState())).phase).toBe('not-installed')
    const install = await app.evaluate(() => global.fixtureDialogs.find(value => value.title === '선린밸리 설치 용량'))
    expect(install.detail).toContain('예상 다운로드')
    expect(install.detail).toContain('필요한 추가 여유 공간')
    await expect(readFile(join(profile, 'game/.sunrin-valley.json'))).rejects.toMatchObject({code:'ENOENT'})
    // Close while a real primary-action task is waiting for remote metadata.
    // The window must disappear immediately, while its main process keeps the
    // task alive and a reopened window can display the same progress.
    await app.evaluate(() => { global.fixtureHoldFetch = true })
    await page.evaluate(() => { void window.sunrin.primaryAction().catch(() => {}) })
    await expect.poll(() => app.evaluate(() => global.fixtureFetchPending)).toBe(true)
    const child = app.process()
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close())
    await expect.poll(() => app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length), {timeout:2000}).toBe(0)
    expect(child.exitCode).toBe(null)
    expect(await app.evaluate(() => global.fixtureDialogs.some(value => value.title === '선린밸리 준비 중'))).toBe(false)
    const reopened = app.waitForEvent('window')
    await app.evaluate(({app}) => app.emit('activate'))
    let resumed = await reopened
    await expect.poll(() => resumed.evaluate(() => window.sunrin.getState().then(value => value.phase))).toBe('checking')
    // Cmd+Q/menu Quit must also close without interrupting the same busy task.
    await app.evaluate(({app}) => app.quit())
    expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(0)
    expect(child.exitCode).toBe(null)
    const reopenedAfterQuit = app.waitForEvent('window')
    await app.evaluate(({app}) => app.emit('activate'))
    resumed = await reopenedAfterQuit
    await expect.poll(() => resumed.evaluate(() => window.sunrin.getState().then(value => value.phase))).toBe('checking')
    await app.evaluate(() => global.releaseFixtureFetch())
    await expect.poll(() => resumed.evaluate(() => window.sunrin.getState().then(value => value.phase))).toBe('not-installed')
    await expect(readFile(join(profile, 'game/.sunrin-valley.json'))).rejects.toMatchObject({code:'ENOENT'})
    const exited = app.waitForEvent('close')
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close()).catch(() => {})
    await exited
    await expect.poll(() => child.exitCode).toBe(0)
    app = undefined
    console.log('PASS: immediate close without confirmation; busy task survives and reopens at same stage; idle close exits cleanly; diagnostics and install cancellation preserve data')
  } finally {
    if (app) await app.evaluate(({app}) => app.exit(0)).catch(() => {})
    await rm(root, {recursive:true, force:true})
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
