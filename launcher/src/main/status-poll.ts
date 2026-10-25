export function startStatusPolling(check: () => Promise<void>, allowed: () => boolean, intervalMs = 30000): () => void {
  let stopped = false, checking = false
  const timer = setInterval(() => {
    if (stopped || checking || !allowed()) return
    checking = true
    void check().catch(() => {}).finally(() => { checking = false })
  }, intervalMs)
  return () => { stopped = true; clearInterval(timer) }
}
