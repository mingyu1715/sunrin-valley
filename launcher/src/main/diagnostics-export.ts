import { chmod } from 'node:fs/promises'
import { atomicWrite } from './files'

/** Persist the same sanitized text used by the UI and clipboard without truncating an existing report on failure. */
export async function saveDiagnosticReport(path: string, details: string): Promise<void> {
  await atomicWrite(path, Buffer.from(details, 'utf8'))
  // POSIX permissions are best-effort on platforms/filesystems without chmod.
  try { await chmod(path, 0o600) } catch { /* The report was already saved successfully. */ }
}
