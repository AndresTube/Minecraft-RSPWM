import type { ResourcePack } from './types'
import { cloneVfs, readJson, writeJson } from './vfs'
import { findByPackFormat } from './versioning'

export type PackMetadata = {
  packFormat: number
  description: string
}

export type PackSettings = {
  name: string
  versionId: string | 'custom'
  packFormat: number
  description: string
}

export function defaultPackSettings(): PackSettings {
  // Pick a modern default; user can change it.
  const packFormat = 34
  return {
    name: 'resourcepack',
    versionId: findByPackFormat(packFormat)?.id ?? 'custom',
    packFormat,
    description: 'Generated with Minecraft Resource Pack Web Manager',
  }
}

export function createEmptyPack(settings: PackSettings): ResourcePack {
  const files = new Map<string, Uint8Array>()
  const pack: ResourcePack = {
    name: settings.name.trim() || 'resourcepack',
    files,
  }
  return applyPackSettings(pack, settings)
}

export function readPackMetadata(pack: ResourcePack): PackMetadata | null {
  const mcmeta = readJson<{ pack?: { pack_format?: unknown; description?: unknown } }>(pack.files, 'pack.mcmeta')
  const pf = mcmeta?.pack?.pack_format
  const desc = mcmeta?.pack?.description

  if (typeof pf !== 'number') return null
  if (typeof desc !== 'string') return { packFormat: pf, description: '' }
  return { packFormat: pf, description: desc }
}

export function applyPackSettings(pack: ResourcePack, settings: PackSettings): ResourcePack {
  const name = settings.name.trim() || pack.name || 'resourcepack'
  const packFormat = Number(settings.packFormat)
  if (!Number.isFinite(packFormat) || packFormat <= 0) {
    throw new Error('pack_format must be a positive number')
  }

  const files = cloneVfs(pack.files)
  writeJson(files, 'pack.mcmeta', {
    pack: {
      pack_format: packFormat,
      description: settings.description ?? '',
    },
  })

  return {
    ...pack,
    name,
    files,
  }
}
