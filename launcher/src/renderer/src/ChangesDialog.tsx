import { useEffect, useRef } from 'react'

export default function ChangesDialog({ launcher, pack, onClose }: { launcher?: { version?: string; changes: string[] }; pack?: { version?: string; changes: string[] }; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <div className="settings-dialog changes-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="changes-heading">
      <div className="dialog-heading"><div><span className="dialog-eyebrow">A LITTLE SOMETHING NEW</span><h2 id="changes-heading">업데이트 변경 내역</h2></div><button className="icon-button" aria-label="변경 내역 닫기" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
      <div className="dialog-body">{[{ title: '런처', data: launcher }, { title: '모드팩', data: pack }].map(({ title, data }) => data && data.changes.length > 0 && <section className="changes-section" key={title}><h3>{title}{data.version && ` ${data.version}`}</h3><ul>{data.changes.map((change, index) => <li key={index}>{change}</li>)}</ul></section>)}</div>
      <div className="dialog-footer"><button className="save-button" onClick={onClose}>닫기</button></div>
    </div>
  </div>
}
