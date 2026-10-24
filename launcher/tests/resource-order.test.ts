import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { configureOptions } from '../src/main/instance'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sunrin-resource-order-')); roots.push(root)
  const game = join(root, 'game'), original = join(root, 'original')
  for (const directory of ['resourcepacks', 'config', 'configureddefaults']) await mkdir(join(game, directory), { recursive: true })
  await mkdir(original)
  return { game, original }
}

async function packs(game: string, filenames: string[]) {
  for (const filename of filenames) await writeFile(join(game, 'resourcepacks', filename), `installed ${filename}`)
  return filenames.map(filename => `resourcepacks/${filename}`)
}

async function selected(path: string) {
  const text = await readFile(path, 'utf8')
  return JSON.parse(text.match(/^resourcePacks:(.*)$/m)![1])
}

it('activates installed originals and Stay True with Sunlit Valley above the custom pack', async () => {
  const { game, original } = await fixture()
  const managed = await packs(game, ['sunlit_overrides.zip', 'Sunrin-Custom.zip', 'Stay_True_1.20.zip', 'Low.zip', 'High.zip', 'CreateSophBackpacks.zip', 'SocietyCoins.zip'])
  await writeFile(join(game, 'configureddefaults/options.txt'), 'lang:en_us\ngamma:0.5\nresourcePacks:["file/Low.zip","file/High.zip","file/CreateSophisticatedBackpacks.zip","file/Missing.zip"]\n')
  const config = {
    schema_version: 2, failed_reloads_per_session: 5,
    default_packs: ['file/sunlit_overrides.zip', 'file/Low.zip', 'file/High.zip', 'file/CreateSophisticatedBackpacks.zip', 'file/Missing.zip'],
    default_overrides: { force_compatible: true },
    pack_overrides: { '1': ['file/sunlit_overrides.zip', 'file/Low.zip', 'file/High.zip', 'file/CreateSophisticatedBackpacks.zip', 'file/Missing.zip'], '$$1': { hidden: false, required: true }, personal: ['file/Player.zip'], '$$personal': { hidden: true } },
    custom_setting: 'keep'
  }
  await writeFile(join(game, 'config/resourcepackoverrides.json'), JSON.stringify(config))
  const shaders = '# original shader selection\nenableShaders=false\nshaderPack=ComplementaryReimagined_r5.6.1 + Clrwl_1.0.4.zip\n'
  await writeFile(join(game, 'config/oculus.properties'), shaders)

  await configureOptions(game, original, false, managed)

  const expected = ['vanilla', 'file/Stay_True_1.20.zip', 'file/Low.zip', 'file/High.zip', 'file/CreateSophBackpacks.zip', 'file/SocietyCoins.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip']
  expect(await selected(join(game, 'options.txt'))).toEqual(expected)
  expect(await selected(join(game, 'configureddefaults/options.txt'))).toEqual(expected)
  expect(await readFile(join(game, 'options.txt'), 'utf8')).toContain('lang:ko_kr\ngamma:0.5')
  const actualConfig = JSON.parse(await readFile(join(game, 'config/resourcepackoverrides.json'), 'utf8'))
  expect(actualConfig).toEqual({ ...config, default_packs: expected, pack_overrides: { ...config.pack_overrides, '1': expected.filter(pack => pack !== 'vanilla') } })
  expect(await readFile(join(game, 'config/oculus.properties'), 'utf8')).toBe(shaders)
})

it('reconciles an already initialized instance without resetting controls or enabling unselected player packs', async () => {
  const { game, original } = await fixture()
  const managed = await packs(game, ['sunlit_overrides.zip', 'Sunrin-Custom.zip', 'Stay_True_1.20.zip', 'Low.zip', 'High.zip'])
  await packs(game, ['Personal.zip', 'NotSelected.zip'])
  await mkdir(join(game, '.sunrin'))
  const marker = '{"optionsSchema":1,"initializedAt":"player first install"}'
  await writeFile(join(game, '.sunrin/options-initialized.json'), marker)
  await writeFile(join(game, 'configureddefaults/options.txt'), 'resourcePacks:["file/Low.zip","file/High.zip"]\n')
  await writeFile(join(game, 'options.txt'), 'lang:ko_kr\ngamma:0.2\nkey_key.forward:key.keyboard.up\nrenderDistance:9\nresourcePacks:["vanilla","file/sunlit_overrides.zip","file/Personal.zip","file/Sunrin-Custom.zip"]\n')
  await writeFile(join(original, 'options.txt'), 'gamma:1.0\nkey_key.forward:key.keyboard.w\n')
  const shaderChoice = 'enableShaders=true\nshaderPack=MyChoice.zip\n'
  await writeFile(join(game, 'config/oculus.properties'), shaderChoice)

  await configureOptions(game, original, true, managed)

  const expected = ['vanilla', 'file/Stay_True_1.20.zip', 'file/Low.zip', 'file/High.zip', 'file/Personal.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip']
  expect(await selected(join(game, 'options.txt'))).toEqual(expected)
  const first = await readFile(join(game, 'options.txt'), 'utf8')
  expect(first).toContain('gamma:0.2\nkey_key.forward:key.keyboard.up\nrenderDistance:9\n')
  expect(await readFile(join(game, '.sunrin/options-initialized.json'), 'utf8')).toBe(marker)
  expect(await readFile(join(game, 'config/oculus.properties'), 'utf8')).toBe(shaderChoice)
  await configureOptions(game, original, true, managed)
  expect(await readFile(join(game, 'options.txt'), 'utf8')).toBe(first)
})

