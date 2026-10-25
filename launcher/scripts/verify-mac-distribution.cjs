const { execFileSync } = require('node:child_process')
const { resolve, join } = require('node:path')
const { existsSync, lstatSync, readlinkSync, mkdtempSync, mkdirSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')

// A valid disk-image checksum alone does not validate the app inside it.
if (process.platform !== 'darwin') throw new Error('macOS distribution verification requires macOS')
const { version, build } = require('../package.json')
const output = resolve(__dirname, '..', build.directories.output)
const looseApp = join(output, 'mac-arm64', `${build.productName}.app`)
const dmg = process.argv[2] ? resolve(process.argv[2]) : join(output, `Sunrin-Valley-${version}-mac-arm64.dmg`)
for (const file of [looseApp, dmg]) if (!existsSync(file)) throw new Error(`Missing distribution: ${file}`)
function verifyApp(app) {
  if (!lstatSync(app).isDirectory() || lstatSync(app).isSymbolicLink()) throw new Error('Expected a real app bundle')
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' })
  const value = key => execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
  if (value('CFBundleShortVersionString') !== version) throw new Error('Packaged app version differs from package.json')
  if (value('CFBundleIdentifier') !== build.appId) throw new Error('Unexpected application identifier')
  const architecture = execFileSync('/usr/bin/lipo', ['-archs', join(app, 'Contents/MacOS', build.productName)], { encoding: 'utf8' }).trim()
  if (architecture !== 'arm64') throw new Error(`Unexpected macOS architecture: ${architecture}`)
}
verifyApp(looseApp)
execFileSync('/usr/bin/hdiutil', ['verify', dmg], { stdio: 'inherit' })
const temporary = mkdtempSync(join(tmpdir(), 'sunrin-dmg-verify-'))
const mount = join(temporary, 'volume')
mkdirSync(mount)
let attached = false
try {
  execFileSync('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, dmg], { stdio: 'inherit' })
  attached = true
  const link = join(mount, 'Applications')
  if (!lstatSync(link).isSymbolicLink() || readlinkSync(link) !== '/Applications') throw new Error('DMG Applications shortcut is incorrect')
  verifyApp(join(mount, `${build.productName}.app`))
  console.log('PASS: actual DMG app signature, identifier, version, architecture and Applications shortcut')
} finally {
  // Never remove the mount directory recursively unless detachment succeeded.
  if (attached) execFileSync('/usr/bin/hdiutil', ['detach', mount], { stdio: 'inherit' })
  rmSync(temporary, { recursive: true, force: true })
}
console.log('This integrity check does not imply Developer ID authentication or Apple notarization.')
