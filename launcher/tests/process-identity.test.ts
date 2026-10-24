import { describe, expect, it } from 'vitest'
import { activityFromCommands, activityFromProcessOutput } from '../src/main/processes'

describe('nonsecret Prism process identities', () => {
  it('reads macOS lstart rows and retains identities only for this installation’s Prism', () => {
    const result = activityFromProcessOutput([
      '  101 Sun Oct 25 02:12:13 2026 /game/runtime/Prism-11.1.1/Prism Launcher.app/Contents/MacOS/prismlauncher --dir /game/prism-data --secret=never-return',
      '  102 Sun Oct 25 02:12:14 2026 /game/runtime/java17/bin/java -cp /game/prism-data/libraries org.prismlauncher.EntryPoint',
      '  103 Sun Oct 25 02:12:15 2026 /other/runtime/Prism-11.1.1/prismlauncher --dir /other/prism-data',
      '  104 Sun Oct 25 02:12:16 2026 /usr/bin/other --dir /game/prism-data',
      ''
    ].join('\n'), '/game', 'darwin')
    expect(result).toEqual({ prism: true, java: true, game: true, prismIdentities: ['101:Sun Oct 25 02:12:13 2026'] })
    expect(JSON.stringify(result)).not.toMatch(/never-return|--dir|\/game|CommandLine/)
  })

  it('changes the identity when the same macOS PID is reused and normalizes padding', () => {
    const command = '/game/runtime/Prism/prismlauncher --dir /game/prism-data'
    const first = activityFromProcessOutput(`101 Mon Oct  5 02:12:13 2026 ${command}`, '/game', 'darwin')
    const second = activityFromProcessOutput(`101 Mon Oct  5 02:12:14 2026 ${command}`, '/game', 'darwin')
    expect(first.prismIdentities).toEqual(['101:Mon Oct 5 02:12:13 2026'])
    expect(second.prismIdentities).toEqual(['101:Mon Oct 5 02:12:14 2026'])
  })

  it('reads Windows CIM objects without returning command lines or Java identities', () => {
    const result = activityFromProcessOutput(JSON.stringify([
      { ProcessId: 202, CreationDate: '2026-10-24T17:12:13.1234567Z', CommandLine: '"C:\\Game\\runtime\\Prism\\prismlauncher.exe" --dir "C:\\Game\\prism-data" --secret=never-return' },
      { ProcessId: 203, CreationDate: '2026-10-24T17:12:14.0000000Z', CommandLine: '"C:\\Game\\runtime\\java17\\bin\\javaw.exe" org.prismlauncher.EntryPoint' },
      { ProcessId: 204, CreationDate: '2026-10-24T17:12:15.0000000Z', CommandLine: '"C:\\Other\\runtime\\Prism\\prismlauncher.exe"' }
    ]), 'C:\\Game', 'win32')
    expect(result).toEqual({ prism: true, java: true, game: true, prismIdentities: ['202:2026-10-24T17:12:13.1234567Z'] })
    expect(JSON.stringify(result)).not.toMatch(/never-return|--dir|CommandLine/)
  })

  it('supports a single Windows process and rejects untrusted identity fields without hiding activity', () => {
    const command = '"C:\\Game\\runtime\\Prism\\prismlauncher.exe"'
    const one = activityFromProcessOutput(JSON.stringify({ ProcessId: 202, CreationDate: '2026-10-24T17:12:13.0000000+00:00', CommandLine: command }), 'C:\\Game', 'win32')
    expect(one.prismIdentities).toEqual(['202:2026-10-24T17:12:13.0000000+00:00'])
    for (const fields of [{ ProcessId: 0, CreationDate: '2026-10-24T17:12:13Z' }, { ProcessId: 202, CreationDate: 'secret=never-return' }]) {
      expect(activityFromProcessOutput(JSON.stringify({ ...fields, CommandLine: command }), 'C:\\Game', 'win32')).toEqual({ prism: true, java: false, game: false, prismIdentities: [] })
    }
    expect(activityFromProcessOutput('null', 'C:\\Game', 'win32')).toEqual({ prism: false, java: false, game: false, prismIdentities: [] })
  })

  it('keeps the existing command-only helper result unchanged', () => {
    expect(activityFromCommands(['/game/runtime/Prism/prismlauncher'], '/game')).toEqual({ prism: true, java: false, game: false })
  })
})
