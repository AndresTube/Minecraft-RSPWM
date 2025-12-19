import type { ResourcePack } from './types'
import { cloneVfs, readJson, vfsDelete, writeJson } from './vfs'

export type ConversionResult = {
  pack: ResourcePack
  changes: string[]
  warnings: string[]
}

export function convertPackFormat(pack: ResourcePack, targetFormat: number): ConversionResult {
  const changes: string[] = []
  const warnings: string[] = []
  const files = cloneVfs(pack.files)

  const currentFormat = readJson<{ pack?: { pack_format?: number } }>(files, 'pack.mcmeta')?.pack?.pack_format ?? 0

  if (currentFormat === 0) {
    warnings.push('Could not determine current pack format')
  }

  if (currentFormat === targetFormat) {
    warnings.push('Pack is already at target format')
    return { pack, changes, warnings }
  }

  // Update pack.mcmeta
  const mcmeta = readJson<{ pack?: { pack_format?: number; description?: string } }>(files, 'pack.mcmeta')
  if (mcmeta?.pack) {
    mcmeta.pack.pack_format = targetFormat
    writeJson(files, 'pack.mcmeta', mcmeta)
    changes.push(`Updated pack.mcmeta pack_format: ${currentFormat} → ${targetFormat}`)
  }

  // Convert from legacy (< 46) to 1.21.4+ (>= 46)
  if (currentFormat < 46 && targetFormat >= 46) {
    const converted = convertLegacyToModern(files)
    changes.push(...converted.changes)
    warnings.push(...converted.warnings)
  }

  // Convert from modern (>= 46) to legacy (< 46)
  if (currentFormat >= 46 && targetFormat < 46) {
    const converted = convertModernToLegacy(files)
    changes.push(...converted.changes)
    warnings.push(...converted.warnings)
  }

  return {
    pack: { ...pack, files },
    changes,
    warnings,
  }
}

type ConversionStep = {
  changes: string[]
  warnings: string[]
}

function convertLegacyToModern(files: Map<string, Uint8Array>): ConversionStep {
  const changes: string[] = []
  const warnings: string[] = []

  // Find all item models with custom_model_data overrides
  const itemModels = Array.from(files.keys()).filter(
    path => path.startsWith('assets/') && path.includes('/models/item/') && path.endsWith('.json')
  )

  for (const modelPath of itemModels) {
    const model = readJson<{
      parent?: string
      textures?: Record<string, string>
      overrides?: Array<{ predicate?: { custom_model_data?: number }; model?: string }>
    }>(files, modelPath)

    if (!model?.overrides || model.overrides.length === 0) continue

    // Extract namespace and item name from path
    // e.g., assets/minecraft/models/item/diamond_sword.json
    const match = /^assets\/([^/]+)\/models\/item\/(.+)\.json$/.exec(modelPath)
    if (!match) continue

    const namespace = match[1]
    const itemName = match[2]

    // Create new items definition file
    const itemDefPath = `assets/${namespace}/items/${itemName}.json`

    // Build range_dispatch entries from overrides
    const entries = model.overrides
      .filter(o => typeof o?.predicate?.custom_model_data === 'number')
      .map(o => ({
        threshold: o.predicate!.custom_model_data!,
        model: {
          type: 'minecraft:model' as const,
          model: o.model || '',
        },
      }))
      .sort((a, b) => a.threshold - b.threshold)

    if (entries.length > 0) {
      const itemDef = {
        model: {
          type: 'minecraft:range_dispatch' as const,
          property: 'minecraft:custom_model_data',
          index: 0,
          entries,
          fallback: {
            type: 'minecraft:model' as const,
            model: `${namespace}:item/${itemName}`,
          },
        },
      }

      writeJson(files, itemDefPath, itemDef)
      changes.push(`Converted ${modelPath} overrides to ${itemDefPath}`)

      // Remove overrides from original model
      delete model.overrides
      writeJson(files, modelPath, model)
      changes.push(`Removed overrides from ${modelPath}`)
    }
  }

  if (changes.length === 0) {
    warnings.push('No legacy item model overrides found to convert')
  }

  return { changes, warnings }
}

function convertModernToLegacy(files: Map<string, Uint8Array>): ConversionStep {
  const changes: string[] = []
  const warnings: string[] = []

  // Find all items definition files
  const itemDefs = Array.from(files.keys()).filter(
    path => path.startsWith('assets/') && path.includes('/items/') && path.endsWith('.json')
  )

  for (const itemDefPath of itemDefs) {
    const itemDef = readJson<{
      model?: {
        type?: string
        property?: string
        entries?: Array<{ threshold?: number; model?: { model?: string } }>
        fallback?: unknown
      }
    }>(files, itemDefPath)

    if (!itemDef?.model) continue

    const model = itemDef.model

    // Only convert range_dispatch on custom_model_data
    if (
      (model.type !== 'minecraft:range_dispatch' && model.type !== 'range_dispatch') ||
      model.property !== 'minecraft:custom_model_data'
    ) {
      continue
    }

    // Extract namespace and item name from path
    // e.g., assets/minecraft/items/diamond_sword.json
    const match = /^assets\/([^/]+)\/items\/(.+)\.json$/.exec(itemDefPath)
    if (!match) continue

    const namespace = match[1]
    const itemName = match[2]

    const modelPath = `assets/${namespace}/models/item/${itemName}.json`

    // Build overrides from entries
    const overrides = (model.entries || [])
      .filter(e => typeof e.threshold === 'number' && e.model?.model)
      .map(e => ({
        predicate: { custom_model_data: e.threshold! },
        model: e.model!.model!,
      }))
      .sort((a, b) => a.predicate.custom_model_data - b.predicate.custom_model_data)

    if (overrides.length > 0) {
      // Read or create base model
      let baseModel = readJson<{
        parent?: string
        textures?: Record<string, string>
        overrides?: Array<{ predicate?: { custom_model_data?: number }; model?: string }>
      }>(files, modelPath)

      if (!baseModel) {
        baseModel = {
          parent: 'minecraft:item/generated',
          textures: {
            layer0: `${namespace}:item/${itemName}`,
          },
        }
      }

      baseModel.overrides = overrides
      writeJson(files, modelPath, baseModel)
      changes.push(`Converted ${itemDefPath} to ${modelPath} with overrides`)

      // Delete the items definition file
      vfsDelete(files, itemDefPath)
      changes.push(`Removed ${itemDefPath}`)
    }
  }

  if (changes.length === 0) {
    warnings.push('No modern item definitions found to convert')
  }

  return { changes, warnings }
}

export function autoUpgradePack(pack: ResourcePack): ConversionResult {
  const currentFormat = readJson<{ pack?: { pack_format?: number } }>(pack.files, 'pack.mcmeta')?.pack?.pack_format

  if (!currentFormat) {
    return {
      pack,
      changes: [],
      warnings: ['Could not determine current pack format'],
    }
  }

  // Always upgrade to latest (64 as of 1.21.7-1.21.8)
  const targetFormat = 64

  if (currentFormat >= targetFormat) {
    return {
      pack,
      changes: [],
      warnings: ['Pack is already at latest format'],
    }
  }

  return convertPackFormat(pack, targetFormat)
}

export function detectPackFormat(pack: ResourcePack): number | null {
  return readJson<{ pack?: { pack_format?: number } }>(pack.files, 'pack.mcmeta')?.pack?.pack_format ?? null
}
