export type Vfs = Map<string, Uint8Array>

export type ResourcePack = {
  name: string
  files: Vfs
}
