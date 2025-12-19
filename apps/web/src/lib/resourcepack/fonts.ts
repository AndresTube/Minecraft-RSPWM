import type { ResourcePack, FontDefinition, BitmapFontProvider } from './types'

const FONT_BASE_PATH = 'assets/minecraft/font/'
const TEXTURE_BASE_PATH = 'assets/minecraft/textures/font/'

/**
 * Reads a font definition file from the pack
 */
export function readFontFile(pack: ResourcePack, fontName: string): FontDefinition | null {
  const path = `${FONT_BASE_PATH}${fontName}.json`
  const data = pack.files.get(path)
  if (!data) return null

  try {
    const text = new TextDecoder().decode(data)
    return JSON.parse(text) as FontDefinition
  } catch {
    return null
  }
}

/**
 * Writes a font definition file to the pack
 */
export function writeFontFile(
  pack: ResourcePack,
  fontName: string,
  definition: FontDefinition
): ResourcePack {
  const path = `${FONT_BASE_PATH}${fontName}.json`
  const json = JSON.stringify(definition, null, 2)
  const data = new TextEncoder().encode(json)

  const newFiles = new Map(pack.files)
  newFiles.set(path, data)

  return { ...pack, files: newFiles }
}

/**
 * Lists all font files in the pack
 */
export function listFontFiles(pack: ResourcePack): string[] {
  const fonts: string[] = []
  for (const path of pack.files.keys()) {
    if (path.startsWith(FONT_BASE_PATH) && path.endsWith('.json')) {
      const name = path.slice(FONT_BASE_PATH.length, -5)
      fonts.push(name)
    }
  }
  return fonts.sort()
}

/**
 * Lists all font texture files in the pack
 */
export function listFontTextures(pack: ResourcePack): string[] {
  const textures: string[] = []
  for (const path of pack.files.keys()) {
    if (path.startsWith(TEXTURE_BASE_PATH) && path.endsWith('.png')) {
      const name = path.slice(TEXTURE_BASE_PATH.length)
      textures.push(name)
    }
  }
  return textures.sort()
}

/**
 * Creates a basic bitmap font provider
 */
export function createBitmapProvider(
  textureName: string,
  chars: string[],
  height = 8,
  ascent = 7
): BitmapFontProvider {
  return {
    type: 'bitmap',
    file: `minecraft:font/${textureName}`,
    height,
    ascent,
    chars
  }
}

/**
 * Creates a default font definition with a bitmap provider
 */
export function createDefaultFontDefinition(
  textureName: string,
  chars: string[]
): FontDefinition {
  return {
    providers: [createBitmapProvider(textureName, chars)]
  }
}

/**
 * Adds a bitmap provider to an existing font definition
 */
export function addBitmapProvider(
  definition: FontDefinition,
  provider: BitmapFontProvider
): FontDefinition {
  return {
    providers: [...definition.providers, provider]
  }
}

/**
 * Generates common character sets
 */
export const CHARACTER_PRESETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  punctuation: '!?,.:;\'"-',
  symbols: '()[]{}@#$%&*+=/<>\\|~`^_',

  basic: [
    'ABCDEFGHIJKLMNOP',
    'QRSTUVWXYZabcdef',
    'ghijklmnopqrstuv',
    'wxyz0123456789'
  ],

  full: [
    'ABCDEFGHIJKLMNOP',
    'QRSTUVWXYZabcdef',
    'ghijklmnopqrstuv',
    'wxyz0123456789!?',
    '.,:;\'"()-+=/\\<>@',
    '#$%&*[]{}|~`^_ '
  ],

  numbersOnly: ['0123456789']
}

/**
 * Splits a string into chunks of a given size for char mapping
 */
export function splitIntoRows(chars: string, rowSize: number): string[] {
  const rows: string[] = []
  for (let i = 0; i < chars.length; i += rowSize) {
    rows.push(chars.slice(i, i + rowSize))
  }
  return rows
}

/**
 * Validates a font definition
 */
export function validateFontDefinition(definition: FontDefinition): string[] {
  const errors: string[] = []

  if (!definition.providers || !Array.isArray(definition.providers)) {
    errors.push('Font definition must have a "providers" array')
    return errors
  }

  if (definition.providers.length === 0) {
    errors.push('Font definition must have at least one provider')
  }

  definition.providers.forEach((provider, index) => {
    if (!provider.type) {
      errors.push(`Provider ${index} is missing "type" field`)
      return
    }

    if (provider.type === 'bitmap') {
      const bp = provider as BitmapFontProvider

      if (!bp.file) {
        errors.push(`Bitmap provider ${index} is missing "file" field`)
      }

      if (typeof bp.height !== 'number' || bp.height <= 0) {
        errors.push(`Bitmap provider ${index} has invalid "height" (must be a positive number)`)
      }

      if (typeof bp.ascent !== 'number') {
        errors.push(`Bitmap provider ${index} has invalid "ascent" (must be a number)`)
      }

      if (!Array.isArray(bp.chars) || bp.chars.length === 0) {
        errors.push(`Bitmap provider ${index} must have a non-empty "chars" array`)
      }
    }
  })

  return errors
}

/**
 * Gets the texture path for a font file reference
 */
export function getTexturePathFromFile(fileReference: string): string {
  // Handle both "minecraft:font/texture.png" and "font/texture.png"
  if (fileReference.startsWith('minecraft:')) {
    return `assets/minecraft/textures/${fileReference.slice(10)}`
  }
  return `assets/minecraft/textures/${fileReference}`
}

/**
 * Uploads a font texture to the pack
 */
export async function uploadFontTexture(
  pack: ResourcePack,
  file: File
): Promise<ResourcePack> {
  const data = new Uint8Array(await file.arrayBuffer())
  const path = `${TEXTURE_BASE_PATH}${file.name}`

  const newFiles = new Map(pack.files)
  newFiles.set(path, data)

  return { ...pack, files: newFiles }
}

/**
 * Creates a single-character bitmap provider for Unicode mapping
 */
export function createUnicodeBitmapProvider(
  unicodeChar: string,
  textureName: string,
  height = 8,
  ascent = 7
): BitmapFontProvider {
  return {
    type: 'bitmap',
    file: `minecraft:font/${textureName}`,
    height,
    ascent,
    chars: [unicodeChar]
  }
}

/**
 * Adds a Unicode glyph mapping to the default font
 */
export function addUnicodeGlyph(
  pack: ResourcePack,
  unicodeChar: string,
  textureName: string,
  height = 8,
  ascent = 7,
  fontName = 'default'
): ResourcePack {
  const currentFont = readFontFile(pack, fontName) || { providers: [] }
  const provider = createUnicodeBitmapProvider(unicodeChar, textureName, height, ascent)

  const updatedFont: FontDefinition = {
    providers: [...currentFont.providers, provider]
  }

  return writeFontFile(pack, fontName, updatedFont)
}