it('adds only installed managed packs and retains imported personal selections', async () => {
  const { game, original } = await fixture()
  const managed = await packs(game, ['Stay_True_1.20.zip', 'Real.zip'])
  managed.push('resourcepacks/Sunrin-Custom.zip', 'resourcepacks/sunlit_overrides.zip', 'resourcepacks/Absent.zip')
  await writeFile(join(game, 'configureddefaults/options.txt'), 'resourcePacks:["file/Absent.zip","file/Real.zip"]\n')
  await writeFile(join(original, 'options.txt'), 'lang:en_us\ngamma:0.7\nresourcePacks:["vanilla","file/Personal.zip"]\n')

  await configureOptions(game, original, true, managed)

  expect(await selected(join(game, 'options.txt'))).toEqual(['vanilla', 'file/Stay_True_1.20.zip', 'file/Real.zip', 'file/Personal.zip'])
  expect(await readFile(join(game, 'options.txt'), 'utf8')).toContain('gamma:0.7')
  expect(await readFile(join(original, 'options.txt'), 'utf8')).toContain('lang:en_us')
})

it('keeps personal selections out of the required pack group on repeated reconciliation', async () => {
  const { game, original } = await fixture()
  const managed = await packs(game, ['sunlit_overrides.zip', 'Sunrin-Custom.zip', 'Stay_True_1.20.zip'])
  await packs(game, ['Personal.zip'])
  await writeFile(join(game, 'options.txt'), 'resourcePacks:["vanilla","file/Personal.zip"]\n')
  await writeFile(join(game, 'config/resourcepackoverrides.json'), JSON.stringify({ schema_version: 2, default_packs: ['file/sunlit_overrides.zip'], pack_overrides: { '1': ['file/sunlit_overrides.zip'], '$$1': { required: true } } }))

  await configureOptions(game, original, false, managed)
  await configureOptions(game, original, false, managed)

  const config = JSON.parse(await readFile(join(game, 'config/resourcepackoverrides.json'), 'utf8'))
  expect(config.default_packs).toEqual(['vanilla', 'file/Stay_True_1.20.zip', 'file/Personal.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip'])
  expect(config.pack_overrides['1']).toEqual(['file/Stay_True_1.20.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip'])
})

it('drops a previous release pack from activation before stale managed files are removed', async () => {
  const { game, original } = await fixture()
  await packs(game, ['Sunrin-Custom.zip', 'OldOwnPack.zip', 'NewOwnPack.zip', 'sunlit_overrides.zip'])
  await mkdir(join(game, '.sunrin'))
  await writeFile(join(game, '.sunrin/receipt.json'), JSON.stringify({
    formatVersion: 1, packVersion: '0.1.1', fingerprint: 'old', runtime: { java: '/fixture/java', prism: '/fixture/prism' },
    managed: {
      'resourcepacks/Sunrin-Custom.zip': { algorithm: 'sha256', value: 'a'.repeat(64) },
      'resourcepacks/OldOwnPack.zip': { algorithm: 'sha256', value: 'b'.repeat(64) },
      'resourcepacks/sunlit_overrides.zip': { algorithm: 'sha256', value: 'c'.repeat(64) }
    }
  }))
  await writeFile(join(game, 'options.txt'), 'resourcePacks:["vanilla","file/OldOwnPack.zip","file/Sunrin-Custom.zip","file/sunlit_overrides.zip"]\n')
  await writeFile(join(game, 'config/resourcepackoverrides.json'), JSON.stringify({ schema_version: 2, default_packs: ['file/OldOwnPack.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip'], pack_overrides: { '1': ['file/OldOwnPack.zip', 'file/Sunrin-Custom.zip', 'file/sunlit_overrides.zip'], '$$1': { required: true } } }))

  await configureOptions(game, original, false, ['resourcepacks/NewOwnPack.zip', 'resourcepacks/sunlit_overrides.zip'])

  const expected = ['vanilla', 'file/NewOwnPack.zip', 'file/sunlit_overrides.zip']
  expect(await selected(join(game, 'options.txt'))).toEqual(expected)
  const config = JSON.parse(await readFile(join(game, 'config/resourcepackoverrides.json'), 'utf8'))
  expect(config.default_packs).toEqual(expected)
  expect(config.pack_overrides['1']).toEqual(expected.slice(1))
})
