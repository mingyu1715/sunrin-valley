export interface PrimaryInspection { phase: 'ready' | 'update' | 'repair' | 'not-installed' | 'blocked'; key: string }
export interface PrimaryOperations {
  check(): Promise<PrimaryInspection>
  offer(): void
  install(): Promise<boolean | void>
  launch(): Promise<void>
}
export class PrimaryActionController {
  private offeredKey?: string
  hasOffer(): boolean { return this.offeredKey !== undefined }
  clear(): void { this.offeredKey = undefined }
  async run(operations: PrimaryOperations): Promise<void> {
    const current = await operations.check()
    if (current.phase === 'blocked') { this.clear(); return }
    if (current.phase === 'ready') { this.clear(); await operations.launch(); return }
    if (current.phase === 'update') {
      if (this.offeredKey !== current.key) { this.offeredKey = current.key; operations.offer(); return }
      if (await operations.install() === false) return
      this.clear()
      await operations.launch()
      return
    }
    this.clear()
    await operations.install()
  }
}
