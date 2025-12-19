import { useMemo, useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { downloadZip, exportZipBytes, importZip } from '../../lib/resourcepack/zip'
import { mixPacks } from '../../lib/resourcepack/tools'

export default function MixerTool() {
  const [packs, setPacks] = useState<ResourcePack[]>([])
  const [outputName, setOutputName] = useState('mixed-pack')
  const [error, setError] = useState<string | null>(null)

  const canExport = useMemo(() => packs.length >= 2 && outputName.trim().length > 0, [packs, outputName])

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return
    setError(null)

    try {
      const imported = await Promise.all(Array.from(fileList).map((f) => importZip(f)))
      setPacks((prev) => [...prev, ...imported])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function move(from: number, delta: number) {
    setPacks((prev) => {
      const to = from + delta
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function removeAt(idx: number) {
    setPacks((prev) => prev.filter((_, i) => i !== idx))
  }

  function exportMixed() {
    const mixed = mixPacks(packs, outputName.trim())
    const bytes = exportZipBytes(mixed.files)
    downloadZip(bytes, `${mixed.name}.zip`)
  }

  return (
    <section className="panel">
      <h2>Resource pack mixer</h2>
      <p style={{ marginTop: 0 }}>
        Add 2+ pack ZIPs, choose priority order, and download a merged ZIP. Later packs override earlier packs when
        files conflict.
      </p>

      <div className="grid">
        <label>
          Add pack ZIPs
          <input type="file" accept=".zip,application/zip" multiple onChange={(e) => void addFiles(e.target.files)} />
        </label>

        <label>
          Output name
          <input value={outputName} onChange={(e) => setOutputName(e.target.value)} />
        </label>
      </div>

      {error && <p style={{ color: 'tomato' }}>{error}</p>}

      {packs.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          <strong>Priority order (top = lowest priority, bottom = highest priority):</strong>
          <ul>
            {packs.map((p, idx) => (
              <li key={`${p.name}-${idx}`} className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <span>
                  {idx + 1}. {p.name}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    Up
                  </button>
                  <button type="button" onClick={() => move(idx, +1)} disabled={idx === packs.length - 1}>
                    Down
                  </button>
                  <button type="button" onClick={() => removeAt(idx)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" disabled={!canExport} onClick={exportMixed}>
          Download mixed ZIP
        </button>
        {packs.length < 2 && <span style={{ opacity: 0.8 }}>Add at least 2 ZIPs to mix.</span>}
      </div>
    </section>
  )
}
