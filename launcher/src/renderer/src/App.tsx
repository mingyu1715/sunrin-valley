import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DiagnosticReport, LauncherState, MemoryRecommendation, Settings, StorageInfo } from '../../shared'
import Valley from './Valley'

const previewState: LauncherState = {
  phase: 'not-installed', message: '우리의 작은 마을에서, 새로운 하루를 시작해요.', progress: null,
  settings: { dataPath: '', memoryMb: 12288, minecraftPath: '', importOptions: true, shareShaders: false }
}

function Icon({ name, size = 20 }: { name: 'settings' | 'play' | 'download' | 'close' | 'folder' | 'arrow' | 'leaf'; size?: number }) {
  const paths: Record<typeof name, ReactNode> = {
    settings: <><path d="m9 3 .6-2h4.8l.6 2 2 1.2 2-.5 2.4 4.2-1.4 1.5v2.3l1.4 1.5-2.4 4.2-2-.5-2 1.2-.6 2H9l-.6-2-2-1.2-2 .5L2 13.5 3.4 12V9.7L2 8.2 4.4 4l2 .5L9 3Z" transform="translate(0 1)" /><circle cx="11.5" cy="11.8" r="3.2" /></>,
    play: <path d="m8 4 12 8-12 8z" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    folder: <path d="M3 7V4h6l3 3h9v13H3V7Z" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    leaf: <><path d="M19 4c-8-1-15 2-14 8 0 4 4 6 7 4 4-2 5-6 7-12Z" /><path d="M5 21c0-7 4-10 9-13" /></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function App() {
  const api = window.sunrin
  const [state, setState] = useState<LauncherState>(api ? { ...previewState, phase: 'checking', message: '마을로 가는 길을 준비하고 있어요.' } : previewState)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorOpen, setErrorOpen] = useState(false)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const working = ['checking', 'installing', 'launching', 'authenticating', 'preparing', 'running'].includes(state.phase)
  const maintenance = state.phase === 'maintenance'
  const actionLabel = { checking: pending ? '업데이트 확인 중…' : '준비하는 중', 'not-installed': '게임 설치', ready: '게임 실행', update: '업데이트가 있습니다', 'launcher-update': '런처 업데이트', repair: '복구', maintenance: '서버 점검 중', installing: '준비하는 중', launching: '준비하는 중', authenticating: '준비하는 중', preparing: '준비하는 중', running: '게임 실행 중', error: '복구' }[state.phase]
  const launchStep = state.phase === 'authenticating' ? 0 : ['preparing', 'launching'].includes(state.phase) ? 1 : state.phase === 'running' ? 2 : -1
  const startsAt = state.serverStatus?.startsAt ? new Date(state.serverStatus.startsAt) : undefined
  useEffect(() => {
    if (state.diagnostic) { setSettingsOpen(false); setErrorOpen(true) }
  }, [state.diagnostic?.id])

  useEffect(() => {
    if (!api) return
    let active = true
    const unsubscribe = api.onState((next) => { if (active) setState(next) })
    api.getState().then((next) => { if (active) setState(next) }).catch((error: unknown) => {
      if (active) setState((old) => ({ ...old, phase: 'error', message: error instanceof Error ? error.message : '준비 상태를 확인하지 못했어요. 다시 시도해 주세요.' }))
    })
    return () => { active = false; unsubscribe() }
  }, [api])

  async function primaryAction() {
    if (!api || pending || working || maintenance) return
    setPending(true); setNotice('')
    try { await api.primaryAction() }
    catch (error) { setNotice(error instanceof Error ? error.message : '작업을 마치지 못했어요. 잠시 후 다시 시도해 주세요.') }
    finally { setPending(false) }
  }

  const closeSettings = useCallback(() => { setSettingsOpen(false); requestAnimationFrame(() => settingsButton.current?.focus()) }, [])

  return <main className="launcher">
    <Valley />
    <div className="scene-shade" />
    <header className="topbar">
      <div className="brand"><span className="brand-icon"><Icon name="leaf" size={21} /></span><span>SUNRIN VALLEY</span><span className="brand-divider" /><span className="brand-caption">우리만의 작은 마을</span></div>
      <button className="settings-toggle" ref={settingsButton} onClick={() => setSettingsOpen(true)} aria-label="설정 열기"><Icon name="settings" size={18} /><span>설정</span></button>
    </header>

    <section className="welcome" aria-labelledby="valley-title">
      <div className="eyebrow"><span />함께 가꾸는, 우리의 이야기<span /></div>
      <h1 id="valley-title">선린밸리<span className="title-sprout" aria-hidden="true"><i /><i /></span></h1>
      <p className="english-title">Sunrin Valley</p>
      <p className="welcome-copy">조금 느리게, 조금 더 다정하게.<br />친구들과 함께하는 새로운 일상.</p>
    </section>

    <section className="action-area" aria-label="설치 및 게임 실행">
      <div className="action-caption"><span className="tiny-spark" aria-hidden="true">✦</span>{state.phase === 'ready' ? '어서 와요. 마을이 기다리고 있어요.' : '작은 모험의 시작, 여기에서.'}</div>
      <button className={`primary-action ${working || pending ? 'busy' : ''}`} disabled={!api || working || pending || maintenance} onClick={primaryAction}>
        {(working || pending) && state.phase !== 'running' ? <span className="spinner" /> : <Icon name={state.phase === 'ready' || state.phase === 'running' ? 'play' : 'download'} size={22} />}
        <span>{actionLabel}</span>
        {!working && !pending && <span className="button-arrow"><Icon name="arrow" size={19} /></span>}
      </button>
      <div className="status" role="status" aria-live="polite">
        <p className={notice || state.phase === 'error' ? 'status-error' : ''}>{notice || (api ? state.message : '화면 미리보기 · 설치와 실행은 데스크톱 앱에서')}</p>
        {state.diagnostic && state.phase === 'error' && <button className="diagnostic-link" onClick={() => setErrorOpen(true)}>오류 상세 · 공유</button>}
        {state.updateMessage && <p className="update-note">{state.updateMessage}</p>}
        {(state.serverStatus || !!state.changes?.length) && <div className="server-updates">
          {state.serverStatus && <p className="server-status">{state.serverStatus.message}{state.serverStatus.activeVersion && <> · 운영 {state.serverStatus.activeVersion}</>}{state.serverStatus.targetVersion && <> · 예정 {state.serverStatus.targetVersion}</>}{startsAt && !Number.isNaN(startsAt.getTime()) && <> · <time dateTime={state.serverStatus.startsAt}>{startsAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></>}</p>}
          {!!state.changes?.length && <details className="update-changes"><summary>업데이트 변경 내역</summary><ul>{state.changes.map((change, index) => <li key={index}>{change}</li>)}</ul></details>}
        </div>}
        {launchStep >= 0 && <ol className="launch-steps" aria-label="게임 실행 단계">{['로그인 확인', '게임 준비', '게임 실행'].map((label, index) => <li key={label} className={index === launchStep ? 'current' : index < launchStep ? 'complete' : ''} aria-current={index === launchStep ? 'step' : undefined}><span aria-hidden="true" />{label}</li>)}</ol>}
        {state.progress !== null && working && <div className="progress-track" role="progressbar" aria-label="준비 진행률" aria-valuenow={Math.round(state.progress)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${Math.max(0, Math.min(100, state.progress))}%` }} /><span>{Math.round(state.progress)}%</span></div>}
      </div>
    </section>

    <footer className="footer"><span className="footer-note"><span className="status-dot" />{state.installedVersion ? `마을 버전 ${state.installedVersion}` : '새로운 이야기를 만날 준비'}</span><span>선린밸리 런처 <span className="footer-version">v{state.launcherVersion ?? '1.0.0'}</span></span></footer>
    {settingsOpen && <SettingsDialog initial={state.settings} state={state} advice={state.memoryRecommendation} api={api} working={working || pending || state.phase === 'launcher-update'} allowPrism={!['checking', 'installing'].includes(state.phase) && !pending} onClose={closeSettings} onNotice={setNotice} onErrorDetails={() => { setSettingsOpen(false); setErrorOpen(true) }} />}
    {errorOpen && state.diagnostic && <DiagnosticDialog report={state.diagnostic} api={api} onClose={() => setErrorOpen(false)} />}
  </main>
}

const formatBytes = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`

function SettingsDialog({ initial, state, advice, api, working, allowPrism, onClose, onNotice, onErrorDetails }: { initial: Settings; state: LauncherState; advice?: MemoryRecommendation; api: typeof window.sunrin; working: boolean; allowPrism: boolean; onClose: () => void; onNotice: (value: string) => void; onErrorDetails: () => void }) {
  const [settings, setSettings] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [storage, setStorage] = useState<StorageInfo>()
  const [storageError, setStorageError] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => ({ ...old, [key]: value }))
  useEffect(() => {
    if (!api) return
    let active = true
    api.getStorageInfo().then(value => { if (active) setStorage(value) }).catch(() => { if (active) setStorageError('용량을 확인하지 못했어요. 설치 폴더 접근 권한을 확인해 주세요.') })
    return () => { active = false }
  }, [api, initial.dataPath])

  useEffect(() => {
    field.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [onClose])

  async function perform(action: (() => Promise<unknown>) | undefined, success?: string) {
    if (!action) { setError('이 기능은 데스크톱 앱에서 사용할 수 있어요.'); return }
    if (busy) return
    setBusy(true); setError('')
    try { await action(); if (success) onNotice(success) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '작업을 마치지 못했어요. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-heading" ref={dialog}>
      <div className="dialog-heading"><div><span className="dialog-eyebrow">MAKE YOURSELF AT HOME</span><h2 id="settings-heading">내 마을 설정</h2></div><button className="icon-button" onClick={onClose} aria-label="설정 닫기"><Icon name="close" /></button></div>
      <div className="dialog-body">
        <section className="setting-section"><h3>게임 준비</h3>
          <label className="field-label" htmlFor="data-path">설치 위치</label>
          <div className="input-row"><input ref={field} id="data-path" value={settings.dataPath} onChange={(event) => change('dataPath', event.target.value)} placeholder="앱에서 설치 위치를 자동으로 정해요" disabled={busy || working} /><button className="secondary-button folder-button" aria-label="설치 폴더 선택" disabled={!api || busy || working} onClick={() => void perform(api ? async () => { const path = await api.chooseDirectory(); if (path) change('dataPath', path) } : undefined)}><Icon name="folder" size={17} /><span>변경</span></button></div>
          <p className="field-help">게임과 마을 파일을 보관할 폴더예요.</p>
          <div className="storage-info" aria-live="polite"><span>선린밸리 설치 용량</span><strong>{storage ? formatBytes(storage.installedBytes) : storageError || '계산 중…'}</strong>{storage && <small>모드·전용 실행 환경·캐시·월드 포함 · {initial.dataPath === settings.dataPath ? '현재 설치 위치 기준' : '저장 전 설치 위치 기준'}{storage.freeBytes !== null && ` · 여유 ${formatBytes(storage.freeBytes)}`}</small>}</div>
          <div className="slider-heading"><label className="field-label" htmlFor="memory">게임 메모리</label><output htmlFor="memory">{Math.round(settings.memoryMb / 1024 * 2) / 2} <span>GB</span></output></div>
          <input id="memory" className="memory-slider" type="range" min="2" max="16" step="0.5" value={settings.memoryMb / 1024} onChange={(event) => change('memoryMb', Number(event.target.value) * 1024)} disabled={busy || working} />
          <div className="range-labels"><span>2 GB</span><span>최소 8 GB · 권장 12 GB</span><span>16 GB</span></div>
          <div className="memory-presets">{[{ label: '최소 8 GB', value: 8192 }, { label: '권장 12 GB', value: 12288 }, ...(advice ? [{ label: `이 PC 추천 ${advice.recommendedMb / 1024} GB`, value: advice.recommendedMb }] : [])].map((preset, index) => <button key={index} className={settings.memoryMb === preset.value ? 'selected' : ''} aria-pressed={settings.memoryMb === preset.value} disabled={busy || working} onClick={() => change('memoryMb', preset.value)}>{preset.label}</button>)}</div>
          {advice && <p className="field-help">시스템 메모리 {Math.round(advice.totalMb / 1024)} GB · {advice.totalMb >= 24576 ? '권장 12 GB로 시작해요.' : advice.totalMb >= 16384 ? '운영체제 여유를 위해 8 GB를 추천해요.' : '최소 8 GB 할당에 여유가 부족해요. 시스템 메모리 16 GB 이상을 추천해요.'}</p>}
        </section>
        <section className="setting-section"><h3>익숙한 환경 그대로</h3><label className="field-label" htmlFor="minecraft-path">기존 마인크래프트 폴더 <span className="optional">선택</span></label><input id="minecraft-path" value={settings.minecraftPath} onChange={(event) => change('minecraftPath', event.target.value)} placeholder="기존 .minecraft 폴더 경로" disabled={busy || working} />
          <label className="checkbox-row"><input type="checkbox" checked={settings.importOptions} onChange={(event) => change('importOptions', event.target.checked)} disabled={busy || working} /><span>기존 키 설정과 게임 옵션 한 번 가져오기</span></label>
          <label className="checkbox-row"><input type="checkbox" checked={settings.shareShaders} onChange={(event) => change('shareShaders', event.target.checked)} disabled={busy || working} /><span>기존 셰이더 팩 함께 사용하기</span></label>
        </section>
        <section className="account-row"><div><h3>마인크래프트 계정</h3><p>게임 시작을 누르면 필요할 때 Microsoft 로그인 창이 열려요.</p></div></section>
        <section className="setting-section version-info"><h3>설치 버전</h3><dl><div><dt>런처</dt><dd>{state.launcherVersion ?? '1.0.0'}</dd></div><div><dt>설치된 모드팩</dt><dd>{state.installedVersion ?? '미설치'}</dd></div><div><dt>서버 운영 버전</dt><dd>{state.serverStatus?.activeVersion ?? '확인 전'}</dd></div><div><dt>적용 가능한 구성</dt><dd>{state.availableVersion ?? '확인 전'}</dd></div></dl></section>
        <details className="troubleshooting"><summary>문제 해결</summary><div className="troubleshooting-content"><p>로그인이나 실행에 필요한 인증·오류 창은 표시될 수 있어요.</p><button className="secondary-button" disabled={!api || busy || !allowPrism} onClick={() => void perform(api ? () => api.openPrism() : undefined)}>Prism 직접 열기<Icon name="arrow" size={15} /></button><div className="utility-row"><button disabled={!api || busy} onClick={() => void perform(api ? () => api.openLogs() : undefined)}>로그 보기</button><span>·</span><button disabled={!api || busy || working} onClick={() => void perform(api ? () => api.repair() : undefined, '설치 파일을 확인하고 있어요.')}>설치 복구</button><span>·</span><button disabled={!api || busy} onClick={() => void perform(api ? () => api.openInstance() : undefined)}>인스턴스 폴더</button></div></div></details>
        <div className="support-actions"><button className="secondary-button" disabled={!api || busy} onClick={() => void perform(api ? () => api.copyDiagnostics() : undefined, '오류 정보를 복사했어요.')}>오류 정보 복사</button><button className="secondary-button" disabled={!api || busy} onClick={() => void perform(api ? async () => { if (await api.saveDiagnostics()) onNotice('진단 파일을 저장했어요.') } : undefined)}>진단 파일 저장</button>{state.diagnostic && <button className="text-button" onClick={onErrorDetails}>오류 상세</button>}</div>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        {!api && <p className="preview-note">화면 미리보기 · 설정 저장은 데스크톱 앱에서</p>}
      </div>
      <div className="dialog-footer"><button className="text-button" onClick={onClose}>닫기</button><button className="save-button" disabled={!api || busy || working} onClick={() => void perform(api ? async () => { await api.saveSettings(settings); onNotice('설정을 저장했어요.'); onClose() } : undefined)}>{busy ? '처리하는 중…' : '저장하고 닫기'}</button></div>
    </div>
  </div>
}

function DiagnosticDialog({ report, api, onClose }: { report: DiagnosticReport; api: typeof window.sunrin; onClose: () => void }) {
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [report.id])
  async function perform(save: boolean) {
    if (!api || busy) return
    setBusy(true); setNotice('')
    try {
      if (save) { if (await api.saveDiagnostics()) setNotice('진단 파일을 저장했어요. 파일을 첨부해서 공유해 주세요.') }
      else { await api.copyDiagnostics(); setNotice('오류 정보를 복사했어요.') }
    } catch { setNotice('처리하지 못했어요. 저장 위치나 클립보드를 확인한 뒤 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop diagnostic-backdrop"><div className="settings-dialog diagnostic-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="diagnostic-heading">
    <div className="dialog-heading"><div><span className="dialog-eyebrow">LET’S FIND THE WAY</span><h2 id="diagnostic-heading">작업을 마치지 못했어요</h2></div><button className="icon-button" onClick={onClose} aria-label="오류 안내 닫기"><Icon name="close" /></button></div>
    <div className="dialog-body"><p className="diagnostic-summary">{report.summary}</p><p className="field-help">오류 정보를 복사하거나 진단 파일을 저장해서 전달해 주세요. 인증 정보와 개인 경로는 가려서 표시합니다.</p><details className="diagnostic-details"><summary>상세 정보</summary><pre>{report.details}</pre></details><p className="diagnostic-notice" role="status">{notice}</p></div>
    <div className="dialog-footer"><button className="secondary-button" disabled={!api || busy} onClick={() => void perform(false)}>오류 정보 복사</button><button className="secondary-button" disabled={!api || busy} onClick={() => void perform(true)}>진단 파일 저장</button><button className="save-button" onClick={onClose}>닫기</button></div>
  </div></div>
}
