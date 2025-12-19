import { useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { addSound, validateSoundFile, suggestSoundPath, type SoundInput } from '../../lib/resourcepack/sounds'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function SoundTool({ pack, onPackChange }: Props) {
  const [soundId, setSoundId] = useState('')
  const [namespace, setNamespace] = useState('minecraft')
  const [soundPath, setSoundPath] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [replace, setReplace] = useState(false)
  const [soundFile, setSoundFile] = useState<File | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleAddSound() {
    setMessage(null)

    if (!soundId.trim()) {
      setMessage({ type: 'error', text: 'Sound ID is required' })
      return
    }

    if (!soundFile) {
      setMessage({ type: 'error', text: 'Please select a sound file' })
      return
    }

    // Validate sound file
    const validation = validateSoundFile(soundFile)
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Invalid sound file' })
      return
    }

    try {
      const soundBytes = new Uint8Array(await soundFile.arrayBuffer())

      const input: SoundInput = {
        soundId: soundId.trim(),
        namespace: namespace.trim() || 'minecraft',
        soundFile: soundBytes,
        soundPath: soundPath.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        replace,
      }

      const updated = addSound(pack, input)
      onPackChange(updated)

      setMessage({ type: 'success', text: `Added sound: ${soundId}` })

      // Reset form
      setSoundId('')
      setSoundPath('')
      setSubtitle('')
      setSoundFile(null)
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to add sound: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  function handleSoundIdChange(value: string) {
    setSoundId(value)
    // Auto-suggest sound path
    if (!soundPath || soundPath === suggestSoundPath(soundId)) {
      setSoundPath(suggestSoundPath(value))
    }
  }

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Sound Pack Tool</h2>
      <p style={{ opacity: 0.85 }}>
        Add custom sounds to your resource pack. Sound files must be in .ogg format (Ogg Vorbis).
      </p>

      <div className="grid">
        <label>
          Sound ID
          <input
            value={soundId}
            onChange={(e) => handleSoundIdChange(e.target.value)}
            placeholder="block.stone.break"
          />
          <small style={{ opacity: 0.8 }}>
            Use dot notation (e.g., "block.stone.break" or "custom.mysound")
          </small>
        </label>

        <label>
          Namespace
          <input
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="minecraft"
          />
          <small style={{ opacity: 0.8 }}>
            Usually "minecraft" for replacing vanilla sounds
          </small>
        </label>

        <label>
          Sound file path (in sounds/ folder)
          <input
            value={soundPath}
            onChange={(e) => setSoundPath(e.target.value)}
            placeholder="block/stone/break"
          />
          <small style={{ opacity: 0.8 }}>
            Auto-filled based on Sound ID. Can customize if needed.
          </small>
        </label>

        <label>
          Subtitle (optional)
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="subtitles.block.stone.break"
          />
          <small style={{ opacity: 0.8 }}>
            Translation key for subtitles
          </small>
        </label>

        <label>
          Sound file (.ogg)
          <input
            type="file"
            accept=".ogg,audio/ogg"
            onChange={(e) => setSoundFile(e.target.files?.[0] || null)}
          />
          <small style={{ opacity: 0.8 }}>
            {soundFile ? `Selected: ${soundFile.name} (${(soundFile.size / 1024).toFixed(2)} KB)` : 'Select an .ogg file'}
          </small>
        </label>

        <label style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          <span>Replace existing sound definition</span>
        </label>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" onClick={handleAddSound} className="primary">
          Add Sound
        </button>
      </div>

      {message && (
        <p style={{ marginTop: 12, color: message.type === 'error' ? 'tomato' : 'var(--mc-accent)' }}>
          {message.text}
        </p>
      )}

      <div style={{ marginTop: 24, padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 2 }}>
        <h3 style={{ marginTop: 0, fontSize: '1em' }}>Tips:</h3>
        <ul style={{ marginBottom: 0, paddingLeft: 20, fontSize: '0.9em' }}>
          <li>Sound files must be in Ogg Vorbis format (.ogg)</li>
          <li>Use tools like Audacity to convert MP3/WAV to OGG</li>
          <li>Keep sound files small for better performance (under 1MB recommended)</li>
          <li>For ambient/music sounds, consider enabling "stream" in sounds.json</li>
          <li>Test sounds in-game with /playsound command</li>
        </ul>
      </div>
    </section>
  )
}
