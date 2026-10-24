import { join } from 'node:path'
import { open } from 'node:fs/promises'
import { assertNoSymlinks } from './files'
import { INSTANCE_ID } from './instance'
export type EngineStage = 'authenticating' | 'preparing'
export class PrismProgressDecoder {
  private pending = ''
  private discarding = false
  private last?: EngineStage
  constructor(readonly emit: (stage: EngineStage) => void) {}
  reset(): void { this.pending = ''; this.discarding = false; this.last = undefined }
  feed(chunk: Buffer | string): void {
    this.pending += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    let newline: number
    while ((newline = this.pending.indexOf('\n')) >= 0) {
      const line = this.pending.slice(0, newline).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
      this.pending = this.pending.slice(newline + 1)
      if (!this.discarding && line.length <= 8192) {
        // Only emit fixed stage identifiers. Never forward the engine's raw output.
        const stage: EngineStage | undefined = /AuthFlow:|First layer of Xbox auth.*commencing\.|Getting Minecraft access token/.test(line) ? 'authenticating'
          : /:\s*downloading libraries|(?:Starting|Finished) asset index download for/.test(line) ? 'preparing' : undefined
        if (stage && stage !== this.last) { this.last = stage; this.emit(stage) }
      }
      this.discarding = false
    }
    if (this.pending.length > 8192) { this.pending = ''; this.discarding = true }
  }
}
export function prismArguments(dataPath: string, manageAccounts: boolean): string[] {
  return ['--dir', join(dataPath, 'prism-data'), ...(manageAccounts ? ['--show-window'] : ['--launch', INSTANCE_ID])]
}
export class PrismLogTail {
  private position = 0
  private inode?: number
  constructor(readonly data: string, readonly decoder: PrismProgressDecoder, private skipExisting = false) {}
  async poll(): Promise<void> {
    const path = join(this.data, 'prism-data/logs/PrismLauncher-0.log')
    await assertNoSymlinks(this.data, path)
    let file
    try { file = await open(path, 'r') }
    catch (error: any) {
      if (error.code !== 'ENOENT') throw error
      // If the engine has not created its log yet, read that new file from its beginning.
      this.skipExisting = false
      return
    }
    try {
      const info = await file.stat()
      if (!info.isFile()) return
      if (this.skipExisting) {
        this.position = info.size; this.inode = info.ino; this.skipExisting = false
        return
      }
      if (this.inode !== info.ino || info.size < this.position) {
        this.position = 0; this.decoder.reset()
      }
      this.inode = info.ino
      const length = Math.min(64 * 1024, Math.max(0, info.size - this.position))
      if (!length) return
      const buffer = Buffer.allocUnsafe(length)
      const { bytesRead } = await file.read(buffer, 0, length, this.position)
      this.position += bytesRead
      this.decoder.feed(buffer.subarray(0, bytesRead))
    } finally { await file.close() }
  }
}
