export type Vfs = Map<string, Uint8Array>

export type ResourcePack = {
  name: string
  files: Vfs
}

export type BitmapFontProvider = {
  type: 'bitmap'
  file: string
  height: number
  ascent: number
  chars: string[]
}

export type FontProvider = BitmapFontProvider | { type: 'default' } | { type: string }

export type FontDefinition = {
  providers: FontProvider[]
}
