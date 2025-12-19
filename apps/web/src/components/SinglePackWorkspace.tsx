import { useRef, useState } from 'react'
import type { PackSettings } from '../lib/resourcepack/metadata'
import { applyPackSettings, createEmptyPack, readPackMetadata } from '../lib/resourcepack/metadata'
import type { ResourcePack } from '../lib/resourcepack/types'
import { exportZipBytes, importZip, downloadZip } from '../lib/resourcepack/zip'
import { countFiles, vfsDelete, vfsSet } from '../lib/resourcepack/vfs'
import { RESOURCE_PACK_FORMATS, findById, findByPackFormat } from '../lib/resourcepack/versioning'
import { PACK_TEMPLATES, createPackFromTemplate } from '../lib/resourcepack/templates'
import FileBrowser from './FileBrowser'
import TexturePreview from './TexturePreview'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
  settings: PackSettings
  onSettingsChange: (next: PackSettings) => void
  exportNameSuffix?: string
}

export default function SinglePackWorkspace({
  pack,
  onPackChange,
  settings,
  onSettingsChange,
  exportNameSuffix,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null)

  async function onPickFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const imported = await importZip(file)
      onPackChange(imported)

      // Best-effort sync settings from imported pack.
      const meta = readPackMetadata(imported)
      if (meta) {
        const known = findByPackFormat(meta.packFormat)
        onSettingsChange({
          ...settings,
          name: imported.name,
          packFormat: meta.packFormat,
          versionId: known?.id ?? 'custom',
          description: meta.description,
        })
      } else {
        onSettingsChange({
          ...settings,
          name: imported.name,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function exportPack() {
    const withMeta = applyPackSettings(pack, settings)
    onPackChange(withMeta)

    const bytes = exportZipBytes(withMeta.files)
    const suffix = exportNameSuffix ? `-${exportNameSuffix}` : ''
    downloadZip(bytes, `${withMeta.name}${suffix}.zip`)
  }

  function newEmptyPack() {
    try {
      const next = createEmptyPack(settings)
      onPackChange(next)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function createFromTemplate(templateId: string) {
    try {
      const next = createPackFromTemplate(templateId, settings)
      onPackChange(next)
      if (inputRef.current) inputRef.current.value = ''
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const zipFile = files.find(f => f.name.endsWith('.zip'))

    if (zipFile) {
      await onPickFile(zipFile)
    } else {
      setError('Please drop a .zip file')
    }
  }

  async function setIcon(file: File) {
    setError(null)
    setSelectedIconFile(file)

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const withMeta = applyPackSettings(pack, settings)
      vfsSet(withMeta.files, 'pack.png', bytes)
      onPackChange(withMeta)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function removeIcon() {
    setError(null)
    setSelectedIconFile(null)

    try {
      const withMeta = applyPackSettings(pack, settings)
      vfsDelete(withMeta.files, 'pack.png')
      onPackChange(withMeta)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function applyMetadata() {
    try {
      const next = applyPackSettings(pack, settings)
      onPackChange(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const fileCount = countFiles(pack.files)
  const packIcon = pack.files.get('pack.png')

  return (
    <section
      className={`panel ${dragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 style={{ marginTop: 0 }}>Pack Settings</h2>
      {dragging && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(93, 187, 99, 0.1)',
          border: '3px dashed var(--mc-accent)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2em',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          Drop ZIP file here
        </div>
      )}

      <div className="grid">
        <label>
          Pack name (download filename)
          <input
            value={settings.name}
            onChange={(e) => onSettingsChange({ ...settings, name: e.target.value })}
            placeholder="resourcepack"
          />
        </label>

        <label>
          Minecraft version
          <select
            value={settings.versionId}
            onChange={(e) => {
              const id = e.target.value
              if (id === 'custom') {
                onSettingsChange({ ...settings, versionId: 'custom' })
                return
              }

              const opt = findById(id)
              if (!opt) return
              onSettingsChange({ ...settings, versionId: opt.id, packFormat: opt.packFormat })
            }}
          >
            {RESOURCE_PACK_FORMATS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
            <option value="custom">Custom (manual pack_format)</option>
          </select>
        </label>

        <label>
          pack_format
          <input
            type="number"
            value={settings.packFormat}
            onChange={(e) => onSettingsChange({ ...settings, packFormat: Number(e.target.value), versionId: 'custom' })}
          />
        </label>

        <label>
          pack.mcmeta description
          <input
            value={settings.description}
            onChange={(e) => onSettingsChange({ ...settings, description: e.target.value })}
            placeholder="My pack"
          />
        </label>

        <label>
          pack.png icon (optional)
          <input
            type="file"
            accept="image/png"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void setIcon(f)
            }}
          />
          <small style={{ opacity: 0.8 }}>Minecraft expects a 64x64 PNG named pack.png at the ZIP root.</small>

          {(selectedIconFile || packIcon) && (
            <div style={{ marginTop: 8 }}>
              <TexturePreview
                imageData={selectedIconFile || (packIcon ? packIcon : null)}
                alt="Pack icon"
                maxWidth={64}
                maxHeight={64}
              />
            </div>
          )}

          <div className="row" style={{ gap: 8 }}>
            <button type="button" disabled={busy} onClick={removeIcon}>
              Remove icon
            </button>
          </div>
        </label>
      </div>

      {PACK_TEMPLATES.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Create from Template</h3>
          <div className="grid">
            {PACK_TEMPLATES.map(template => (
              <button
                key={template.id}
                type="button"
                disabled={busy}
                onClick={() => createFromTemplate(template.id)}
                style={{ textAlign: 'left', padding: 12 }}
              >
                <div style={{ fontWeight: 'bold' }}>{template.name}</div>
                <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: 4 }}>{template.description}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="row" style={{ gap: 8, marginTop: 12, alignItems: 'center' }}>
        <label style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <span>Import ZIP</span>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPickFile(f)
            }}
          />
        </label>

        <button type="button" disabled={busy} onClick={newEmptyPack}>
          New empty pack
        </button>

        <button type="button" disabled={busy} onClick={applyMetadata}>
          Apply settings
        </button>

        <button type="button" disabled={busy} onClick={exportPack}>
          Download ZIP
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, opacity: 0.85 }}>
          <strong>Loaded:</strong> {pack.name} ({fileCount} files)
        </p>
        <button type="button" onClick={() => setShowFileBrowser(!showFileBrowser)}>
          {showFileBrowser ? 'Hide' : 'Show'} File Browser
        </button>
      </div>

      {showFileBrowser && (
        <div style={{ marginTop: 16 }}>
          <FileBrowser pack={pack} onPackChange={onPackChange} />
        </div>
      )}

      {busy && <p style={{ marginTop: 12 }}>Working…</p>}
      {error && (
        <p style={{ marginTop: 12, color: 'tomato' }}>
          {error}
        </p>
      )}

      <style>{`
        .panel {
          position: relative;
        }

        .panel.drag-over {
          outline: 3px dashed var(--mc-accent);
          outline-offset: -3px;
        }
      `}</style>
    </section>
  )
}
