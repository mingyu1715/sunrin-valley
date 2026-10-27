import { join } from 'node:path'
import type { BundlePaths } from './pack-types'

export function bundledPackPaths(root: string, packaged: boolean): BundlePaths {
  return packaged ? {
    manifest: join(root, 'manifest.json'), prism: join(root, 'prism-runtime.json'),
    customPack: join(root, 'Sunrin-Custom.zip'), startup: join(root, 'sunrin_items.js'),
    overlay: join(root, 'Sunrin-Overlay.zip')
  } : {
    manifest: join(root, 'client-pack/manifest.json'), prism: join(root, 'client-pack/prism-runtime.json'),
    customPack: join(root, 'resourcepacks/dist/Sunrin-Custom.zip'), startup: join(root, 'kubejs-custom/startup_scripts/sunrin_items.js'),
    overlay: join(root, 'release/bundled/Sunrin-Overlay.zip')
  }
}
