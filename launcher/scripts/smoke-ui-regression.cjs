const { _electron: electron, expect } = require('@playwright/test')
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

// Run the built renderer in Electron, with no installer, account or engine side effects.
// The fixture replaces only the desktop boundary; React, CSS and browser input are real.
const ready = {
  phase: 'ready', message: '게임을 시작할 준비가 되었어요.', progress: null,
  installedVersion: '0.1.2',
  settings: { dataPath: '', memoryMb: 12288, minecraftPath: '', importOptions: true, shareShaders: false }
}

async function geometry(page) {
  return page.locator('.primary-action').evaluate(button => {
    const arrow = button.querySelector('.button-arrow')
    const icon = arrow.querySelector('svg')
    const bounds = button.getBoundingClientRect()
    const child = arrow.getBoundingClientRect()
    const svg = icon.getBoundingClientRect()
    return {
      button: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      arrow: { x: child.x, y: child.y, width: child.width, height: child.height },
      relative: { x: child.x - bounds.x, y: child.y - bounds.y, right: bounds.right - child.right },
      svg: { width: svg.width, height: svg.height },
      position: getComputedStyle(button).position,
      transform: getComputedStyle(button).transform
    }
  })
}

async function arrowRemainsAnchored(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.mouse.move(10, 100)
  await page.waitForTimeout(200) // Finish the existing 160 ms CSS transition.
  const before = await geometry(page)
  const button = page.locator('.primary-action')
  await button.hover()
  await page.waitForTimeout(200)
  const hovered = await geometry(page)
  await page.mouse.down()
  await page.waitForTimeout(200)
  const pressed = await geometry(page)
  // Release outside the button so a geometry check cannot start any desktop action.
  await page.mouse.move(10, 100)
  await page.mouse.up()
  await button.click()
  await expect(button).toBeEnabled()
  const clicked = await geometry(page)
  console.log(JSON.stringify({ viewport: { width, height }, before, hovered, pressed, clicked }))
  for (const [name, current] of [['hover', hovered], ['press', pressed], ['click', clicked]]) {
    expect(Math.abs(current.relative.x - before.relative.x), `arrow horizontal position changes on ${name} at ${width}×${height}`).toBeLessThan(1)
    expect(Math.abs(current.relative.y - before.relative.y), `arrow vertical position changes on ${name} at ${width}×${height}`).toBeLessThan(1)
    expect(current.button.width).toBe(before.button.width)
    expect(current.button.height).toBe(before.button.height)
    expect(current.svg.width).toBe(19)
    expect(current.svg.height).toBe(19)
    expect(current.relative.right).toBeGreaterThanOrEqual(12)
    expect(current.relative.right).toBeLessThanOrEqual(28)
  }
}

