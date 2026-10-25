const { lstat, mkdir, readdir, writeFile } = require('node:fs/promises')
const { dirname, join, posix } = require('node:path')

function validateName(name) {
  if (!name || name === '.' || name === '..' || /[\x00-\x1f<>:"/\\|?*$!]/.test(name) || /[. ]$/.test(name) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw new Error(`Unsafe Windows/NSIS payload name: ${JSON.stringify(name)}`)
}

async function collectInventory(root) {
  const files = [], directories = []
  async function visit(relative) {
    const path = relative ? join(root, relative) : root
    const info = await lstat(path)
    if (info.isSymbolicLink()) throw new Error('Linked payload paths cannot enter the uninstall inventory')
    if (info.isDirectory()) {
      if (relative) directories.push(relative)
      for (const name of (await readdir(path)).sort()) {
        validateName(name)
        await visit(relative ? `${relative}/${name}` : name)
      }
    } else if (info.isFile()) files.push(relative)
    else throw new Error('Only regular packaged files and directories are supported')
  }
  await visit('')
  if (!files.length) throw new Error('Refusing to generate an empty launcher inventory')
  directories.sort((a, b) => b.split('/').length - a.split('/').length || a.localeCompare(b))
  return { files, directories }
}

function renderInventory(inventory) {
  const windows = path => path.replaceAll('/', '\\')
  return [
    '; Generated afterPack inventory: embedded into this version of the uninstaller.',
    '!macro sunrinPackagedFiles VISITOR',
    ...inventory.files.map(file => `  !insertmacro \${VISITOR} "${windows(file)}" "${posix.dirname(file) === '.' ? '' : windows(posix.dirname(file))}"`),
    '  !insertmacro ${VISITOR} "${UNINSTALL_FILENAME}" ""',
    '!macroend',
    '!macro sunrinPackagedDirectories VISITOR',
    ...inventory.directories.map(directory => `  !insertmacro \${VISITOR} "${windows(directory)}"`),
    '!macroend', ''
  ].join('\n')
}

async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const inventory = await collectInventory(context.appOutDir)
  const target = join(context.packager.projectDir, 'out', 'sunrin-installed-files.nsh')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, renderInventory(inventory), 'utf8')
}
module.exports = afterPack
module.exports.collectInventory = collectInventory
