import { useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { convertPackFormat, autoUpgradePack, detectPackFormat, type ConversionResult } from '../../lib/resourcepack/converter'
import { RESOURCE_PACK_FORMATS } from '../../lib/resourcepack/versioning'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function ConverterTool({ pack, onPackChange }: Props) {
  const [targetFormat, setTargetFormat] = useState(34)
  const [result, setResult] = useState<ConversionResult | null>(null)

  const currentFormat = detectPackFormat(pack)

  function handleConvert() {
    const converted = convertPackFormat(pack, targetFormat)
    setResult(converted)
    onPackChange(converted.pack)
  }

  function handleAutoUpgrade() {
    const upgraded = autoUpgradePack(pack)
    setResult(upgraded)
    onPackChange(upgraded.pack)
  }

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Version Converter</h2>
      <p style={{ opacity: 0.85 }}>
        Convert your pack between different Minecraft versions. Automatically handles format changes like the 1.21.4 item model system.
      </p>

      <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 2, marginBottom: 16 }}>
        <strong>Current Pack Format:</strong> {currentFormat || 'Unknown'}
        {currentFormat && (
          <span style={{ marginLeft: 8, opacity: 0.8 }}>
            ({RESOURCE_PACK_FORMATS.find(f => f.packFormat === currentFormat)?.label || 'Custom'})
          </span>
        )}
      </div>

      <div className="grid">
        <label>
          Target Pack Format
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(Number(e.target.value))}
          >
            {RESOURCE_PACK_FORMATS.map((format) => (
              <option key={format.packFormat} value={format.packFormat}>
                {format.label} (format {format.packFormat})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" onClick={handleConvert} className="primary">
          Convert to Selected Format
        </button>
        <button type="button" onClick={handleAutoUpgrade}>
          Auto-Upgrade to Latest
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.changes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, color: 'var(--mc-accent)' }}>Changes Applied ({result.changes.length})</h3>
              <ul style={{ fontSize: '0.9em' }}>
                {result.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <h3 style={{ marginTop: 0, color: 'orange' }}>Warnings ({result.warnings.length})</h3>
              <ul style={{ fontSize: '0.9em' }}>
                {result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.changes.length === 0 && result.warnings.length === 0 && (
            <p style={{ color: 'var(--mc-muted)' }}>No changes needed.</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 2 }}>
        <h3 style={{ marginTop: 0, fontSize: '1em' }}>About Format Conversions:</h3>
        <ul style={{ marginBottom: 0, paddingLeft: 20, fontSize: '0.9em' }}>
          <li><strong>1.21.4 (format 46+):</strong> Introduced new item model system with range_dispatch</li>
          <li><strong>Legacy (format &lt; 46):</strong> Uses overrides array in model JSON files</li>
          <li>Converting between formats will restructure custom model data definitions</li>
          <li>Always test your pack after conversion!</li>
          <li>Backup your pack before converting (export before converting)</li>
        </ul>
      </div>
    </section>
  )
}
