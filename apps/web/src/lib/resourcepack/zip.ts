import { unzip, zipSync } from 'fflate'
import type { ResourcePack, Vfs } from './types'
import { normalizePath } from './vfs'

export async function importZip(file: File): Promise<ResourcePack> {
  const bytes = new Uint8Array(await file.arrayBuffer())

  const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const files: Vfs = new Map()
  for (const [rawPath, data] of Object.entries(unzipped)) {
    const p = normalizePath(rawPath)
    if (!p || p.endsWith('/')) continue
    files.set(p, data)
  }

  return {
    name: stripZipExt(file.name) ?? 'resourcepack',
    files,
  }
}

export function exportZipBytes(files: Vfs): Uint8Array {
  const obj: Record<string, Uint8Array> = {}
  for (const [path, data] of files.entries()) {
    obj[path] = data
  }
  return zipSync(obj, { level: 6 })
}

export function downloadZip(bytes: Uint8Array, filename: string): void {
  // TypeScript's DOM typings are strict about BlobParts requiring ArrayBuffer.
  // Copy into a plain ArrayBuffer so this works regardless of ArrayBuffer vs SharedArrayBuffer.
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)

  const blob = new Blob([copy.buffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function stripZipExt(name: string): string | null {
  return name.toLowerCase().endsWith('.zip') ? name.slice(0, -4) : name
}
