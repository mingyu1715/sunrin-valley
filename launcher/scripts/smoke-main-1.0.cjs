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
    global.fetch = async () => { await new Promise(resolve => { global.releaseFixtureFetch = resolve }); return new Response('', {status: 503}) }
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
    await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close())
    expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1)
    const notice = await app.evaluate(() => global.fixtureDialogs.find(value => value.title === '선린밸리 준비 중'))
    expect(notice.buttons).toEqual(['계속 보기', '창만 닫기'])
    await app.evaluate(() => global.releaseFixtureFetch())
    await expect.poll(() => page.evaluate(() => window.sunrin.getState().then(value => value.phase))).toBe('not-installed')
    const storage = await page.evaluate(() => window.sunrin.getStorageInfo())
    expect(storage.installedBytes).toBe(0)
    expect(storage.requiredBytes).toBeGreaterThan(storage.downloadBytes)
    expect(storage.freeBytes).toBeGreaterThan(0)
    // A second remote check uses a deliberate failing response without a delay.
    await app.evaluate(() => { global.fetch = async () => new Response('', {status:503}) })
    await page.evaluate(() => window.sunrin.primaryAction())
    expect((await page.evaluate(() => window.sunrin.getState())).phase).toBe('not-installed')
    const install = await app.evaluate(() => global.fixtureDialogs.find(value => value.title === '선린밸리 설치 용량'))
    expect(install.detail).toContain('예상 다운로드')
    expect(install.detail).toContain('필요한 추가 여유 공간')
    await expect(readFile(join(profile, 'game/.sunrin-valley.json'))).rejects.toMatchObject({code:'ENOENT'})
    console.log('PASS: production IPC copies and saves identical diagnostic bytes; close cancellation preserves window; storage estimate and install cancellation make no game changes')
  } finally {
    if (app) await app.close()
    await rm(root, {recursive:true, force:true})
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
