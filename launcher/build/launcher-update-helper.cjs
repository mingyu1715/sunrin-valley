'use strict'
// This fixed helper ships with the launcher. Update payloads never supply executable scripts.
// ELECTRON_RUN_AS_NODE still wraps fs for ASAR. Swapping/cleaning bundles requires real files.
process.noAsar = true
const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const command = promisify(execFile)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
function inside(parent, child) { const rel = path.relative(parent, child); return !rel || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)) }
async function unlinked(target) {
  let cursor = path.resolve(target)
  for (;;) {
    try { if ((await fs.lstat(cursor)).isSymbolicLink()) throw new Error(`Linked update transaction path: ${cursor}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
    const parent = path.dirname(cursor); if (cursor === parent) break; cursor = parent
  }
}
async function canonicalExistingPrefix(value, links = 0) {
  if (links > 40) throw new Error('Too many protected data path links')
  const absolute = path.resolve(value)
  try { return await fs.realpath(absolute) } catch (error) { if (error.code !== 'ENOENT') throw error }
  try { if ((await fs.lstat(absolute)).isSymbolicLink()) return canonicalExistingPrefix(path.resolve(path.dirname(absolute), await fs.readlink(absolute)), links + 1) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const parent = path.dirname(absolute)
  return parent === absolute ? absolute : path.join(await canonicalExistingPrefix(parent, links), path.basename(absolute))
}
async function protectMacData(appPath, protectedDataPath) {
  if (typeof protectedDataPath !== 'string' || !protectedDataPath || !path.isAbsolute(protectedDataPath)) throw new Error('Invalid protected data path')
  const [app, data] = await Promise.all([canonicalExistingPrefix(appPath), canonicalExistingPrefix(protectedDataPath)])
  if (inside(app.toLowerCase(), data.toLowerCase()) || inside(data.toLowerCase(), app.toLowerCase())) throw new Error('Protected game data overlaps the application bundle')
}
async function exists(target) { try { await fs.lstat(target); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error } }
async function validateTransaction(tx) {
  if (!tx || tx.formatVersion !== 1 || !uuid.test(tx.id) || tx.nonce !== tx.id || !/^\d+\.\d+\.\d+$/.test(tx.version) || !/^\d+\.\d+\.\d+$/.test(tx.currentVersion)) throw new Error('Invalid transaction identity')
  for (const key of ['root', 'transactionPath', 'appPath', 'candidate', 'backup', 'executablePath', 'assetPath']) if (typeof tx[key] !== 'string' || path.resolve(tx[key]) !== tx[key]) throw new Error('Noncanonical transaction path')
  if (tx.transactionPath !== path.join(tx.root, 'launcher-updates/transactions', tx.id) || inside(tx.appPath, tx.root) || inside(tx.root, tx.appPath) || !inside(tx.appPath, tx.executablePath)) throw new Error('Unsafe transaction/application relationship')
  if (tx.platform !== 'darwin' || !tx.appPath.endsWith('.app') || tx.candidate !== path.join(path.dirname(tx.appPath), `.sunrin-update-${tx.id}.app`) || tx.backup !== path.join(path.dirname(tx.appPath), `.sunrin-backup-${tx.id}.app`) || !inside(path.join(tx.appPath, 'Contents/MacOS'), tx.executablePath)) throw new Error('Unsafe Mac update paths')
  if (tx.protectedDataPath !== undefined) await protectMacData(tx.appPath, tx.protectedDataPath)
  if (path.dirname(tx.assetPath) !== path.join(tx.root, 'launcher-updates/downloads') || !/^[0-9a-f]{64}$/.test(tx.assetSha256) || !Number.isSafeInteger(tx.assetSize) || tx.assetSize < 1) throw new Error('Unsafe update download asset')
  await unlinked(tx.assetPath); if (!(await fs.lstat(tx.assetPath)).isFile()) throw new Error('Update download is not a regular file')
  for (const key of ['transactionPath', 'appPath', 'candidate', 'backup', 'executablePath', 'assetPath']) await unlinked(tx[key])
  if (await exists(tx.backup)) throw new Error('Update backup already exists')
}
async function validateBundle(bundle, version, expectedRelative) {
  const plist = path.join(bundle, 'Contents/Info.plist')
  const get = async key => (await command('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist])).stdout.trim()
  if (await get('CFBundleIdentifier') !== 'kr.sunrinvalley.launcher' || await get('CFBundleShortVersionString') !== version) throw new Error('Bundle identity/version mismatch')
  const name = await get('CFBundleExecutable')
  if (!name || /[/\\]/.test(name)) throw new Error('Invalid bundle executable')
  const binary = path.join(bundle, 'Contents/MacOS', name)
  if (path.relative(bundle, binary) !== expectedRelative) throw new Error('Bundle executable changed')
  await unlinked(binary)
  if (!(await command('/usr/bin/lipo', ['-archs', binary])).stdout.trim().split(/\s+/).includes('arm64')) throw new Error('Bundle lacks arm64 executable')
  await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle])
  async function visit(target) {
    const stat = await fs.lstat(target)
    if (stat.isSymbolicLink()) { if (!inside(bundle, await fs.realpath(target))) throw new Error('External bundle link'); return }
    if (stat.isDirectory()) for (const child of await fs.readdir(target)) await visit(path.join(target, child))
    else if (!stat.isFile()) throw new Error('Nonregular bundle entry')
  }
  await visit(bundle)
}
function alive(pid) { try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; throw error } }
async function waitForParent(pid) {
  if (!Number.isSafeInteger(pid) || pid < 2 || pid === process.pid) throw new Error('Invalid parent PID')
  const deadline = Date.now() + 120000
  while (alive(pid)) { if (Date.now() >= deadline) throw new Error('Launcher did not exit'); await pause(200) }
}
async function start(executable, args) {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: 'ignore', env })
    child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(child.pid) })
  })
}
async function stop(pid) {
  if (!pid || !alive(pid)) return
  process.kill(pid, 'SIGTERM'); const deadline = Date.now() + 5000
  while (alive(pid) && Date.now() < deadline) await pause(100)
  if (alive(pid)) { process.kill(pid, 'SIGKILL'); for (let i = 0; i < 50 && alive(pid); i++) await pause(100) }
  if (alive(pid)) throw new Error('Updated launcher could not be stopped')
}
async function waitForHealth(tx, pid) {
  const deadline = Date.now() + 90000, health = path.join(tx.transactionPath, 'healthy.json')
  while (Date.now() < deadline) {
    try {
      await unlinked(health)
      if ((await fs.lstat(health)).size <= 4096) {
        const value = JSON.parse(await fs.readFile(health, 'utf8'))
        if (value.nonce === tx.nonce && value.version === tx.version && value.executablePath === tx.executablePath && value.pid === pid) return true
      }
    } catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error }
    if (!alive(pid)) return false
    await pause(250)
  }
  return false
}
async function applyMacTransaction(tx, boundary = {}) {
  await validateTransaction(tx)
  const io = { waitForParent, validateCandidate: async value => { const relative = path.relative(value.appPath, value.executablePath); await validateBundle(value.appPath, value.currentVersion, relative); await validateBundle(value.candidate, value.version, relative) }, start, stop, waitForHealth, ...boundary }
  await io.validateCandidate(tx)
  if (!Number.isSafeInteger(tx.parentPid) || tx.parentPid < 2 || tx.parentPid === process.pid) throw new Error('Invalid parent PID')
  const ready = path.join(tx.transactionPath, 'helper-ready.json'), pending = path.join(tx.transactionPath, `helper-ready-${process.pid}.tmp`)
  await unlinked(ready); await fs.writeFile(pending, JSON.stringify({ id: tx.id, parentPid: tx.parentPid, helperPid: process.pid }), { flag: 'wx', mode: 0o600 }); await fs.rename(pending, ready)
  await io.waitForParent(tx.parentPid)
  // Recheck after waiting: a second updater or user move must not alter this transaction.
  await validateTransaction(tx)
  let backedUp = false, applied = false, childPid
  try {
    await fs.rename(tx.appPath, tx.backup); backedUp = true
    await fs.rename(tx.candidate, tx.appPath); applied = true
    childPid = await io.start(tx.executablePath, ['--launcher-update-token', tx.id])
    if (!await io.waitForHealth(tx, childPid)) throw new Error('Launcher update health confirmation failed')
  } catch (error) {
    if (childPid) await io.stop(childPid)
    if (applied) await fs.rename(tx.appPath, tx.candidate)
    if (backedUp) { await fs.rename(tx.backup, tx.appPath); await io.start(tx.executablePath, []) }
    await fs.writeFile(path.join(tx.transactionPath, 'result.json'), JSON.stringify({ status: 'rolled-back', message: String(error.message) }))
    throw error
  }
  // Only this transaction's old bundle is removed, after durable acknowledgement.
  let cleanupPending = false
  try { await unlinked(tx.backup); await fs.rm(tx.backup, { recursive: true }) } catch { cleanupPending = true }
  try {
    await unlinked(tx.assetPath)
    if ((await fs.lstat(tx.assetPath)).size !== tx.assetSize) throw new Error('Download changed before cleanup')
    const hash = createHash('sha256'); for await (const chunk of createReadStream(tx.assetPath)) hash.update(chunk)
    if (hash.digest('hex') !== tx.assetSha256) throw new Error('Download changed before cleanup')
    await fs.unlink(tx.assetPath)
  } catch { cleanupPending = true }
  try { await fs.writeFile(path.join(tx.transactionPath, 'result.json'), JSON.stringify({ status: 'healthy', version: tx.version, cleanupPending })) } catch { /* A cleanup report failure must not roll back a healthy app. */ }
}
module.exports = { applyMacTransaction, validateTransaction, waitForHealth }
if (require.main === module) {
  ;(async () => {
    if (process.platform !== 'darwin') throw new Error('Mac helper invoked on another platform')
    const transactionFile = process.argv[2]
    if (transactionFile !== path.join(__dirname, 'transaction.json')) throw new Error('Helper transaction path mismatch')
    await unlinked(transactionFile)
    if ((await fs.lstat(transactionFile)).size > 1024 * 1024) throw new Error('Transaction too large')
    const tx = JSON.parse(await fs.readFile(transactionFile, 'utf8'))
    if (tx.transactionPath !== __dirname) throw new Error('Helper is outside transaction')
    tx.parentPid = Number(process.argv[3]); await applyMacTransaction(tx)
  })().catch(error => { console.error(error); process.exitCode = 1 })
}
