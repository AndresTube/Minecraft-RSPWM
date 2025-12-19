import type { ResourcePack, Vfs } from './types'
import { cloneVfs, readJson, readText, vfsGet, vfsSet, writeJson } from './vfs'

export type CmdInput = {
  itemId: string // e.g. "diamond_sword" or "minecraft:diamond_sword"
  customModelData: number
  namespace?: string // where to write generated models/textures; default "mrwm"
  texturePng: Uint8Array
}

export function applyCustomModelData(pack: ResourcePack, input: CmdInput): ResourcePack {
  const files = cloneVfs(pack.files)
  const ns = (input.namespace?.trim() || 'mrwm').toLowerCase()

  const { itemName } = parseNamespacedId(input.itemId)
  const cmd = input.customModelData
  if (!Number.isFinite(cmd) || cmd <= 0) {
    throw new Error('customModelData must be a positive number')
  }

  // Minecraft 1.21.4+ changed item model selection to use assets/*/items/*.json.
  // We branch based on pack_format (46+ indicates 1.21.4+ resource pack formats).
  const packFormat = guessPackFormat({ name: pack.name, files })
  if (packFormat !== null && packFormat >= 46) {
    applyCmdItemsModelDefinition_1_21_4(files, itemName, cmd, `${ns}:item/${itemName}_cmd_${cmd}`)
  } else {
    applyCmdLegacyOverrides(files, itemName, cmd, `${ns}:item/${itemName}_cmd_${cmd}`)
  }

  // Generated raw model + texture (still live under assets/*/models and assets/*/textures).
  const generatedModelPath = `assets/${ns}/models/item/${itemName}_cmd_${cmd}.json`
  writeJson(files, generatedModelPath, {
    parent: pickDefaultItemParent(itemName),
    textures: {
      layer0: `${ns}:item/${itemName}_cmd_${cmd}`,
    },
  })

  const texturePath = `assets/${ns}/textures/item/${itemName}_cmd_${cmd}.png`
  vfsSet(files, texturePath, input.texturePng)

  return { ...pack, files }
}

export type VanillaReplaceInput = {
  target: string // e.g. "item/diamond_sword.png" or "minecraft:item/diamond_sword" or full assets path
  replacementPng: Uint8Array
}

export function replaceVanillaTexture(pack: ResourcePack, input: VanillaReplaceInput): ResourcePack {
  const files = cloneVfs(pack.files)
  const targetPath = normalizeVanillaTextureTarget(input.target)
  vfsSet(files, targetPath, input.replacementPng)
  return { ...pack, files }
}

export function mixPacks(packsInPriorityOrder: ResourcePack[], outputName: string): ResourcePack {
  const out: Vfs = new Map()
  for (const pack of packsInPriorityOrder) {
    for (const [path, data] of pack.files.entries()) {
      out.set(path, data)
    }
  }
  return { name: outputName, files: out }
}

export type GlyphInput = {
  fontKey?: string // default "default"
  png: Uint8Array
  ascent?: number
  height?: number
}

export type GlyphResult = {
  pack: ResourcePack
  codepointHex: string
  char: string
  fontPath: string
  texturePath: string
}

export function addUnicodeGlyph(pack: ResourcePack, input: GlyphInput): GlyphResult {
  const files = cloneVfs(pack.files)

  const fontKey = (input.fontKey?.trim() || 'default').toLowerCase()
  const fontPath = `assets/minecraft/font/${fontKey}.json`

  const font = ensureFontJson(files, fontPath)

  const used = new Set<number>()
  for (const provider of font.providers) {
    if (!provider || typeof provider !== 'object') continue
    const chars = (provider as { chars?: unknown }).chars
    if (!Array.isArray(chars)) continue
    for (const row of chars) {
      if (typeof row !== 'string') continue
      for (const ch of row) {
        used.add(ch.codePointAt(0) ?? 0)
      }
    }
  }

  const codepoint = findFreePrivateUseCodepoint(used)
  const codepointHex = codepoint.toString(16).toUpperCase().padStart(4, '0')
  const char = String.fromCodePoint(codepoint)

  // Store texture under the `font` textures folder so Minecraft's font loader can find it
  const texturePath = `assets/minecraft/textures/font/glyph_${codepointHex}.png`
  vfsSet(files, texturePath, input.png)

  font.providers.push({
    type: 'bitmap',
    // Use the resource id (no extension) so the font loader resolves the PNG correctly
    file: `minecraft:font/glyph_${codepointHex}`,
    ascent: input.ascent ?? 7,
    height: input.height ?? 8,
    chars: [char],
  })

  writeJson(files, fontPath, font)

  return {
    pack: { ...pack, files },
    codepointHex,
    char,
    fontPath,
    texturePath,
  }
}

