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
    // Transformed Chromium bounds can differ by a few floating-point ulps.
    expect(Math.abs(current.button.width - before.button.width), `button width changes on ${name}`).toBeLessThan(0.1)
    expect(Math.abs(current.button.height - before.button.height), `button height changes on ${name}`).toBeLessThan(0.1)
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
    let failures = {}
    const listeners = new Set()
    ipcRenderer.on('fixture:set-state', (_, next) => { state = next; for (const listener of listeners) listener(next) })
    ipcRenderer.on('fixture:set-failures', (_, next) => { failures = next })
    const forbidden = () => Promise.reject(new Error('Desktop side effects are forbidden in renderer smoke tests'))
    contextBridge.exposeInMainWorld('sunrin', {
      getState: () => Promise.resolve(state),
      primaryAction: () => failures.primaryAction ? Promise.reject(new Error(failures.primaryAction)) : Promise.resolve(),
      saveSettings: async settings => {
        if (failures.saveSettings) throw new Error(failures.saveSettings)
        state = { ...state, settings }; for (const listener of listeners) listener(state)
      },
      chooseDirectory: forbidden, openPrism: forbidden,
      repair: forbidden, openLogs: forbidden, openInstance: forbidden,
      checkLauncherUpdate: forbidden, applyLauncherUpdate: forbidden,
      getStorageInfo: () => Promise.resolve({installedBytes: 3221225472, freeBytes: 107374182400, requiredBytes: 17179869184, downloadBytes: 4294967296, estimatedInstalledBytes: 10737418240, sufficient: true}),
      copyDiagnostics: () => failures.diagnostics ? Promise.reject(new Error(failures.diagnostics)) : ipcRenderer.invoke('fixture:copy'),
      saveDiagnostics: () => failures.diagnostics ? Promise.reject(new Error(failures.diagnostics)) : ipcRenderer.invoke('fixture:save'),
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener) }
    })
  `)
  await writeFile(entry, `
    const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
    app.setPath('userData', process.env.SUNRIN_APP_DATA)
    app.whenReady().then(() => {
      ipcMain.handle('fixture:copy', () => clipboard.writeText('Sanitized diagnostic fixture'));
      ipcMain.handle('fixture:save', () => require('node:fs').writeFileSync(${JSON.stringify(join(fixtureRoot, 'diagnostic.txt'))}, 'Sanitized diagnostic fixture') || true);
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
    await expect(page.getByRole('button', { name: '게임 실행', exact: true })).toBeEnabled()
    await capture('ready')
    if (!process.argv.includes('--status-only') && !process.argv.includes('--notices-only')) {
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
      async function setFailures(failures) {
        await app.evaluate(({ BrowserWindow }, next) => BrowserWindow.getAllWindows()[0].webContents.send('fixture:set-failures', next), failures)
      }
      if (!process.argv.includes('--notices-only')) {
        await setState({ ...ready, serverStatus: { state: 'online', activeVersion: '0.1.2', message: '서버 운영 중' } })
        await expect(page.locator('.server-status')).toContainText('서버 운영 중')
        await expect(page.locator('.server-status')).toContainText('0.1.2')
        await expect(page.getByRole('button', { name: '게임 실행', exact: true })).toBeEnabled()
        await setState({ ...ready, phase: 'maintenance', serverStatus: { state: 'maintenance', activeVersion: '0.1.2', targetVersion: '0.1.3', message: '안전한 업데이트를 위해 서버를 점검하고 있어요.' } })
        await expect(page.getByRole('button', { name: '서버 점검 중', exact: true })).toBeDisabled()
        await expect(page.locator('.server-status')).toContainText('서버를 점검')
        await capture('maintenance')
        // Settings remains available during maintenance.
        await page.getByRole('button', { name: '설정 열기' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await setState({ ...ready, serverStatus: { state: 'scheduled', activeVersion: '0.1.2', targetVersion: '0.1.3', startsAt: '2026-10-27T09:00:00+09:00', message: '서버 업데이트 예정' }, changes: ['새로운 마을 아이템을 추가했어요.', '접속 안정성을 개선했어요.'] })
        await expect(page.getByRole('button', { name: '게임 실행', exact: true })).toBeEnabled()
        await expect(page.locator('.server-status')).toContainText('서버 업데이트 예정')
        await expect(page.locator('.server-status')).toContainText('0.1.3')
        await expect(page.locator('.server-status time')).toHaveAttribute('datetime', '2026-10-27T09:00:00+09:00')
        const changes = page.getByRole('button', { name: '업데이트 변경 내역', exact: true })
        const changesDialog = page.getByRole('dialog', { name: '업데이트 변경 내역', exact: true })
        await expect(changes).toBeVisible()
        await expect(changesDialog).toHaveCount(0)
        await expect(page.locator('.status')).not.toContainText('새로운 마을 아이템을 추가했어요.')
        await changes.click()
        await expect(changesDialog).toBeVisible()
        await expect(changesDialog).toHaveAttribute('aria-modal', 'true')
        await expect(changesDialog.getByText('새로운 마을 아이템을 추가했어요.', { exact: true })).toBeVisible()
        await expect(changesDialog.getByText('접속 안정성을 개선했어요.', { exact: true })).toBeVisible()
        await expect(page.locator('.status')).not.toContainText('접속 안정성을 개선했어요.')
        await capture('scheduled')
        await page.keyboard.press('Escape')
        await expect(changesDialog).toHaveCount(0)
        await expect(changes).toBeFocused()
        await changes.click()
        await changesDialog.getByRole('button', { name: /닫기/ }).first().click()
        await expect(changesDialog).toHaveCount(0)
        await expect(changes).toBeFocused()
        await changes.click()
        await page.mouse.click(5, 5)
        await expect(changesDialog).toHaveCount(0)
        await expect(changes).toBeFocused()
        const launcherUpdate = { status: 'available', version: '1.1.1', changes: ['GitHub에서 받은 런처 변경 내역이에요.'], message: '런처 1.1.1 업데이트가 있어요.' }
        await setState({ ...ready, launcherVersion: '1.1.0', launcherUpdate })
        await changes.click()
        await expect(changesDialog.getByRole('heading', { name: '런처 1.1.1', exact: true })).toBeVisible()
        await expect(changesDialog.getByText('GitHub에서 받은 런처 변경 내역이에요.', { exact: true })).toBeVisible()
        await expect(page.locator('.status')).not.toContainText('GitHub에서 받은 런처 변경 내역이에요.')
        await setState({ ...ready, launcherVersion: '1.1.0', launcherUpdate, availableVersion: '0.1.3', changes: ['모드팩 변경도 함께 보여요.'] })
        await expect(changesDialog.getByRole('heading', { name: '모드팩 0.1.3', exact: true })).toBeVisible()
        await expect(changesDialog.getByText('GitHub에서 받은 런처 변경 내역이에요.', { exact: true })).toBeVisible()
        await expect(changesDialog.getByText('모드팩 변경도 함께 보여요.', { exact: true })).toBeVisible()
        await capture('launcher-and-pack-changes')
        await page.keyboard.press('Escape')
        await expect(changes).toBeFocused()
        await page.setViewportSize({ width: 768, height: 568 })
        const longChanges = ['새로운 마을 아이템을 추가했어요.', ...Array.from({ length: 30 }, (_, index) => `업데이트 항목 ${index + 1}: 작은 창에서도 변경 내용을 끝까지 확인할 수 있어요.`), '마지막 변경 내역을 확인했어요.']
        await setState({ ...ready, changes: longChanges })
        await changes.click()
        const modalBounds = await changesDialog.evaluate(dialog => {
          const body = dialog.querySelector('.dialog-body')
          const bounds = dialog.getBoundingClientRect()
          return { top: bounds.top, bottom: bounds.bottom, viewport: innerHeight, height: body.clientHeight, contentHeight: body.scrollHeight, overflow: getComputedStyle(body).overflowY }
        })
        expect(modalBounds.top, 'changes popup must fit inside the smallest window').toBeGreaterThanOrEqual(0)
        expect(modalBounds.bottom, 'changes popup must fit inside the smallest window').toBeLessThanOrEqual(modalBounds.viewport)
        expect(modalBounds.contentHeight, 'long changes should scroll inside their popup').toBeGreaterThan(modalBounds.height)
        expect(['auto', 'scroll']).toContain(modalBounds.overflow)
        await changesDialog.getByText('마지막 변경 내역을 확인했어요.', { exact: true }).scrollIntoViewIfNeeded()
        await expect(changesDialog.getByText('마지막 변경 내역을 확인했어요.', { exact: true })).toBeInViewport({ ratio: 1 })
        await capture('compact-changes')
        await page.keyboard.press('Escape')
        await expect(changes).toBeFocused()
        const statusBounds = await page.evaluate(() => ({
          statusBottom: document.querySelector('.status').getBoundingClientRect().bottom,
          footerTop: document.querySelector('.footer').getBoundingClientRect().top
        }))
        console.log(JSON.stringify({ compactStatus: statusBounds }))
        expect(statusBounds.statusBottom, 'the status must remain above the footer on the smallest window').toBeLessThanOrEqual(statusBounds.footerTop)
        await setState({ ...ready, message: '업데이트가 준비되었어요. 게임을 시작하면 최신 마을 파일을 확인해요.', updateMessage: '새 버전을 설치하기 전에 현재 구성을 안전하게 확인하고 있어요.', serverStatus: { state: 'online', activeVersion: '0.1.2', message: '서버 운영 중' }, changes: ['새로운 마을 아이템을 추가했어요.'] })
        const crowdedStatus = await page.evaluate(() => ({ statusBottom: document.querySelector('.status').getBoundingClientRect().bottom, footerTop: document.querySelector('.footer').getBoundingClientRect().top }))
        expect(crowdedStatus.statusBottom, 'server and update messages must remain above the compact footer').toBeLessThanOrEqual(crowdedStatus.footerTop)
        await setState({ ...ready, launcherVersion: '1.0.0', availableVersion: '0.1.3', serverStatus: {state: 'online', activeVersion: '0.1.3', message: '서버 운영 중'} })
        await page.getByRole('button', {name: '설정 열기'}).click()
        await expect(page.locator('.version-info')).toContainText('1.0.0')
        await expect(page.locator('.version-info')).toContainText('0.1.3')
        await expect(page.locator('.storage-info')).toContainText('3.0 GB')
        await page.keyboard.press('Escape')
        await setState({ ...ready, phase: 'update' })
        await expect(page.getByRole('button', {name: '업데이트가 있습니다', exact: true})).toBeEnabled()
        await setState(ready)
        await expect(changes).toHaveCount(0)
        await expect(page.locator('.server-status')).toHaveCount(0)
        console.log('PASS: ready, maintenance and scheduled server states render safely; changes use a bounded popup with dismissal and focus return')
      }

      // Freeze only the browser clock: React and CSS stay real, desktop successes stay isolated.
      // This catches persistent success notices, missing fades, and stale timers after repeats.
      const clockStart = new Date('2026-10-25T00:00:00Z')
      await page.clock.install({ time: clockStart })
      await page.clock.pauseAt(new Date(clockStart.getTime() + 1000))
      const toast = page.locator('.toast')
      async function expectToast(message) {
        await expect(toast).toBeVisible()
        await expect(toast).toHaveAttribute('role', 'status')
        await expect(toast).toContainText(message)
        await expect(toast).not.toHaveClass(/toast-leaving/)
      }
      async function expireToast() {
        await page.clock.runFor(1900)
        await expect(toast).toBeVisible()
        await expect(toast).not.toHaveClass(/toast-leaving/)
        await page.clock.runFor(110)
        await expect(toast).toHaveClass(/toast-leaving/)
        await page.clock.runFor(200)
        await expect(toast).toHaveCount(0)
      }
      await page.setViewportSize({ width: 768, height: 568 })
      await setFailures({ primaryAction: '실행 오류는 다시 시도할 때까지 보여야 해요.' })
      await page.getByRole('button', { name: '게임 실행', exact: true }).click()
      await expect(page.locator('.status')).toContainText('실행 오류는 다시 시도할 때까지 보여야 해요.')
      await page.clock.runFor(3000)
      await expect(page.locator('.status')).toContainText('실행 오류는 다시 시도할 때까지 보여야 해요.')
      await page.getByRole('button', { name: '설정 열기' }).click()
      const settings = page.getByRole('dialog', { name: '내 마을 설정', exact: true })
      await settings.locator('#data-path').fill(join(fixtureRoot, 'saved-settings'))
      await setFailures({ saveSettings: '설정을 저장하지 못했어요. 다시 시도해 주세요.' })
      await settings.getByRole('button', { name: '저장하고 닫기', exact: true }).click()
      await expect(settings.getByRole('alert')).toHaveText('설정을 저장하지 못했어요. 다시 시도해 주세요.')
      await page.clock.runFor(3000)
      await expect(settings.getByRole('alert')).toBeVisible()
      await expect(toast).toHaveCount(0)
      await setFailures({})
      await settings.getByRole('button', { name: '저장하고 닫기', exact: true }).click()
      await expect(settings).toHaveCount(0)
      await expectToast('설정을 저장했어요.')
      await expect(page.locator('.status')).toContainText('실행 오류는 다시 시도할 때까지 보여야 해요.')
      await expect(page.locator('.status')).not.toContainText('설정을 저장했어요.')
      await capture('settings-saved-toast')
      await expireToast()
      await expect(page.locator('.status')).toContainText('실행 오류는 다시 시도할 때까지 보여야 해요.')
      await page.getByRole('button', { name: '게임 실행', exact: true }).click()
      await expect(page.locator('.status')).toContainText(ready.message)
      await page.getByRole('button', { name: '설정 열기' }).click()
      await expect(settings.locator('#data-path')).toHaveValue(join(fixtureRoot, 'saved-settings'))
      await settings.getByRole('button', { name: '오류 정보 복사', exact: true }).click()
      await expectToast('오류 정보를 복사했어요.')
      await expireToast()
      await settings.getByRole('button', { name: '진단 파일 저장', exact: true }).click()
      await expectToast('진단 파일을 저장했어요.')
      await expireToast()
      await page.keyboard.press('Escape')
      await page.clock.runFor(20)
      await setState({ ...ready, phase: 'error', diagnostic: { id: 'fixture-error', createdAt: '2026-10-25T00:00:00Z', summary: '다운로드를 완료하지 못했어요.', details: 'Sanitized diagnostic fixture' } })
      const diagnostic = page.getByRole('dialog', {name: '작업을 마치지 못했어요'})
      await expect(diagnostic).toBeVisible()
      await page.getByText('상세 정보', {exact: true}).click()
      await expect(page.locator('.diagnostic-details pre')).toHaveText('Sanitized diagnostic fixture')
      await setFailures({ diagnostics: 'fixture diagnostics failure' })
      await diagnostic.getByRole('button', {name: '오류 정보 복사', exact: true}).click()
      const diagnosticError = diagnostic.getByText(/처리하지 못했어요/)
      await expect(diagnosticError).toBeVisible()
      await page.clock.runFor(3000)
      await expect(diagnosticError).toBeVisible()
      await expect(toast).toHaveCount(0)
      await setFailures({})
      await diagnostic.getByRole('button', {name: '오류 정보 복사', exact: true}).click()
      expect(await app.evaluate(({clipboard}) => clipboard.readText())).toBe('Sanitized diagnostic fixture')
      await expect(diagnosticError).toHaveCount(0)
      await expectToast('오류 정보를 복사했어요.')
      await page.clock.runFor(1500)
      await diagnostic.getByRole('button', {name: '오류 정보 복사', exact: true}).click()
      // The repeated text cannot signal completion; wait for the clipboard action to finish.
      await expect(diagnostic.getByRole('button', {name: '오류 정보 복사', exact: true})).toBeEnabled()
      await page.clock.runFor(1000)
      await expectToast('오류 정보를 복사했어요.')
      await page.clock.runFor(1010)
      await expect(toast).toHaveClass(/toast-leaving/)
      // A new success during the fade must cancel the previous removal timer.
      await diagnostic.getByRole('button', {name: '진단 파일 저장', exact: true}).click()
      expect(await require('node:fs/promises').readFile(join(fixtureRoot, 'diagnostic.txt'), 'utf8')).toBe('Sanitized diagnostic fixture')
      await expectToast('진단 파일을 저장했어요.')
      await expect(page.locator('.status')).toContainText(ready.message)
      await expect(page.locator('.status')).not.toContainText('진단 파일을 저장했어요.')
      await capture('diagnostics')
      await expireToast()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await setState(ready)
      await expect(page.getByRole('button', { name: '업데이트 변경 내역', exact: true })).toHaveCount(0)
      await expect(page.locator('.server-status')).toHaveCount(0)
      console.log('PASS: settings and diagnostic successes show shared 2-second toasts with quick removal and reset timers; failures remain until retry')
    }
    expect(errors).toEqual([])
  } finally {
    if (app) await app.close()
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
