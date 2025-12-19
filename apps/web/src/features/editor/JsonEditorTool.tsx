import { useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { readText, writeText, cloneVfs } from '../../lib/resourcepack/vfs'
import { validateJson } from '../../lib/resourcepack/validation'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function JsonEditorTool({ pack, onPackChange }: Props) {
  const [path, setPath] = useState('pack.mcmeta')
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Get list of JSON files
  const jsonFiles = Array.from(pack.files.keys())
    .filter(p => p.endsWith('.json'))
    .sort()

  function loadFile() {
    setMessage(null)
    const text = readText(pack.files, path)

    if (text === null) {
      setMessage({ type: 'error', text: `File not found: ${path}` })
      setContent('')
      setLoaded(false)
      return
    }

    // Pretty-print the JSON
    try {
      const parsed = JSON.parse(text)
      setContent(JSON.stringify(parsed, null, 2))
      setLoaded(true)
      setMessage({ type: 'success', text: `Loaded ${path}` })
    } catch (e) {
      // File exists but isn't valid JSON, show raw content
      setContent(text)
      setLoaded(true)
      setMessage({ type: 'error', text: `Warning: Invalid JSON in ${path}` })
    }
  }

  function saveFile() {
    setMessage(null)

    // Validate JSON
    const validation = validateJson(content)
    if (!validation.valid) {
      setMessage({ type: 'error', text: `Invalid JSON: ${validation.error}` })
      return
    }

    try {
      const files = cloneVfs(pack.files)
      writeText(files, path, content)
      onPackChange({ ...pack, files })
      setMessage({ type: 'success', text: `Saved ${path}` })
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to save: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  function formatJson() {
    setMessage(null)

    try {
      const parsed = JSON.parse(content)
      setContent(JSON.stringify(parsed, null, 2))
      setMessage({ type: 'success', text: 'Formatted JSON' })
    } catch (e) {
      setMessage({ type: 'error', text: `Cannot format: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  function createNewFile() {
    const newPath = prompt('Enter file path (e.g., assets/minecraft/models/item/custom.json):')
    if (!newPath) return

    if (!newPath.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Path must end with .json' })
      return
    }

    setPath(newPath)
    setContent('{\n  \n}')
    setLoaded(true)
    setMessage({ type: 'success', text: `Ready to create ${newPath}` })
  }

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>JSON Editor</h2>
      <p style={{ opacity: 0.85 }}>
        Edit JSON files directly in your pack. Perfect for manual tweaks and advanced customization.
      </p>

      <div className="grid">
        <label>
          Select JSON file
          <select value={path} onChange={(e) => setPath(e.target.value)}>
            {jsonFiles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <button type="button" onClick={loadFile}>
            Load File
          </button>
          <button type="button" onClick={createNewFile}>
            New File
          </button>
        </div>
      </div>

      {loaded && (
        <>
          <label style={{ marginTop: 16 }}>
            JSON Content
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              spellCheck={false}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.9em',
                resize: 'vertical',
              }}
            />
          </label>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" onClick={saveFile} className="primary">
              Save Changes
            </button>
            <button type="button" onClick={formatJson}>
              Format JSON
            </button>
          </div>
        </>
      )}

      {message && (
        <p style={{ marginTop: 12, color: message.type === 'error' ? 'tomato' : 'var(--mc-accent)' }}>
          {message.text}
        </p>
      )}
    </section>
  )
}
