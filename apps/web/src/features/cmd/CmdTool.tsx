import { useMemo, useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { applyCustomModelData } from '../../lib/resourcepack/tools'
import TexturePreview from '../../components/TexturePreview'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function CmdTool({ pack, onPackChange }: Props) {
  const [itemId, setItemId] = useState('diamond_sword')
  const [cmd, setCmd] = useState(1)
  const [namespace, setNamespace] = useState('mrwm')
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const canApply = useMemo(() => {
    return itemId.trim().length > 0 && Number.isFinite(cmd) && cmd > 0 && !!pngFile
  }, [itemId, cmd, pngFile])

  async function apply() {
    setError(null)
    setOk(null)
    if (!pngFile) {
      setError('Please select a texture file')
      return
    }

    try {
      const bytes = new Uint8Array(await pngFile.arrayBuffer())
      const next = applyCustomModelData(pack, {
        itemId,
        customModelData: cmd,
        namespace,
        texturePng: bytes,
      })
      onPackChange(next)
      const modelPath = `${namespace}:item/${itemId}_cmd_${cmd}`
      setOk(`✓ Added CMD ${cmd} for ${itemId}\nModel: ${modelPath}\nIn-game: /give @s ${itemId}[custom_model_data=${cmd}]`)

      // Reset file input
      setPngFile(null)
      setCmd(cmd + 1)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error('CMD Tool error:', e)
      setError(`Error: ${errorMsg}`)
    }
  }

  return (
    <section className="panel">
      <h2>Custom Model Data</h2>
      <p style={{ marginTop: 0 }}>
        Adds/updates an item model override in <code>assets/minecraft/models/item/&lt;item&gt;.json</code> and
        writes a generated model + texture in your chosen namespace.
      </p>

      <div className="grid">
        <label>
          Item id
          <input value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="diamond_sword" />
        </label>

        <label>
          CustomModelData
          <input
            type="number"
            value={cmd}
            min={1}
            step={1}
            onChange={(e) => setCmd(Number(e.target.value))}
          />
        </label>

        <label>
          Namespace (advanced)
          <input value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="mrwm" />
        </label>

        <label>
          Texture PNG
          <input
            type="file"
            accept="image/png"
            onChange={(e) => setPngFile(e.target.files?.[0] ?? null)}
          />
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

      {ok && <p style={{ color: 'limegreen', whiteSpace: 'pre-wrap' }}>{ok}</p>}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
    </section>
  )
}