;(async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'sunrin-ui-'))
  const profile = join(fixtureRoot, 'profile')
  await mkdir(profile)
  const preload = join(fixtureRoot, 'preload.cjs')
  const entry = join(fixtureRoot, 'main.cjs')
  await writeFile(preload, `
    const { contextBridge, ipcRenderer } = require('electron')
    let state = ${JSON.stringify(ready)}
    const listeners = new Set()
    ipcRenderer.on('fixture:set-state', (_, next) => { state = next; for (const listener of listeners) listener(next) })
    const forbidden = () => Promise.reject(new Error('Desktop side effects are forbidden in renderer smoke tests'))
    contextBridge.exposeInMainWorld('sunrin', {
      getState: () => Promise.resolve(state), primaryAction: () => Promise.resolve(),
      saveSettings: forbidden, chooseDirectory: forbidden, openPrism: forbidden,
      repair: forbidden, openLogs: forbidden, openInstance: forbidden,
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener) }
    })
  `)
  await writeFile(entry, `
    const { app, BrowserWindow } = require('electron')
    app.setPath('userData', process.env.SUNRIN_APP_DATA)
    app.whenReady().then(() => {
      const window = new BrowserWindow({ width: 1040, height: 740, minWidth: 768, minHeight: 600,
        webPreferences: { preload: ${JSON.stringify(preload)}, contextIsolation: true, nodeIntegration: false, sandbox: true } })
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      window.loadFile(${JSON.stringify(resolve(__dirname, '../out/renderer/index.html'))})
    })
    app.on('window-all-closed', () => app.quit())
  `)
  let app
  try {
    app = await electron.launch({ args: [entry], env: { ...process.env, SUNRIN_APP_DATA: profile } })
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    async function capture(name) {
      if (!process.argv.includes('--screenshots')) return
      const folder = resolve(__dirname, '../../.work/ui-regression')
      await mkdir(folder, { recursive: true })
      await page.screenshot({ path: join(folder, `${name}.png`) })
    }
    await expect(page.getByRole('button', { name: '게임 시작', exact: true })).toBeEnabled()
    await capture('ready')
    if (!process.argv.includes('--status-only')) {
      for (const [width, height] of [[1040, 708], [1040, 568], [768, 708], [768, 568]]) {
        await arrowRemainsAnchored(page, width, height)
      }
      console.log('PASS: primary arrow stays anchored during real hover and mouse press at all supported sizes')
    }
    if (!process.argv.includes('--arrow-only')) {
      await page.setViewportSize({ width: 1040, height: 708 })
      async function setState(state) {
        await app.evaluate(({ BrowserWindow }, next) => BrowserWindow.getAllWindows()[0].webContents.send('fixture:set-state', next), state)
      }
      await setState({ ...ready, serverStatus: { state: 'online', activeVersion: '0.1.2', message: '서버 운영 중' } })
      await expect(page.locator('.server-status')).toContainText('서버 운영 중')
      await expect(page.locator('.server-status')).toContainText('0.1.2')
      await expect(page.getByRole('button', { name: '게임 시작', exact: true })).toBeEnabled()
      await setState({ ...ready, phase: 'maintenance', serverStatus: { state: 'maintenance', activeVersion: '0.1.2', targetVersion: '0.1.3', message: '안전한 업데이트를 위해 서버를 점검하고 있어요.' } })
      await expect(page.getByRole('button', { name: '서버 점검 중', exact: true })).toBeDisabled()
      await expect(page.locator('.server-status')).toContainText('서버를 점검')
      await capture('maintenance')
      // Settings remains available during maintenance.
      await page.getByRole('button', { name: '설정 열기' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await setState({ ...ready, serverStatus: { state: 'scheduled', activeVersion: '0.1.2', targetVersion: '0.1.3', startsAt: '2026-10-27T09:00:00+09:00', message: '서버 업데이트 예정' }, changes: ['새로운 마을 아이템을 추가했어요.', '접속 안정성을 개선했어요.'] })
      await expect(page.getByRole('button', { name: '게임 시작', exact: true })).toBeEnabled()
      await expect(page.locator('.server-status')).toContainText('서버 업데이트 예정')
      await expect(page.locator('.server-status')).toContainText('0.1.3')
      await expect(page.locator('.server-status time')).toHaveAttribute('datetime', '2026-10-27T09:00:00+09:00')
      const changes = page.locator('.update-changes')
      await expect(changes).not.toHaveAttribute('open', '')
      await expect(page.getByText('새로운 마을 아이템을 추가했어요.', { exact: true })).toBeHidden()
      await changes.locator('summary').click()
      await expect(page.getByText('새로운 마을 아이템을 추가했어요.', { exact: true })).toBeVisible()
      await expect(page.getByText('접속 안정성을 개선했어요.', { exact: true })).toBeVisible()
      await capture('scheduled')
      await page.setViewportSize({ width: 768, height: 568 })
      const statusBounds = await page.evaluate(() => ({
        changesBottom: document.querySelector('.status').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.footer').getBoundingClientRect().top
      }))
      console.log(JSON.stringify({ compactStatus: statusBounds }))
      expect(statusBounds.changesBottom, 'expanded changes must remain above the footer on the smallest window').toBeLessThanOrEqual(statusBounds.footerTop)
      await page.locator('.status').evaluate(element => { element.scrollTop = element.scrollHeight })
      await expect(page.getByText('접속 안정성을 개선했어요.', { exact: true })).toBeInViewport({ ratio: 1 })
      await capture('compact-changes')
      await setState({ ...ready, message: '업데이트가 준비되었어요. 게임을 시작하면 최신 마을 파일을 확인해요.', updateMessage: '새 버전을 설치하기 전에 현재 구성을 안전하게 확인하고 있어요.', serverStatus: { state: 'online', activeVersion: '0.1.2', message: '서버 운영 중' }, changes: ['새로운 마을 아이템을 추가했어요.'] })
      const crowdedStatus = await page.evaluate(() => ({ statusBottom: document.querySelector('.status').getBoundingClientRect().bottom, footerTop: document.querySelector('.footer').getBoundingClientRect().top }))
      expect(crowdedStatus.statusBottom, 'server and update messages must remain above the compact footer').toBeLessThanOrEqual(crowdedStatus.footerTop)
      await setState(ready)
      await expect(changes).toHaveCount(0)
      await expect(page.locator('.server-status')).toHaveCount(0)
      console.log('PASS: ready, maintenance and scheduled server states render safely; changes start collapsed; settings stays available')
    }
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
