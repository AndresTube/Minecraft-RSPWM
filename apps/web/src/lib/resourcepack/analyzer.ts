import type { ResourcePack } from './types'

export type PackStats = {
  totalFiles: number
  totalSize: number
  byType: Record<string, { count: number; size: number }>
  byNamespace: Record<string, number>
  largestFiles: Array<{ path: string; size: number }>
}

export type FileConflict = {
  path: string
  sources: string[]
}

export function analyzePack(pack: ResourcePack): PackStats {
  const stats: PackStats = {
    totalFiles: 0,
    totalSize: 0,
    byType: {},
    byNamespace: {},
    largestFiles: [],
  }

  const filesWithSizes: Array<{ path: string; size: number }> = []

  for (const [path, data] of pack.files.entries()) {
    const size = data.byteLength
    stats.totalFiles++
    stats.totalSize += size

    filesWithSizes.push({ path, size })

    // Group by file extension
    const ext = getFileExtension(path)
    if (!stats.byType[ext]) {
      stats.byType[ext] = { count: 0, size: 0 }
    }
    stats.byType[ext].count++
    stats.byType[ext].size += size

    // Group by namespace
    const namespace = extractNamespace(path)
    if (namespace) {
      stats.byNamespace[namespace] = (stats.byNamespace[namespace] || 0) + 1
    }
  }

  // Find largest files
  filesWithSizes.sort((a, b) => b.size - a.size)
  stats.largestFiles = filesWithSizes.slice(0, 10)

  return stats
}

export function findUnusedFiles(pack: ResourcePack): string[] {
  const unused: string[] = []
  const referenced = new Set<string>()

  // Track all referenced files by scanning JSON files
  for (const [path, data] of pack.files.entries()) {
    if (path.endsWith('.json')) {
      try {
        const content = new TextDecoder().decode(data)
        const json = JSON.parse(content)

        // Extract referenced resources from JSON (normalize extensions/paths)
        extractReferences(json, referenced)
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  // Check which files are not referenced
  for (const path of pack.files.keys()) {
    // Skip metadata files
    if (path === 'pack.mcmeta' || path === 'pack.png') continue

    // Skip JSON files (they're the referrers)
    if (path.endsWith('.json')) continue

    // Convert path to resource location format
    const resourceId = pathToResourceId(path)
    if (!resourceId) continue

    // Check if this resource is referenced
    if (!referenced.has(resourceId) && !referenced.has(path) && !referenced.has(resourceId + '.png') && !referenced.has(resourceId + '.json')) {
      unused.push(path)
    }
  }

  return unused
}

export function findDuplicateTextures(pack: ResourcePack): Array<{ paths: string[]; size: number }> {
  const hashMap = new Map<string, string[]>()

  // Only check texture files
  for (const [path, data] of pack.files.entries()) {
    if (!path.endsWith('.png')) continue

    const hash = simpleHash(data)
    if (!hashMap.has(hash)) {
      hashMap.set(hash, [])
    }
    hashMap.get(hash)!.push(path)
  }

  // Find duplicates
  const duplicates: Array<{ paths: string[]; size: number }> = []
  for (const paths of hashMap.values()) {
    if (paths.length > 1) {
      const size = pack.files.get(paths[0])?.byteLength || 0
      duplicates.push({ paths, size })
    }
  }

  return duplicates.sort((a, b) => b.size - a.size)
}

export function detectConflicts(packs: ResourcePack[]): FileConflict[] {
  const pathToSources = new Map<string, Set<string>>()

  for (const pack of packs) {
    for (const path of pack.files.keys()) {
      if (!pathToSources.has(path)) {
        pathToSources.set(path, new Set())
      }
      pathToSources.get(path)!.add(pack.name)
    }
  }

  const conflicts: FileConflict[] = []
  for (const [path, sources] of pathToSources.entries()) {
    if (sources.size > 1) {
      conflicts.push({ path, sources: Array.from(sources) })
    }
  }

  return conflicts
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// Helper functions

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1) return 'no-extension'
  return path.slice(lastDot + 1).toLowerCase()
}

function extractNamespace(path: string): string | null {
  const match = /^assets\/([^/]+)\//.exec(path)
  return match ? match[1] : null
}

function pathToResourceId(path: string): string | null {
  // Convert assets/namespace/textures/path/file.png to namespace:path/file
  // or assets/namespace/models/path/file.json to namespace:path/file
  const match = /^assets\/([^/]+)\/(textures|models|sounds)\/(.+)\.(png|json|ogg)$/.exec(path)
  if (!match) return null

  const namespace = match[1]
  const pathPart = match[3]

  return `${namespace}:${pathPart}`
}

function extractReferences(obj: unknown, refs: Set<string>): void {
  if (typeof obj === 'string') {
    // Normalize common resource reference forms and add both raw and normalized forms.
    const s = obj.trim()

    // assets/namespace/... form
    const assetsMatch = /^assets\/([^/]+)\/(textures|models|sounds)\/(.+?)\.(png|json|ogg)$/.exec(s)
    if (assetsMatch) {
      const ns = assetsMatch[1]
      const pathPart = assetsMatch[3]
      refs.add(s)
      refs.add(`${ns}:${pathPart}`)
      return
    }

    // namespaced resource location form: namespace:path/to/file(.ext)?
    const nsMatch = /^([a-z0-9_.-]+):(.+?)(?:\.(png|json|ogg))?$/.exec(s)
    if (nsMatch) {
      const ns = nsMatch[1]
      const pathPart = nsMatch[2]
      refs.add(s)
      refs.add(`${ns}:${pathPart}`)
      return
    }

    // Fallback: add raw string if it looks like a path
    if (s.includes('/') || s.includes(':')) refs.add(s)
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractReferences(item, refs)
    }
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      extractReferences(value, refs)
    }
  }
}

function simpleHash(data: Uint8Array): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0
  }
  return hash.toString(36)
}
