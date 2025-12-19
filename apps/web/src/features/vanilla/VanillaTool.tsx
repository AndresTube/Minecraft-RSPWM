import { useMemo, useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { replaceVanillaTexture } from '../../lib/resourcepack/tools'
import TexturePreview from '../../components/TexturePreview'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function VanillaTool({ pack, onPackChange }: Props) {
  const [target, setTarget] = useState('item/diamond_sword.png')
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const canApply = useMemo(() => target.trim().length > 0 && !!pngFile, [target, pngFile])

  async function apply() {
    setError(null)
    setOk(null)
    if (!pngFile) return

    try {
      const bytes = new Uint8Array(await pngFile.arrayBuffer())
      const next = replaceVanillaTexture(pack, {
        target,
        replacementPng: bytes,
      })
      onPackChange(next)
      setOk(`Wrote ${target}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="panel">
      <h2>Vanilla texture replacer</h2>
      <p style={{ marginTop: 0 }}>
        Writes a PNG into <code>assets/minecraft/textures/...</code>.
      </p>

      <div className="grid">
        <label>
          Target texture
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="item/diamond_sword.png"
          />
          <small style={{ opacity: 0.8 }}>
            Examples: <code>item/diamond_sword.png</code>, <code>block/stone.png</code>,
            <code> minecraft:item/diamond_sword</code>, or full <code>assets/...</code> path.
          </small>
        </label>

        <label>
          Replacement PNG
          <input type="file" accept="image/png" onChange={(e) => setPngFile(e.target.files?.[0] ?? null)} />
          {pngFile && (
            <div style={{ marginTop: 12 }}>
              <TexturePreview imageData={pngFile} alt="Selected texture" />
            </div>
          )}
        </label>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" disabled={!canApply} onClick={() => void apply()}>
          Apply
        </button>
      </div>

      {ok && <p style={{ color: 'limegreen' }}>{ok}</p>}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
    </section>
  )
}