// ------------------------
// Internal helpers

type ItemModelJson = {
  parent?: string
  textures?: Record<string, string>
  overrides?: Array<{ predicate?: { custom_model_data?: number }; model?: string }>
}

type ItemsModelDefinition = {
  model: ItemsModel
  hand_animation_on_swap?: boolean
}

type ItemsModel =
  | {
      type: 'minecraft:model' | 'model'
      model: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [k: string]: any
    }
  | {
      type: 'minecraft:range_dispatch' | 'range_dispatch'
      property: 'minecraft:custom_model_data' | string
      index?: number
      scale?: number
      entries: Array<{ threshold: number; model: ItemsModel }>
      fallback?: ItemsModel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [k: string]: any
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | any

function ensureItemModelWithOverrides(files: Vfs, modelPath: string, itemName: string): ItemModelJson {
  const existingText = readText(files, modelPath)
  if (existingText) {
    const parsed = JSON.parse(existingText) as ItemModelJson
    return {
      ...parsed,
      overrides: Array.isArray(parsed.overrides) ? parsed.overrides : [],
    }
  }

  // When a pack overrides an item model, Minecraft will use it instead of the built-in model.
  // This default keeps vanilla rendering by pointing layer0 at the vanilla texture.
  return {
    parent: pickDefaultItemParent(itemName),
    textures: {
      layer0: `minecraft:item/${itemName}`,
    },
    overrides: [],
  }
}

function upsertOverride(
  overrides: Array<{ predicate?: { custom_model_data?: number }; model?: string }>,
  customModelData: number,
  modelId: string,
): Array<{ predicate?: { custom_model_data?: number }; model?: string }> {
  const next = [...overrides]
  const idx = next.findIndex((o) => o?.predicate?.custom_model_data === customModelData)

  const entry = {
    predicate: { custom_model_data: customModelData },
    model: modelId,
  }

  if (idx >= 0) next[idx] = entry
  else next.push(entry)

  // Keep overrides sorted for readability.
  next.sort((a, b) => (a?.predicate?.custom_model_data ?? 0) - (b?.predicate?.custom_model_data ?? 0))
  return next
}

function normalizeVanillaTextureTarget(target: string): string {
  const trimmed = target.trim()
  if (!trimmed) throw new Error('Texture target is required')

  if (trimmed.startsWith('assets/')) {
    return ensurePng(trimmed)
  }

  // Resource location style: minecraft:item/diamond_sword
  const match = /^([a-z0-9_.-]+):(.+)$/.exec(trimmed)
  if (match) {
    const ns = match[1]
    const subpath = match[2].replace(/^\//, '')
    return ensurePng(`assets/${ns}/textures/${subpath}`)
  }

  // Shorthand like "item/diamond_sword.png".
  return ensurePng(`assets/minecraft/textures/${trimmed.replace(/^\//, '')}`)
}

function ensurePng(path: string): string {
  return path.toLowerCase().endsWith('.png') ? path : `${path}.png`
}

function parseNamespacedId(id: string): { namespace: string; itemName: string } {
  const trimmed = id.trim()
  if (!trimmed) throw new Error('itemId is required')

  const match = /^([a-z0-9_.-]+):([a-z0-9_./-]+)$/.exec(trimmed.toLowerCase())
  if (match) return { namespace: match[1], itemName: match[2] }

  return { namespace: 'minecraft', itemName: trimmed.toLowerCase() }
}

type FontJson = {
  providers: unknown[]
}

function ensureFontJson(files: Vfs, fontPath: string): FontJson {
  const existing = readJson<FontJson>(files, fontPath)
  if (existing && Array.isArray(existing.providers)) {
    return existing
  }

  // Create minimal font json.
  return { providers: [] }
}

function findFreePrivateUseCodepoint(used: Set<number>): number {
  // Private Use Area: U+E000–U+F8FF
  // Start from E200 to avoid potential conflicts with common ranges
  for (let cp = 0xe200; cp <= 0xf8ff; cp += 1) {
    if (!used.has(cp)) return cp
  }
  // Fallback to beginning if needed
  for (let cp = 0xe000; cp < 0xe200; cp += 1) {
    if (!used.has(cp)) return cp
  }
  throw new Error('No free private-use Unicode codepoints left in U+E000–U+F8FF')
}

function pickDefaultItemParent(itemName: string): string {
  // Keep simple but correct-ish for common items.
  // Swords/tools should use handheld to avoid weird transforms.
  if (itemName.endsWith('_sword') || itemName.endsWith('_axe') || itemName.endsWith('_pickaxe') || itemName.endsWith('_shovel') || itemName.endsWith('_hoe')) {
    return 'minecraft:item/handheld'
  }
  return 'minecraft:item/generated'
}

function applyCmdLegacyOverrides(files: Vfs, itemName: string, cmd: number, overrideModelId: string): void {
  const baseModelPath = `assets/minecraft/models/item/${itemName}.json`
  const baseModel = ensureItemModelWithOverrides(files, baseModelPath, itemName)
  baseModel.overrides = upsertOverride(baseModel.overrides ?? [], cmd, overrideModelId)
  writeJson(files, baseModelPath, baseModel)
}

function applyCmdItemsModelDefinition_1_21_4(files: Vfs, itemName: string, cmd: number, overrideModelId: string): void {
  // In 1.21.4+ the game uses assets/minecraft/items/<item>.json to pick models.
  // We create/merge a range_dispatch on minecraft:custom_model_data (floats[0]).
  const itemDefPath = `assets/minecraft/items/${itemName}.json`

  const existingText = readText(files, itemDefPath)
  let doc: ItemsModelDefinition

  if (existingText) {
    doc = JSON.parse(existingText) as ItemsModelDefinition
  } else {
    doc = {
      model: {
        type: 'minecraft:model',
        model: `minecraft:item/${itemName}`,
      },
    }
  }

  const rootModel = doc.model

  // If it's already a range dispatch on CMD, merge into it. Otherwise wrap it.
  const dispatch: Extract<ItemsModel, { type: 'minecraft:range_dispatch' | 'range_dispatch' }> =
    rootModel && (rootModel.type === 'minecraft:range_dispatch' || rootModel.type === 'range_dispatch') && rootModel.property === 'minecraft:custom_model_data'
      ? (rootModel as Extract<ItemsModel, { type: 'minecraft:range_dispatch' | 'range_dispatch' }>)
      : {
          type: 'minecraft:range_dispatch',
          property: 'minecraft:custom_model_data',
          index: 0,
          entries: [],
          fallback: rootModel && typeof rootModel === 'object' ? rootModel : { type: 'minecraft:model', model: `minecraft:item/${itemName}` },
        }

  dispatch.entries = upsertRangeDispatchEntry(dispatch.entries ?? [], cmd, {
    type: 'minecraft:model',
    model: overrideModelId,
  })

  // Ensure fallback exists.
  dispatch.fallback = dispatch.fallback ?? { type: 'minecraft:model', model: `minecraft:item/${itemName}` }

  doc.model = dispatch
  writeJson(files, itemDefPath, doc)
}

function upsertRangeDispatchEntry(
  entries: Array<{ threshold: number; model: ItemsModel }>,
  threshold: number,
  model: ItemsModel,
): Array<{ threshold: number; model: ItemsModel }> {
  const next = [...entries]
  const idx = next.findIndex((e) => e.threshold === threshold)
  const entry = { threshold, model }
  if (idx >= 0) next[idx] = entry
  else next.push(entry)

  next.sort((a, b) => a.threshold - b.threshold)
  return next
}

// Helpful for debugging; not required for flow.
export function tryReadPackMcmetaDescription(pack: ResourcePack): string | null {
  const mcmeta = readJson<{ pack?: { description?: unknown } }>(pack.files, 'pack.mcmeta')
  const desc = mcmeta?.pack?.description
  return typeof desc === 'string' ? desc : null
}

export function guessPackFormat(pack: ResourcePack): number | null {
  const mcmetaText = readText(pack.files, 'pack.mcmeta')
  if (!mcmetaText) return null

  try {
    const parsed = JSON.parse(mcmetaText) as { pack?: { pack_format?: unknown } }
    const pf = parsed?.pack?.pack_format
    return typeof pf === 'number' ? pf : null
  } catch {
    return null
  }
}

export function fileExists(pack: ResourcePack, path: string): boolean {
  return vfsGet(pack.files, path) !== undefined
}
