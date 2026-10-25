import { afterEach, expect, it, vi } from 'vitest'
import { startStatusPolling } from '../src/main/status-poll'
afterEach(() => vi.useRealTimers())
it('refreshes a waiting status without overlapping network checks and stops when the window quits', async () => {
  vi.useFakeTimers()
  let calls = 0, finish: (() => void) | undefined
  const stop = startStatusPolling(async () => { calls++; await new Promise<void>(resolve => { finish = resolve }) }, () => true, 10)
  await vi.advanceTimersByTimeAsync(35); expect(calls).toBe(1)
  finish!(); await vi.advanceTimersByTimeAsync(10); expect(calls).toBe(2)
  stop(); finish!(); await vi.advanceTimersByTimeAsync(100); expect(calls).toBe(2)
})
it('waits through a busy install and retries a failed metadata check so maintenance can finish', async () => {
  vi.useFakeTimers()
  let busy = true, checks = 0, state = 'maintenance'
  const stop = startStatusPolling(async () => { if (++checks === 1) throw Error('temporary network outage'); state = 'online' }, () => !busy, 10)
  await vi.advanceTimersByTimeAsync(20); expect(checks).toBe(0)
  busy = false; await vi.advanceTimersByTimeAsync(10); expect(state).toBe('maintenance')
  await vi.advanceTimersByTimeAsync(10); expect(state).toBe('online')
  stop()
})
