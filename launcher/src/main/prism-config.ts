import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertNoSymlinks, atomicWrite, claimDataDirectory, exists } from './files'

type Line = { text: string; ending: string }

function mergeGeneral(source: string, javaPath: string): string {
  const newline = source.match(/\r\n|\n|\r/)?.[0] ?? '\n'
  const lines: Line[] = (source.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? [])
    .filter(Boolean)
    .map(raw => {
      const ending = raw.match(/\r\n$|\n$|\r$/)?.[0] ?? ''
      return { text: raw.slice(0, raw.length - ending.length), ending }
    })
  const required = new Map<string, string>([
    ['ShowConsole', 'false'], ['ShowConsoleOnError', 'true'], ['CloseAfterLaunch', 'false'],
    ['QuitAfterGameStop', 'true'], ['IgnoreJavaWizard', 'true'], ['AutomaticJavaSwitch', 'true'],
    ['AutomaticJavaDownload', 'false'], ['JavaPath', javaPath.replace(/\\/g, '/')]
  ])
  const defaults = new Map([['Language', 'ko'], ['ApplicationTheme', 'system'], ['IconTheme', 'pe_colored']])
  const preferences = new Map<string, string>()
  const section = /^\s*\[([^\]]+)\]\s*(?:[;#].*)?$/
  const entry = /^(\s*)([^;#=][^=]*?)(\s*=\s*)(.*)$/
  let inGeneral = false, hasGeneral = false, insertAt = lines.length
  for (let index = 0; index < lines.length; index++) {
    const header = lines[index].text.match(section)
    if (header) {
      if (inGeneral) insertAt = index
      inGeneral = header[1] === 'General'
      if (inGeneral) { hasGeneral = true; insertAt = lines.length }
      continue
    }
    const match = inGeneral && lines[index].text.match(entry)
    if (match && defaults.has(match[2].trim())) preferences.set(match[2].trim(), match[4])
  }
  for (const [key, fallback] of defaults) required.set(key, preferences.get(key)?.trim() ? preferences.get(key)! : fallback)

  const output: Line[] = []
  const seen = new Set<string>()
  const append = (text: string) => {
    if (output.length && !output[output.length - 1].ending) output[output.length - 1].ending = newline
    output.push({ text, ending: newline })
  }
  const appendMissing = () => {
    for (const [key, value] of required) if (!seen.has(key)) append(`${key}=${value}`)
  }
  inGeneral = false
  for (let index = 0; index < lines.length; index++) {
    if (hasGeneral && index === insertAt) appendMissing()
    const line = lines[index]
    const header = line.text.match(section)
    if (header) inGeneral = header[1] === 'General'
    const match = !header && inGeneral && line.text.match(entry)
    const key = match ? match[2].trim() : ''
    if (match && required.has(key)) {
      if (seen.has(key)) continue
      seen.add(key)
      const value = required.get(key)!
      output.push({ ...line, text: match[4] === value ? line.text : `${match[1]}${key}=${value}` })
    } else output.push({ ...line })
  }
  if (!hasGeneral) append('[General]')
  if (!hasGeneral || insertAt === lines.length) appendMissing()
  return output.map(line => line.text + line.ending).join('')
}

export async function configurePrismForBackground(dataPath: string, javaPath: string): Promise<void> {
  if (!javaPath || /[\r\n\0]/.test(javaPath) || !await exists(javaPath)) throw new Error('설치된 Java 실행 파일을 찾을 수 없습니다.')
  const root = resolve(dataPath)
  const configPath = join(root, 'prism-data', 'prismlauncher.cfg')
  await assertNoSymlinks(root, configPath)
  await assertNoSymlinks(root, join(root, '.sunrin-valley.json'))
  await claimDataDirectory(root)
  const previous = await exists(configPath) ? await readFile(configPath, 'utf8') : ''
  const next = mergeGeneral(previous, javaPath)
  if (next !== previous) await atomicWrite(configPath, next)
}
