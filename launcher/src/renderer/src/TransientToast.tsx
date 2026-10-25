import { useEffect, useState } from 'react'

export interface ToastNotice { id: number; message: string }

export default function TransientToast({ notice, onExpired }: { notice: ToastNotice; onExpired: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2000)
    const remove = setTimeout(() => onExpired(notice.id), 2150)
    return () => { clearTimeout(fade); clearTimeout(remove) }
  }, [notice.id, onExpired])
  return <div className={`toast${leaving ? ' toast-leaving' : ''}`} role="status" aria-live="polite" aria-atomic="true">{notice.message}</div>
}
