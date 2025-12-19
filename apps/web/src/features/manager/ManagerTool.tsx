import { useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { readJson, vfsDelete } from '../../lib/resourcepack/vfs'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

type TabType = 'cmd' | 'glyphs' | 'sounds' | 'textures'

export default function ManagerTool({ pack, onPackChange }: Props) {
  const [tab, setTab] = useState<TabType>('cmd')

  return (
    <section className="panel">
      <h2>Resource Manager</h2>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        View and manage existing Custom Model Data, Unicode Glyphs, Sounds, and Vanilla Texture replacements.
      </p>

      <div className="tabs" style={{ marginTop: 16 }}>
        <button type="button" className={tab === 'cmd' ? 'active' : ''} onClick={() => setTab('cmd')}>
          Custom Models
        </button>
        <button type="button" className={tab === 'glyphs' ? 'active' : ''} onClick={() => setTab('glyphs')}>
          Unicode Glyphs
        </button>
        <button type="button" className={tab === 'sounds' ? 'active' : ''} onClick={() => setTab('sounds')}>
          Sounds
        </button>
        <button type="button" className={tab === 'textures' ? 'active' : ''} onClick={() => setTab('textures')}>
          Vanilla Textures
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'cmd' && <CmdManager pack={pack} onPackChange={onPackChange} />}
        {tab === 'glyphs' && <GlyphManager pack={pack} onPackChange={onPackChange} />}
        {tab === 'sounds' && <SoundManager pack={pack} onPackChange={onPackChange} />}
        {tab === 'textures' && <TextureManager pack={pack} onPackChange={onPackChange} />}
      </div>
    </section>
  )
}

