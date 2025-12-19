/**
 * Unicode Private Use Area (PUA) ranges for custom characters
 * These ranges are reserved for private use and won't conflict with standard characters
 */

// Primary PUA range: U+E000 to U+F8FF (6,400 characters)
const PUA_START = 0xe000
const PUA_END = 0xf8ff

// Secondary PUA range: U+F0000 to U+FFFFD (65,534 characters)
const PUA_SUPPLEMENTARY_START = 0xf0000
const PUA_SUPPLEMENTARY_END = 0xffffd

export type UnicodeGlyph = {
  char: string
  codepoint: number
  texturePath: string
  height: number
  ascent: number
}

/**
 * Converts a codepoint to a Unicode character
 */
export function codepointToChar(codepoint: number): string {
  return String.fromCodePoint(codepoint)
}

/**
 * Converts a Unicode character to its codepoint
 */
export function charToCodepoint(char: string): number {
  return char.codePointAt(0) || 0
}

/**
 * Formats a codepoint as a Unicode escape sequence
 */
export function formatCodepoint(codepoint: number): string {
  if (codepoint <= 0xffff) {
    return `\\u${codepoint.toString(16).toUpperCase().padStart(4, '0')}`
  }
  return `\\U${codepoint.toString(16).toUpperCase().padStart(8, '0')}`
}

/**
 * Checks if a codepoint is in the Private Use Area
 */
export function isPrivateUse(codepoint: number): boolean {
  return (
    (codepoint >= PUA_START && codepoint <= PUA_END) ||
    (codepoint >= PUA_SUPPLEMENTARY_START && codepoint <= PUA_SUPPLEMENTARY_END)
  )
}

/**
 * Gets the next available Unicode codepoint in the PUA
 */
export function getNextAvailableCodepoint(usedCodepoints: Set<number>): number {
  // Try primary PUA first
  for (let cp = PUA_START; cp <= PUA_END; cp++) {
    if (!usedCodepoints.has(cp)) {
      return cp
    }
  }

  // Fall back to supplementary PUA
  for (let cp = PUA_SUPPLEMENTARY_START; cp <= PUA_SUPPLEMENTARY_END; cp++) {
    if (!usedCodepoints.has(cp)) {
      return cp
    }
  }

  throw new Error('No available Unicode codepoints in Private Use Area')
}

/**
 * Extracts all used codepoints from a font definition
 */
export function extractUsedCodepoints(chars: string[]): Set<number> {
  const used = new Set<number>()

  for (const row of chars) {
    for (const char of row) {
      const cp = char.codePointAt(0)
      if (cp !== undefined) {
        used.add(cp)
      }
    }
  }

  return used
}

/**
 * Generates a list of available Unicode glyphs
 */
export function generateUnicodeGlyphList(count: number, startCodepoint = PUA_START): UnicodeGlyph[] {
  const glyphs: UnicodeGlyph[] = []

  for (let i = 0; i < count; i++) {
    const codepoint = startCodepoint + i
    if (codepoint > PUA_END) break

    glyphs.push({
      char: codepointToChar(codepoint),
      codepoint,
      texturePath: '',
      height: 8,
      ascent: 7
    })
  }

  return glyphs
}

/**
 * Creates a tellraw command to display a Unicode character
 */
export function createTellrawCommand(codepoint: number, color = 'white'): string {
  const char = codepointToChar(codepoint)
  return `/tellraw @a {"text":"${char}","color":"${color}"}`
}

/**
 * Creates a title command to display a Unicode character
 */
export function createTitleCommand(codepoint: number, type: 'title' | 'subtitle' = 'title'): string {
  const char = codepointToChar(codepoint)
  return `/title @a ${type} {"text":"${char}"}`
}

/**
 * Converts a hex color code to a Unicode escape
 */
export function hexToUnicodeEscape(hex: string): string {
  const codepoint = parseInt(hex.replace(/^[#Uu+]/, ''), 16)
  return formatCodepoint(codepoint)
}
