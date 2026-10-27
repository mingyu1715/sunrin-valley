#!/usr/bin/env node
// Use the native Gradle wrapper on each developer platform; no global Gradle required.
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const root = resolve(__dirname, '..')
const windows = process.platform === 'win32'
const command = windows ? 'sunrin-core\\gradlew.bat' : 'sh'
const args = windows ? ['-p', 'sunrin-core', 'build'] : ['sunrin-core/gradlew', '-p', 'sunrin-core', 'build']
const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: windows, env: process.env })
if (result.error) { console.error('Core build could not start:', result.error.message); process.exit(1) }
process.exit(result.status === null ? 1 : result.status)
