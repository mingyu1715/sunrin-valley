import type { FileHash } from './files'
export interface PackFile { path: string; url: string; hash: FileHash; size?: number }
export interface PackManifest {
  formatVersion: 1; id: string; version: string; minecraft: string; forge: string
  base: { url: string; sha256: string; filename: string; fileId: number }
  files: PackFile[]
}
export interface BundlePaths { manifest: string; prism: string; customPack: string; startup: string }
export interface RuntimePaths { java: string; prism: string }
export interface InstallReceipt {
  formatVersion: 1; packVersion: string; fingerprint: string; managed: Record<string, FileHash>; runtime: RuntimePaths
}
export type Progress = (message: string, progress: number | null) => void
