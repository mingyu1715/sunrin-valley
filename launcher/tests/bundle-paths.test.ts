import { expect, it } from 'vitest'
import { join } from 'node:path'
import { bundledPackPaths } from '../src/main/bundle-paths'

it('packaged fallback selects the complete owned overlay, not only one startup file', () => {
  const paths = bundledPackPaths('/application/pack', true)
  expect(paths.overlay).toBe(join('/application/pack', 'Sunrin-Overlay.zip'))
  expect(paths.manifest).toBe(join('/application/pack', 'manifest.json'))
})
it('development fallback uses the current built overlay without a hardcoded release version', () => {
  const paths = bundledPackPaths('/source', false)
  expect(paths.overlay).toBe(join('/source', 'release/bundled/Sunrin-Overlay.zip'))
  expect(paths.manifest).toBe(join('/source', 'client-pack/manifest.json'))
})
