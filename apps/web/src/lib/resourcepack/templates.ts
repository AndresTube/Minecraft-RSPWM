import type { ResourcePack } from './types'
// Templates have been removed. Export minimal stubs so callers don't break.
export type PackTemplate = { id: string; name: string; description: string }

export const PACK_TEMPLATES: PackTemplate[] = []

export function getTemplate(_id: string): PackTemplate | null {
  return null
}

export function createPackFromTemplate(_templateId: string, _settings: unknown): never {
  throw new Error('Pack templates feature has been removed')
}
    id: 'empty',
