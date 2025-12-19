import type { ResourcePack } from './types'
import { cloneVfs, readJson, vfsSet, writeJson } from './vfs'

export type SoundInput = {
  soundId: string // e.g., "block.stone.break" or "custom.mysound"
  namespace?: string // default "minecraft"
  soundFile: Uint8Array // .ogg audio file
  soundPath?: string // where to store the .ogg, e.g., "block/stone/break"
  subtitle?: string // optional subtitle key
  replace?: boolean // if true, replace existing sound definition
}

export type SoundEvent = {
  sounds: Array<SoundEntry>
  subtitle?: string
  replace?: boolean
}

export type SoundEntry = string | {
  name: string
  volume?: number
  pitch?: number
  weight?: number
  stream?: boolean
  attenuation_distance?: number
  preload?: boolean
  type?: 'sound' | 'event'
}

export function addSound(pack: ResourcePack, input: SoundInput): ResourcePack {
  const files = cloneVfs(pack.files)
  const ns = input.namespace?.toLowerCase() || 'minecraft'

  // Determine sound file path
  let soundPath = input.soundPath || input.soundId.replace(/\./g, '/')
  if (!soundPath.endsWith('.ogg')) {
    soundPath = `${soundPath}.ogg`
  }

  // Ensure it's in the correct directory structure
  const fullSoundPath = `assets/${ns}/sounds/${soundPath}`
  vfsSet(files, fullSoundPath, input.soundFile)

  // Update sounds.json
  const soundsJsonPath = `assets/${ns}/sounds.json`
  const soundsJson = readJson<Record<string, SoundEvent>>(files, soundsJsonPath) || {}

  const soundName = soundPath.replace(/\.ogg$/, '')
  const soundEntry: SoundEntry = {
    name: `${ns}:${soundName}`,
    stream: false,
  }

  if (!soundsJson[input.soundId]) {
    soundsJson[input.soundId] = {
      sounds: [soundEntry],
    }
  } else if (input.replace) {
    soundsJson[input.soundId] = {
      sounds: [soundEntry],
    }
  } else {
    // Add to existing sounds array
    if (!soundsJson[input.soundId].sounds) {
      soundsJson[input.soundId].sounds = []
    }
    soundsJson[input.soundId].sounds.push(soundEntry)
  }

  if (input.subtitle) {
    soundsJson[input.soundId].subtitle = input.subtitle
  }

  writeJson(files, soundsJsonPath, soundsJson)

  return { ...pack, files }
}

export function removeSound(pack: ResourcePack, soundId: string, namespace: string = 'minecraft'): ResourcePack {
  const files = cloneVfs(pack.files)
  const soundsJsonPath = `assets/${namespace}/sounds.json`

  const soundsJson = readJson<Record<string, SoundEvent>>(files, soundsJsonPath)
  if (!soundsJson) {
    return pack // No sounds.json to modify
  }

  delete soundsJson[soundId]
  writeJson(files, soundsJsonPath, soundsJson)

  return { ...pack, files }
}

export function listSounds(pack: ResourcePack, namespace: string = 'minecraft'): string[] {
  const soundsJsonPath = `assets/${namespace}/sounds.json`
  const soundsJson = readJson<Record<string, SoundEvent>>(pack.files, soundsJsonPath)

  if (!soundsJson) {
    return []
  }

  return Object.keys(soundsJson).sort()
}

export function getSoundEvent(pack: ResourcePack, soundId: string, namespace: string = 'minecraft'): SoundEvent | null {
  const soundsJsonPath = `assets/${namespace}/sounds.json`
  const soundsJson = readJson<Record<string, SoundEvent>>(pack.files, soundsJsonPath)

  if (!soundsJson) {
    return null
  }

  return soundsJson[soundId] || null
}

export function validateSoundFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.ogg')) {
    return {
      valid: false,
      error: 'Sound files must be in .ogg format (Ogg Vorbis)',
    }
  }

  // Check file size (warn if > 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Sound file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Consider compressing it or using streaming.`,
    }
  }

  return { valid: true }
}

export function suggestSoundPath(soundId: string): string {
  // Convert dot notation to path
  // e.g., "block.stone.break" -> "block/stone/break"
  return soundId.replace(/\./g, '/')
}
