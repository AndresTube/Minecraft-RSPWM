import type { Vfs } from './types'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8')

export function normalizePath(input: string): string {
  // Always store paths in ZIP/VFS form: forward slashes, no leading slash.
  const p = input.replaceAll('\\', '/').replace(/^\.(\/|$)/, '')
  return p.replace(/^\/+/, '')
}

export function cloneVfs(files: Vfs): Vfs {
  return new Map(files)
}

export function vfsGet(files: Vfs, path: string): Uint8Array | undefined {
  return files.get(normalizePath(path))
}

export function vfsHas(files: Vfs, path: string): boolean {
  return files.has(normalizePath(path))
}

export function vfsSet(files: Vfs, path: string, data: Uint8Array): void {
  files.set(normalizePath(path), data)
}

export function vfsDelete(files: Vfs, path: string): void {
  files.delete(normalizePath(path))
}

export function readText(files: Vfs, path: string): string | null {
  const bytes = vfsGet(files, path)
  if (!bytes) return null
  return textDecoder.decode(bytes)
}

export function writeText(files: Vfs, path: string, text: string): void {
  vfsSet(files, path, textEncoder.encode(text))
}

export function readJson<T>(files: Vfs, path: string): T | null {
  const text = readText(files, path)
  if (!text) return null
  return JSON.parse(text) as T
}

export function writeJson(files: Vfs, path: string, value: unknown): void {
  writeText(files, path, JSON.stringify(value, null, 2) + '\n')
}

export function countFiles(files: Vfs): number {
  return files.size
}

export function ensureParentDirsPath(path: string): string {
  // Not used to create directories in zip; kept for clarity where the hierarchy is.
  return normalizePath(path)
}