// CMD Manager
function CmdManager({ pack, onPackChange }: Props) {
  const cmdEntries = findCmdEntries(pack)

  function deleteEntry(itemName: string, cmd: number, isModern: boolean) {
    if (!confirm(`Delete CMD ${cmd} for ${itemName}?`)) return

    const files = new Map(pack.files)

    if (isModern) {
      // Modern format: delete from items/*.json
      const itemDefPath = `assets/minecraft/items/${itemName}.json`
      const itemDef = readJson<any>(files, itemDefPath)

      if (itemDef?.model?.entries) {
        itemDef.model.entries = itemDef.model.entries.filter((e: any) => e.threshold !== cmd)

        if (itemDef.model.entries.length === 0) {
          vfsDelete(files, itemDefPath)
        } else {
          const content = JSON.stringify(itemDef, null, 2) + '\n'
          files.set(itemDefPath, new TextEncoder().encode(content))
        }
      }
    } else {
      // Legacy format: delete from models/item/*.json
      const baseModelPath = `assets/minecraft/models/item/${itemName}.json`
      const baseModel = readJson<any>(files, baseModelPath)

      if (baseModel?.overrides) {
        baseModel.overrides = baseModel.overrides.filter((o: any) => o?.predicate?.custom_model_data !== cmd)
        if (baseModel.overrides.length === 0) {
          vfsDelete(files, baseModelPath)
        } else {
          const content = JSON.stringify(baseModel, null, 2) + '\n'
          files.set(baseModelPath, new TextEncoder().encode(content))
        }
      }
    }

    // Find and delete custom model files (texture + model)
    for (const [path] of files.entries()) {
      if (path.includes(`${itemName}_cmd_${cmd}`)) {
        vfsDelete(files, path)
      }
    }

    onPackChange({ ...pack, files })
  }

  if (cmdEntries.length === 0) {
    return <p style={{ opacity: 0.7 }}>No custom model data entries found. Use the Custom Model Data tool to add some!</p>
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--mc-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Item</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>CMD</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Model</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cmdEntries.map((entry, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--mc-border)' }}>
              <td style={{ padding: '8px' }}>{entry.item}</td>
              <td style={{ padding: '8px' }}>{entry.cmd}</td>
              <td style={{ padding: '8px', fontSize: '8px' }}>{entry.model}</td>
              <td style={{ padding: '8px' }}>
                <button type="button" onClick={() => deleteEntry(entry.item, entry.cmd, entry.isModern)} style={{ padding: '4px 8px', fontSize: '8px' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Glyph Manager
function GlyphManager({ pack, onPackChange }: Props) {
  const glyphs = findGlyphs(pack)

  function deleteGlyph(fontKey: string, codepoint: string) {
    if (!confirm(`Delete glyph U+${codepoint}?`)) return

    const files = new Map(pack.files)
    const fontPath = `assets/minecraft/font/${fontKey}.json`
    const font = readJson<any>(files, fontPath)

    if (font?.providers) {
      font.providers = font.providers.filter((p: any) => {
        if (p.type !== 'bitmap') return true
        const chars = p.chars?.[0]
        if (!chars) return true
        const code = chars.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')
        return code !== codepoint
      })

      const content = JSON.stringify(font, null, 2) + '\n'
      files.set(fontPath, new TextEncoder().encode(content))
    }

    // Delete texture
    const texturePath = `assets/minecraft/textures/font/glyph_${codepoint}.png`
    vfsDelete(files, texturePath)

    onPackChange({ ...pack, files })
  }

  if (glyphs.length === 0) {
    return <p style={{ opacity: 0.7 }}>No unicode glyphs found. Use the Unicode Glyphs tool to add some!</p>
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--mc-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Font</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Character</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Codepoint</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {glyphs.map((glyph, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--mc-border)' }}>
              <td style={{ padding: '8px' }}>{glyph.font}</td>
              <td style={{ padding: '8px', fontSize: '24px' }}>{glyph.char}</td>
              <td style={{ padding: '8px' }}>U+{glyph.codepoint}</td>
              <td style={{ padding: '8px' }}>
                <button type="button" onClick={() => deleteGlyph(glyph.font, glyph.codepoint)} style={{ padding: '4px 8px', fontSize: '8px' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Sound Manager
function SoundManager({ pack }: Props) {
  const sounds = findSounds(pack)

  if (sounds.length === 0) {
    return <p style={{ opacity: 0.7 }}>No sounds found. Use the Sound Pack tool to add some!</p>
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--mc-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Sound ID</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Files</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Subtitle</th>
          </tr>
        </thead>
        <tbody>
          {sounds.map((sound, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--mc-border)' }}>
              <td style={{ padding: '8px' }}>{sound.id}</td>
              <td style={{ padding: '8px', fontSize: '8px' }}>{sound.files.join(', ')}</td>
              <td style={{ padding: '8px', fontSize: '8px' }}>{sound.subtitle || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Texture Manager
function TextureManager({ pack }: Props) {
  const textures = findVanillaTextures(pack)

  if (textures.length === 0) {
    return <p style={{ opacity: 0.7 }}>No vanilla texture replacements found. Use the Vanilla Textures tool to add some!</p>
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--mc-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Path</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {textures.map((tex, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--mc-border)' }}>
              <td style={{ padding: '8px', fontSize: '8px' }}>{tex.path}</td>
              <td style={{ padding: '8px' }}>{(tex.size / 1024).toFixed(2)} KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Helper functions
function findCmdEntries(pack: ResourcePack) {
  const entries: Array<{ item: string; cmd: number; model: string; isModern: boolean }> = []

  // Check legacy format (overrides in models/item/*.json)
  for (const [path] of pack.files.entries()) {
    if (!path.startsWith('assets/minecraft/models/item/') || !path.endsWith('.json')) continue

    const itemName = path.replace('assets/minecraft/models/item/', '').replace('.json', '')
    const model = readJson<any>(pack.files, path)

    if (model?.overrides) {
      for (const override of model.overrides) {
        if (override?.predicate?.custom_model_data) {
          entries.push({
            item: itemName,
            cmd: override.predicate.custom_model_data,
            model: override.model || 'unknown',
            isModern: false,
          })
        }
      }
    }
  }

  // Check modern format 1.21.4+ (range_dispatch in items/*.json)
  for (const [path] of pack.files.entries()) {
    if (!path.startsWith('assets/minecraft/items/') || !path.endsWith('.json')) continue

    const itemName = path.replace('assets/minecraft/items/', '').replace('.json', '')
    const itemDef = readJson<any>(pack.files, path)

    if (itemDef?.model?.type === 'minecraft:range_dispatch' || itemDef?.model?.type === 'range_dispatch') {
      const dispatch = itemDef.model
      if (dispatch.property === 'minecraft:custom_model_data' && dispatch.entries) {
        for (const entry of dispatch.entries) {
          if (typeof entry.threshold === 'number') {
            const modelRef = entry.model?.model || 'unknown'
            entries.push({
              item: itemName,
              cmd: entry.threshold,
              model: modelRef,
              isModern: true,
            })
          }
        }
      }
    }
  }

  return entries.sort((a, b) => a.item.localeCompare(b.item) || a.cmd - b.cmd)
}

function findGlyphs(pack: ResourcePack) {
  const glyphs: Array<{ font: string; char: string; codepoint: string }> = []

  for (const [path] of pack.files.entries()) {
    if (!path.startsWith('assets/minecraft/font/') || !path.endsWith('.json')) continue

    const fontKey = path.replace('assets/minecraft/font/', '').replace('.json', '')
    const font = readJson<any>(pack.files, path)

    if (font?.providers) {
      for (const provider of font.providers) {
        if (provider?.type === 'bitmap' && provider.chars) {
          const char = provider.chars[0]
          if (char) {
            const code = char.codePointAt(0)
            if (code && code >= 0xe000 && code <= 0xf8ff) {
              glyphs.push({
                font: fontKey,
                char,
                codepoint: code.toString(16).toUpperCase().padStart(4, '0'),
              })
            }
          }
        }
      }
    }
  }

  return glyphs
}

function findSounds(pack: ResourcePack) {
  const sounds: Array<{ id: string; files: string[]; subtitle?: string }> = []

  const soundsJson = readJson<any>(pack.files, 'assets/minecraft/sounds.json')
  if (!soundsJson) return sounds

  for (const [id, data] of Object.entries(soundsJson)) {
    if (typeof data === 'object' && data !== null) {
      const soundData = data as any
      const files = soundData.sounds?.map((s: any) => (typeof s === 'string' ? s : s.name)) || []
      sounds.push({
        id,
        files,
        subtitle: soundData.subtitle,
      })
    }
  }

  return sounds.sort((a, b) => a.id.localeCompare(b.id))
}

function findVanillaTextures(pack: ResourcePack) {
  const textures: Array<{ path: string; size: number }> = []

  for (const [path, data] of pack.files.entries()) {
    if (path.startsWith('assets/minecraft/textures/') && path.endsWith('.png')) {
      textures.push({
        path,
        size: data.byteLength,
      })
    }
  }

  return textures.sort((a, b) => a.path.localeCompare(b.path))
}
