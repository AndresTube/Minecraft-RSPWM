export type ResourcePackFormatOption = {
  id: string
  label: string
  packFormat: number
}

// Source: Minecraft pack format tables. Keep this list focused on modern releases.
export const RESOURCE_PACK_FORMATS: ResourcePackFormatOption[] = [
  { id: '1.20-1.20.1', label: 'Java 1.20 – 1.20.1', packFormat: 15 },
  { id: '1.20.2', label: 'Java 1.20.2', packFormat: 18 },
  { id: '1.20.3-1.20.4', label: 'Java 1.20.3 – 1.20.4', packFormat: 22 },
  { id: '1.20.5-1.20.6', label: 'Java 1.20.5 – 1.20.6', packFormat: 32 },
  { id: '1.21-1.21.3', label: 'Java 1.21 – 1.21.3', packFormat: 34 },
  { id: '1.21.4', label: 'Java 1.21.4', packFormat: 46 },
  { id: '1.21.5', label: 'Java 1.21.5', packFormat: 55 },
  { id: '1.21.6', label: 'Java 1.21.6', packFormat: 63 },
  { id: '1.21.7-1.21.8', label: 'Java 1.21.7 – 1.21.8', packFormat: 64 },
]

export function findById(id: string): ResourcePackFormatOption | null {
  return RESOURCE_PACK_FORMATS.find((o) => o.id === id) ?? null
}

export function findByPackFormat(packFormat: number): ResourcePackFormatOption | null {
  return RESOURCE_PACK_FORMATS.find((o) => o.packFormat === packFormat) ?? null
}
