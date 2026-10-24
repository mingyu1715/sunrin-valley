import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execute = promisify(execFile)

export function commandUsesData(command: string, data: string): boolean {
  const normalized = command.normalize('NFC').replaceAll('\\', '/').toLowerCase()
  const root = data.normalize('NFC').replaceAll('\\', '/').replace(/\/$/, '').toLowerCase()
  return /(?:prismlauncher(?:\.exe)?|\/java(?:w?\.exe)?(?:["\s]|$))/.test(normalized)
    && (normalized.includes(`${root}/prism-data`) || normalized.includes(`${root}/runtime/`))
}
export async function assertInstallIdle(data: string): Promise<void> {
  let commands: string[]
  try {
    if (process.platform === 'win32') {
      const query = "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('prismlauncher.exe','java.exe','javaw.exe') } | Select-Object -ExpandProperty CommandLine | ConvertTo-Json -Compress"
      const result = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query], { windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024 })
      const parsed = result.stdout.trim() ? JSON.parse(result.stdout) : []
      commands = (Array.isArray(parsed) ? parsed : [parsed]).filter(value => typeof value === 'string')
    } else {
      const result = await execute('/bin/ps', ['-axo', 'pid=,command='], { timeout: 10000, maxBuffer: 16 * 1024 * 1024 })
      commands = result.stdout.split('\n').map(line => line.replace(/^\s*\d+\s+/, ''))
    }
  } catch { throw new Error('실행 중인 게임 확인에 실패했습니다. Prism과 게임을 닫은 뒤 다시 시도해 주세요.') }
  if (commands.some(command => commandUsesData(command, data))) throw new Error('Prism 또는 게임이 실행 중입니다. 닫은 뒤 설치·복구·설정 변경을 진행해 주세요.')
}
