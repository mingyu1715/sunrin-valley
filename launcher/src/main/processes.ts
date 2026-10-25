import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execute = promisify(execFile)
export interface ProcessActivity { prism: boolean; java: boolean; game: boolean; prismIdentities?: string[] }
export function activityFromProcessOutput(output: string, data: string, platform: 'darwin' | 'win32'): ProcessActivity {
  const records: { pid: number; started: string; command: string }[] = []
  if (platform === 'win32') {
    const parsed: unknown = output.trim() ? JSON.parse(output) : []
    for (const value of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!value || typeof value !== 'object' || typeof value.CommandLine !== 'string') continue
      const started = typeof value.CreationDate === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/.test(value.CreationDate) ? value.CreationDate : ''
      records.push({ pid: value.ProcessId, started, command: value.CommandLine })
    }
  } else {
    for (const line of output.split('\n')) {
      const match = line.match(/^\s*(\d+)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/)
      if (match) records.push({ pid: Number(match[1]), started: match[2].replace(/\s+/g, ' '), command: match[3] })
    }
  }
  const activity = activityFromCommands(records.map(record => record.command), data)
  const identities = records.filter(record => Number.isSafeInteger(record.pid) && record.pid > 0 && record.started && activityFromCommands([record.command], data).prism)
    .map(record => `${record.pid}:${record.started}`)
  // Only nonsecret process identity leaves this boundary; never return command lines.
  return { ...activity, prismIdentities: [...new Set(identities)].sort() }
}
export function phaseForActivity(activity: ProcessActivity, launchRequested: boolean, gameHasRun = false): 'running' | 'preparing' | undefined {
  if (activity.game) return 'running'
  if (gameHasRun && !activity.java) return undefined
  if (activity.java || (activity.prism && launchRequested)) return 'preparing'
  return undefined
}
export function activityFromCommands(commands: string[], data: string): ProcessActivity {
  const activity = { prism: false, java: false, game: false }
  for (const command of commands) {
    if (!commandUsesData(command, data)) continue
    const normalized = command.replaceAll('\\', '/').toLowerCase()
    if (/(?:^|[\/"\s])prismlauncher(?:\.exe)?(?=["\s]|$)/.test(normalized)) activity.prism = true
    if (/\/java(?:w?\.exe)?(?:["\s]|$)/.test(normalized)) {
      activity.java = true
      if (/org\.prismlauncher\.entrypoint|cpw\.mods\.bootstraplauncher\.bootstraplauncher|net\.minecraft\.client\.main\.main|--launchtarget[=\s]+forgeclient/.test(normalized)) activity.game = true
    }
  }
  return activity
}

export function commandUsesData(command: string, data: string): boolean {
  const normalized = command.normalize('NFC').replaceAll('\\', '/').toLowerCase()
  const root = data.normalize('NFC').replaceAll('\\', '/').replace(/\/$/, '').toLowerCase()
  return /(?:prismlauncher(?:\.exe)?|\/java(?:w?\.exe)?(?:["\s]|$))/.test(normalized)
    && (normalized.includes(`${root}/prism-data`) || normalized.includes(`${root}/runtime/`))
}
export async function readProcessActivity(data: string): Promise<ProcessActivity> {
  try {
    if (process.platform === 'win32') {
      const query = "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('prismlauncher.exe','java.exe','javaw.exe') } | Select-Object ProcessId,@{Name='CreationDate';Expression={if ($_.CreationDate) {$_.CreationDate.ToUniversalTime().ToString('o',[System.Globalization.CultureInfo]::InvariantCulture)} else {''}}},CommandLine | ConvertTo-Json -Compress"
      const result = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query], { windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024 })
      return activityFromProcessOutput(result.stdout, data, 'win32')
    } else {
      const result = await execute('/bin/ps', ['-axo', 'pid=,lstart=,command='], { env: { ...process.env, LC_ALL: 'C' }, timeout: 10000, maxBuffer: 16 * 1024 * 1024 })
      return activityFromProcessOutput(result.stdout, data, 'darwin')
    }
  } catch { throw new Error('실행 중인 게임 확인에 실패했습니다. Prism과 게임을 닫은 뒤 다시 시도해 주세요.') }
}
export async function assertInstallIdle(data: string): Promise<void> {
  const activity = await readProcessActivity(data)
  if (activity.prism || activity.java) throw new Error('Prism 또는 게임이 실행 중입니다. 닫은 뒤 설치·복구·설정 변경을 진행해 주세요.')
}
