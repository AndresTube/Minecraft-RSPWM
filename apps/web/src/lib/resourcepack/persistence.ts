import type { ResourcePack } from './types'
import type { PackSettings } from './metadata'
import { exportZipBytes } from './zip'
import { importZip } from './zip'

const STORAGE_KEY_PACK = 'mrwm_current_pack'
const STORAGE_KEY_SETTINGS = 'mrwm_current_settings'
const STORAGE_KEY_RECENT = 'mrwm_recent_packs'
const MAX_RECENT_PACKS = 5

type StoredPack = {
  name: string
  zipBase64: string
  timestamp: number
}

export function savePackToStorage(pack: ResourcePack, settings: PackSettings): void {
  try {
    const zipBytes = exportZipBytes(pack.files)
    const base64 = bytesToBase64(zipBytes)

    localStorage.setItem(STORAGE_KEY_PACK, JSON.stringify({
      name: pack.name,
      zipBase64: base64,
    }))

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save pack to localStorage:', e)
  }
}

export async function loadPackFromStorage(): Promise<{ pack: ResourcePack; settings: PackSettings } | null> {
  try {
    const packData = localStorage.getItem(STORAGE_KEY_PACK)
    const settingsData = localStorage.getItem(STORAGE_KEY_SETTINGS)

    if (!packData || !settingsData) return null

    const stored = JSON.parse(packData) as { name: string; zipBase64: string }
    const settings = JSON.parse(settingsData) as PackSettings

    const zipBytes = base64ToBytes(stored.zipBase64)
    const blob = new Blob([zipBytes as any], { type: 'application/zip' })
    const file = new File([blob], `${stored.name}.zip`)

    const pack = await importZip(file)

    return { pack, settings }
  } catch (e) {
    console.error('Failed to load pack from localStorage:', e)
    return null
  }
}

export function clearStoredPack(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PACK)
    localStorage.removeItem(STORAGE_KEY_SETTINGS)
  } catch (e) {
    console.error('Failed to clear stored pack:', e)
  }
}

export function saveToRecentPacks(pack: ResourcePack): void {
  try {
    const zipBytes = exportZipBytes(pack.files)
    const base64 = bytesToBase64(zipBytes)

    const recent = getRecentPacks()

    // Remove if already exists
    const filtered = recent.filter(r => r.name !== pack.name)

    // Add to front
    filtered.unshift({
      name: pack.name,
      zipBase64: base64,
      timestamp: Date.now(),
    })

    // Keep only MAX_RECENT_PACKS
    const trimmed = filtered.slice(0, MAX_RECENT_PACKS)

    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(trimmed))
  } catch (e) {
    console.error('Failed to save to recent packs:', e)
  }
}

export function getRecentPacks(): StoredPack[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_RECENT)
    if (!data) return []

    return JSON.parse(data) as StoredPack[]
  } catch (e) {
    console.error('Failed to load recent packs:', e)
    return []
  }
}

export async function loadRecentPack(name: string): Promise<ResourcePack | null> {
  try {
    const recent = getRecentPacks()
    const found = recent.find(r => r.name === name)

    if (!found) return null

    const zipBytes = base64ToBytes(found.zipBase64)
    const blob = new Blob([zipBytes as any], { type: 'application/zip' })
    const file = new File([blob], `${found.name}.zip`)

    return await importZip(file)
  } catch (e) {
    console.error('Failed to load recent pack:', e)
    return null
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
