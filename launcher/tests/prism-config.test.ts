import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { claimDataDirectory, exists } from '../src/main/files'
import { configurePrismForBackground } from '../src/main/prism-config'

const temporary: string[] = []
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-prism-config-'))
  temporary.push(root)
  const dataPath = join(root, 'managed')
  const javaPath = join(root, 'runtime', 'bin', 'java')
  const configPath = join(dataPath, 'prism-data', 'prismlauncher.cfg')
  await mkdir(dirname(javaPath), { recursive: true })
  await writeFile(javaPath, 'verified Java fixture')
  return { root, dataPath, javaPath, configPath }
}
async function existingConfig(dataPath: string, configPath: string, contents: string) {
  await claimDataDirectory(dataPath)
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, contents)
}
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('dedicated Prism background configuration', () => {
  it('updates General settings while preserving comments, preferences, unrelated keys and other sections', async () => {
    const { dataPath, javaPath, configPath } = await fixture()
    const contents = [
      '; player preferences', '[General]', '# keep this comment',
      'ShowConsole=true', 'ShowConsoleOnError=false', 'CloseAfterLaunch=true', 'QuitAfterGameStop=false',
      'IgnoreJavaWizard=false', 'AutomaticJavaSwitch=false', 'AutomaticJavaDownload=true', 'JavaPath=/old/java',
      'Language=en_US', 'ApplicationTheme=dark', 'IconTheme=pe_dark', 'CustomPreference=keep',
      'UserAskedAboutAutomaticJavaDownload=false', 'AcceptedEULA=false',
      '[Other]', 'ShowConsole=true', 'JavaPath=/other/java', '; other comment', ''
    ].join('\r\n')
    await existingConfig(dataPath, configPath, contents)

    await configurePrismForBackground(dataPath, javaPath)

    const result = await readFile(configPath, 'utf8')
    expect(result).toContain('; player preferences\r\n[General]\r\n# keep this comment\r\n')
    expect(result).toContain('ShowConsole=false\r\nShowConsoleOnError=true\r\nCloseAfterLaunch=false\r\nQuitAfterGameStop=true')
    expect(result).toContain('IgnoreJavaWizard=true\r\nAutomaticJavaSwitch=true\r\nAutomaticJavaDownload=false')
    expect(result).toContain(`JavaPath=${javaPath.replace(/\\/g, '/')}\r\n`)
    expect(result).toContain('Language=en_US\r\nApplicationTheme=dark\r\nIconTheme=pe_dark\r\nCustomPreference=keep')
    expect(result).toContain('UserAskedAboutAutomaticJavaDownload=false\r\nAcceptedEULA=false')
    expect(result).toContain('[Other]\r\nShowConsole=true\r\nJavaPath=/other/java\r\n; other comment\r\n')
  })

  it('fills empty appearance preferences and produces the same file on repeated configuration', async () => {
    const { root, dataPath, configPath } = await fixture()
    const javaPath = join(root, 'runtime\\java17')
    await mkdir(dirname(javaPath), { recursive: true })
    await writeFile(javaPath, 'verified Java fixture')
    await existingConfig(dataPath, configPath, '[General]\nLanguage=\nApplicationTheme=  \nIconTheme=\nShowConsole=true\nShowConsole=true\n# after duplicate\n[Other]\nLanguage=de\n')

    await configurePrismForBackground(dataPath, javaPath)
    const result = await readFile(configPath, 'utf8')
    expect(result).toContain('Language=ko\nApplicationTheme=system\nIconTheme=pe_colored\n')
    expect(result.match(/^ShowConsole=/gm)).toHaveLength(1)
    expect(result).toContain('# after duplicate\n')
    expect(result).toContain('[Other]\nLanguage=de\n')
    expect(result).toContain(`JavaPath=${javaPath.replace(/\\/g, '/')}\n`)
    await configurePrismForBackground(dataPath, javaPath)
    expect(await readFile(configPath, 'utf8')).toBe(result)
  })

  it('appends a missing General section without changing existing sections or manufacturing consent records', async () => {
    const { dataPath, javaPath, configPath } = await fixture()
    const contents = '# existing header\n[Custom]\nLanguage=fr\nShowConsole=true'
    await existingConfig(dataPath, configPath, contents)

    await configurePrismForBackground(dataPath, javaPath)

    const result = await readFile(configPath, 'utf8')
    expect(result.startsWith(`${contents}\n`)).toBe(true)
    expect(result).toContain('[General]\n')
    expect(result).toContain('Language=ko\n')
    expect(result).not.toMatch(/UserAskedAboutAutomaticJavaDownload|EULA|Token/i)
    await configurePrismForBackground(dataPath, javaPath)
    expect(await readFile(configPath, 'utf8')).toBe(result)
  })

  it('refuses a missing Java path before changing an existing config or claiming a new directory', async () => {
    const { root, dataPath, configPath } = await fixture()
    const contents = '[General]\nShowConsole=true\n'
    await existingConfig(dataPath, configPath, contents)

    await expect(configurePrismForBackground(dataPath, join(root, 'missing-java'))).rejects.toThrow(/Java/)
    expect(await readFile(configPath, 'utf8')).toBe(contents)
    const newDataPath = join(root, 'not-created')
    await expect(configurePrismForBackground(newDataPath, join(root, 'missing-java'))).rejects.toThrow(/Java/)
    expect(await exists(newDataPath)).toBe(false)
  })

  it('refuses linked roots, config directories and config files without changing their targets', async () => {
    const { root, dataPath, javaPath, configPath } = await fixture()
    const outside = join(root, 'outside')
    await mkdir(outside)
    const outsideConfig = join(outside, 'prismlauncher.cfg')
    const contents = '[General]\nShowConsole=true\n'
    await writeFile(outsideConfig, contents)
    await symlink(outside, dataPath, 'dir')
    await expect(configurePrismForBackground(dataPath, javaPath)).rejects.toThrow(/연결/)
    await rm(dataPath)
    await claimDataDirectory(dataPath)
    await symlink(outside, dirname(configPath), 'dir')
    await expect(configurePrismForBackground(dataPath, javaPath)).rejects.toThrow(/연결/)
    await rm(dirname(configPath))
    await mkdir(dirname(configPath))
    await symlink(outsideConfig, configPath, 'file')
    await expect(configurePrismForBackground(dataPath, javaPath)).rejects.toThrow(/연결/)
    expect(await readFile(outsideConfig, 'utf8')).toBe(contents)
  })

  it('creates a config only inside a claimed dedicated directory', async () => {
    const { root, dataPath, javaPath, configPath } = await fixture()
    await configurePrismForBackground(dataPath, javaPath)
    expect(await readFile(configPath, 'utf8')).toContain('[General]\n')
    expect(JSON.parse(await readFile(join(dataPath, '.sunrin-valley.json'), 'utf8')).id).toBe('sunrin-valley')

    const unrelated = join(root, 'player-folder')
    await mkdir(unrelated)
    await writeFile(join(unrelated, 'keep.txt'), 'player file')
    await expect(configurePrismForBackground(unrelated, javaPath)).rejects.toThrow()
    expect(await readFile(join(unrelated, 'keep.txt'), 'utf8')).toBe('player file')
    expect(await exists(join(unrelated, 'prism-data'))).toBe(false)
  })

  it('refuses linked ownership metadata before claiming or configuring the directory', async () => {
    const { root, dataPath, javaPath, configPath } = await fixture()
    await mkdir(dataPath)
    const outsideMarker = join(root, 'outside-marker.json')
    const contents = JSON.stringify({ id: 'sunrin-valley', formatVersion: 1 })
    await writeFile(outsideMarker, contents)
    await symlink(outsideMarker, join(dataPath, '.sunrin-valley.json'), 'file')

    await expect(configurePrismForBackground(dataPath, javaPath)).rejects.toThrow(/연결/)

    expect(await readFile(outsideMarker, 'utf8')).toBe(contents)
    expect(await exists(configPath)).toBe(false)
  })
})
