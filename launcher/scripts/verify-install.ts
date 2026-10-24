import { mkdir, cp, readFile } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { installClient, inspectInstall, loadManifest } from '../src/main/installer'
import { claimDataDirectory, exists } from '../src/main/files'
import { SettingsStore } from '../src/main/settings'

const root = resolve(__dirname, '../..')
const assets = { manifest: join(root, 'client-pack/manifest.json'), prism: join(root, 'client-pack/prism-runtime.json'), customPack: join(root, 'resourcepacks/dist/Sunrin-Custom.zip'), startup: join(root, 'kubejs-custom/startup_scripts/sunrin_items.js') }
async function main() {
  const store = new SettingsStore(join(root, '.local-test/electron'))
  const settings = await store.load()
  await claimDataDirectory(settings.dataPath)
  const cache = join(settings.dataPath, 'cache')
  await mkdir(cache, { recursive: true })
  const manifest = await loadManifest(assets.manifest)
  const source = join(root, 'client-pack/cache', manifest.base.filename)
  if (await exists(source) && !await exists(join(cache, manifest.base.filename))) await cp(source, join(cache, manifest.base.filename))
  const prism = JSON.parse(await readFile(assets.prism, 'utf8')).platforms[`${process.platform}-${process.arch}`]
  const prismCache = join('/private/tmp/sunrin-research', prism.filename)
  if (await exists(prismCache) && !await exists(join(cache, prism.filename))) await cp(prismCache, join(cache, prism.filename))
  let last = ''
  await installClient(settings, assets, (message, progress) => {
    const step = progress === null ? message : String(Math.floor(progress / 5))
    if (last !== step) { console.log(`${progress === null ? '' : `${Math.round(progress)}% `}${message}`); last = step }
  })
  const result = await inspectInstall(settings, assets)
  if (result.phase !== 'ready') throw new Error(JSON.stringify(result))
  console.log('PASS: entire client pack + overlays + Java + Prism installed; immutable managed hashes verified, player config preserved')
  const receipt = JSON.parse(await readFile(join(settings.dataPath, 'prism-data/instances/SunrinValley/.minecraft/.sunrin/receipt.json'), 'utf8'))
  const version = await promisify(execFile)(receipt.runtime.java, ['-version'])
  console.log('JAVA', version.stderr.trim())
  console.log('Managed files:', Object.keys(receipt.managed).length)
  console.log('Microsoft login and gameplay require the player to sign in to Prism; not asserted by this verification.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
