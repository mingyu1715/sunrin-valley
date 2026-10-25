#!/usr/bin/env node
const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')
const { lstat, readFile, writeFile } = require('node:fs/promises')
const { basename, join, resolve } = require('node:path')
const AdmZip = require('adm-zip')

const MAX_EXPANDED_BYTES = 1024 * 1024 * 1024
const REPOSITORY_RELEASE = 'https://github.com/mingyu1715/sunrin-valley/releases/download'

function validateRelativePath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') ||
      /^[a-z]:/i.test(path) || path.split('/').some(part => !part || part === '.' || part === '..' ||
        /[\x00-\x1f\x7f<>:"|?*$!]/.test(part) || /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`Unsafe inventory path: ${JSON.stringify(path)}`)
  }
}

function validateInventory(value) {
  if (!value || value.formatVersion !== 1 || !Array.isArray(value.files) || !value.files.length) {
    throw new Error('Invalid launcher inventory')
  }
  const occupied = new Set()
  const spellings = new Map()
  for (const file of value.files) {
    validateRelativePath(file)
    const folded = file.normalize('NFC').toLowerCase()
    if (folded === 'appfiles.json') throw new Error('Inventory collides with reserved ZIP control file')
    if (occupied.has(folded)) throw new Error(`Case-insensitive inventory collision: ${file}`)
    occupied.add(folded)
    const segments = file.split('/')
    for (let length = 1; length <= segments.length; length++) {
      const spelling = segments.slice(0, length).join('/').normalize('NFC')
      const key = spelling.toLowerCase()
      if (spellings.has(key) && spellings.get(key) !== spelling) {
        throw new Error(`Case-insensitive directory collision: ${file}`)
      }
      spellings.set(key, spelling)
    }
  }
  if (!occupied.has('resources/launcher-files.json')) throw new Error('Inventory omits its own manifest')
  for (const file of value.files) {
    const segments = file.split('/')
    for (let length = 1; length < segments.length; length++) {
      if (occupied.has(segments.slice(0, length).join('/').normalize('NFC').toLowerCase())) {
        throw new Error(`Inventory file/directory collision: ${file}`)
      }
    }
  }
  return value.files
}

async function regularFile(path, label) {
  let stats
  try { stats = await lstat(path) }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Missing ${label}: ${path}`)
    throw error
  }
  if (!stats.isFile()) throw new Error(`${label} must be a regular file: ${path}`)
  return stats
}

async function validateManagedFile(root, relative) {
  let current = root
  const segments = relative.split('/')
  for (const [index, part] of segments.entries()) {
    current = join(current, part)
    const stats = await lstat(current)
    if (stats.isSymbolicLink()) throw new Error(`Linked inventory path: ${relative}`)
    if (index < segments.length - 1 && !stats.isDirectory()) throw new Error(`Non-directory inventory path: ${relative}`)
  }
  return regularFile(current, 'Managed payload')
}

function parseChangelog(markdown, version) {
  const lines = markdown.split(/\r?\n/)
  const heading = new RegExp(`^##\\s+${version.replaceAll('.', '\\.')}\\s+[^\\n]*$`)
  const start = lines.findIndex(line => heading.test(line.trim()))
  if (start < 0) throw new Error(`Missing changelog section for ${version}`)
  const changes = []
  for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
    const match = /^\s*-\s+(.+?)\s*$/.exec(lines[i])
    if (match) changes.push(match[1])
  }
  if (!changes.length) throw new Error(`Changelog section for ${version} has no bullets`)
  return changes
}

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function asset(path, kind, version) {
  const stats = await regularFile(path, kind.toUpperCase())
  return {
    url: `${REPOSITORY_RELEASE}/launcher-${version}/${basename(path)}`,
    sha256: await sha256(path), size: stats.size, kind
  }
}

async function buildLauncherUpdate({ version, directory, changelog }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Version must be a numeric semver triplet')
  if (!directory || !changelog) throw new Error('Directory and changelog are required')
  directory = resolve(directory)
  const unpacked = join(directory, 'win-unpacked')
  const dmgName = `Sunrin-Valley-${version}-mac-arm64.dmg`
  const setupName = `Sunrin-Valley-Setup-${version}-x64.exe`
  const zipName = `Sunrin-Valley-${version}-windows-x64-update.zip`
  const dmgPath = join(directory, dmgName)
  const setupPath = join(directory, setupName)
  const zipPath = join(directory, zipName)
  await regularFile(dmgPath, 'DMG')
  const unpackedStats = await lstat(unpacked)
  if (!unpackedStats.isDirectory()) throw new Error('Unpacked payload must be a real directory')
  const changes = parseChangelog(await readFile(changelog, 'utf8'), version)
  const inventoryPath = join(unpacked, 'resources', 'launcher-files.json')
  await regularFile(inventoryPath, 'Launcher inventory')
  const files = validateInventory(JSON.parse(await readFile(inventoryPath, 'utf8')))
  let expandedSize = Buffer.byteLength(JSON.stringify({ formatVersion: 1, files }))
  const entries = []
  for (const file of files) {
    const stats = await validateManagedFile(unpacked, file)
    expandedSize += stats.size
    if (expandedSize > MAX_EXPANDED_BYTES) throw new Error('Update payload exceeds 1 GiB expanded size')
    entries.push({ file, path: join(unpacked, file) })
  }
  const zip = new AdmZip()
  for (const { file, path } of entries) zip.addFile(file, await readFile(path))
  zip.addFile('appFiles.json', Buffer.from(JSON.stringify({ formatVersion: 1, files })))
  await new Promise((resolveWrite, rejectWrite) => zip.writeZip(zipPath, error => error ? rejectWrite(error) : resolveWrite()))

  const metadata = {
    formatVersion: 1, id: 'sunrin-valley-launcher', version, changes,
    assets: {
      'darwin-arm64': await asset(dmgPath, 'dmg', version),
      'win32-x64': await asset(zipPath, 'zip', version)
    }
  }
  const metadataPath = join(directory, 'launcher-update.json')
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
  const sumNames = [dmgName]
  try { await regularFile(setupPath, 'Setup EXE'); sumNames.push(setupName) }
  catch (error) { if (!error.message.startsWith('Missing Setup EXE:')) throw error }
  sumNames.push(zipName, 'launcher-update.json')
  const sums = await Promise.all(sumNames.map(async name => `${await sha256(join(directory, name))}  ${name}`))
  await writeFile(join(directory, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`)
  return { zipPath, metadataPath, checksumsPath: join(directory, 'SHA256SUMS.txt') }
}

function parseArguments(args) {
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    if (!['--version', '--directory', '--changelog'].includes(key) || !args[i + 1] || options[key.slice(2)]) {
      throw new Error('Usage: node build-launcher-update.cjs --version VERSION --directory DIRECTORY --changelog FILE')
    }
    options[key.slice(2)] = args[i + 1]
  }
  if (Object.keys(options).length !== 3) throw new Error('Version, directory, and changelog are required')
  return options
}

if (require.main === module) {
  buildLauncherUpdate(parseArguments(process.argv.slice(2)))
    .then(result => process.stdout.write(`${result.zipPath}\n${result.metadataPath}\n${result.checksumsPath}\n`))
    .catch(error => { console.error(error); process.exitCode = 1 })
}

module.exports = { buildLauncherUpdate, parseChangelog, validateInventory }
