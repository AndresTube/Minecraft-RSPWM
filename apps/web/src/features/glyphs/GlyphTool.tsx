import { useState, useRef } from 'react'
import type { ResourcePack, BitmapFontProvider } from '../../lib/resourcepack/types'
import {
  readFontFile,
  writeFontFile,
  listFontFiles,
  listFontTextures,
  createDefaultFontDefinition,
  createBitmapProvider,
  CHARACTER_PRESETS,
  splitIntoRows,
  validateFontDefinition,
  uploadFontTexture,
  addUnicodeGlyph
} from '../../lib/resourcepack/fonts'
import {
  getNextAvailableCodepoint,
  extractUsedCodepoints,
  codepointToChar,
  formatCodepoint,
  createTellrawCommand
} from '../../lib/resourcepack/unicode'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

type UnicodeMapping = {
  codepoint: number
  char: string
  textureName: string
  height: number
  ascent: number
}

export default function GlyphTool({ pack, onPackChange }: Props) {
  const [selectedFont, setSelectedFont] = useState('default')
  const [textureName, setTextureName] = useState('custom.png')
  const [height, setHeight] = useState(8)
  const [ascent, setAscent] = useState(7)
  const [charMapping, setCharMapping] = useState(CHARACTER_PRESETS.basic.join('\n'))
  const [selectedPreset, setSelectedPreset] = useState<string>('basic')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'fonts' | 'unicode'>('fonts')
  const [unicodeMappings, setUnicodeMappings] = useState<UnicodeMapping[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const unicodeFileInputRef = useRef<HTMLInputElement>(null)

  const fontFiles = listFontFiles(pack)
  const fontTextures = listFontTextures(pack)
  const currentFont = readFontFile(pack, selectedFont)

  const handleCreateFont = () => {
    const chars = charMapping.split('\n').filter((line) => line.trim() !== '')

    if (chars.length === 0) {
      setValidationErrors(['Character mapping cannot be empty'])
      return
    }

    const definition = createDefaultFontDefinition(textureName, chars)
    const errors = validateFontDefinition(definition)

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    const newPack = writeFontFile(pack, selectedFont, definition)
    onPackChange(newPack)
    setValidationErrors([])
  }

  const handleAddProvider = () => {
    if (!currentFont) {
      setValidationErrors(['Font file does not exist. Create it first.'])
      return
    }

    const chars = charMapping.split('\n').filter((line) => line.trim() !== '')

    if (chars.length === 0) {
      setValidationErrors(['Character mapping cannot be empty'])
      return
    }

    const provider = createBitmapProvider(textureName, chars, height, ascent)
    const updatedDefinition = {
      providers: [...currentFont.providers, provider]
    }

    const errors = validateFontDefinition(updatedDefinition)

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    const newPack = writeFontFile(pack, selectedFont, updatedDefinition)
    onPackChange(newPack)
    setValidationErrors([])
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)

    switch (preset) {
      case 'basic':
        setCharMapping(CHARACTER_PRESETS.basic.join('\n'))
        break
      case 'full':
        setCharMapping(CHARACTER_PRESETS.full.join('\n'))
        break
      case 'numbers':
        setCharMapping(CHARACTER_PRESETS.numbersOnly.join('\n'))
        break
      case 'uppercase':
        setCharMapping(splitIntoRows(CHARACTER_PRESETS.uppercase, 16).join('\n'))
        break
      case 'lowercase':
        setCharMapping(splitIntoRows(CHARACTER_PRESETS.lowercase, 16).join('\n'))
        break
      case 'custom':
        // Keep current mapping
        break
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.png')) {
      setValidationErrors(['Only PNG files are supported'])
      return
    }

    try {
      const newPack = await uploadFontTexture(pack, file)
      onPackChange(newPack)
      setTextureName(file.name)
      setValidationErrors([])
    } catch (err) {
      setValidationErrors([`Failed to upload texture: ${err}`])
    }
  }

  const getBitmapProviders = (): BitmapFontProvider[] => {
    if (!currentFont) return []
    return currentFont.providers.filter((p) => p.type === 'bitmap') as BitmapFontProvider[]
  }

  const handleUnicodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      let updatedPack = pack
      const newMappings: UnicodeMapping[] = []

      // Get currently used codepoints
      const usedCodepoints = currentFont
        ? extractUsedCodepoints(
            currentFont.providers
              .filter((p) => p.type === 'bitmap')
              .flatMap((p) => (p as BitmapFontProvider).chars)
          )
        : new Set<number>()

      for (const file of Array.from(files)) {
        if (!file.name.endsWith('.png')) continue

        // Upload texture
        updatedPack = await uploadFontTexture(updatedPack, file)

        // Get next available codepoint
        const codepoint = getNextAvailableCodepoint(usedCodepoints)
        usedCodepoints.add(codepoint)

        const char = codepointToChar(codepoint)

        // Add Unicode glyph
        updatedPack = addUnicodeGlyph(updatedPack, char, file.name, height, ascent, selectedFont)

        newMappings.push({
          codepoint,
          char,
          textureName: file.name,
          height,
          ascent
        })
      }

      setUnicodeMappings([...unicodeMappings, ...newMappings])
      onPackChange(updatedPack)
      setValidationErrors([])
    } catch (err) {
      setValidationErrors([`Failed to upload Unicode images: ${err}`])
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      setValidationErrors(['Failed to copy to clipboard'])
    })
  }

  return (
    <section className="panel">
      <h2>Custom Fonts & Unicode Glyphs</h2>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, borderBottom: '2px solid #ffffff20' }}>
        <button
          onClick={() => setActiveTab('fonts')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'fonts' ? '#0080ff40' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'fonts' ? '2px solid #0080ff' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'fonts' ? 'bold' : 'normal'
          }}
        >
          Font Builder
        </button>
        <button
          onClick={() => setActiveTab('unicode')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'unicode' ? '#0080ff40' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'unicode' ? '2px solid #0080ff' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'unicode' ? 'bold' : 'normal'
          }}
        >
          Unicode Images
        </button>
      </div>

      {activeTab === 'fonts' && (
        <>
          <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Font Selection</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            style={{ flex: 1, padding: 8 }}
          >
            <option value="default">default.json</option>
            {fontFiles
              .filter((f) => f !== 'default')
              .map((font) => (
                <option key={font} value={font}>
                  {font}.json
                </option>
              ))}
          </select>
          <input
            type="text"
            placeholder="New font name"
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val && !fontFiles.includes(val)) setSelectedFont(val)
            }}
            style={{ flex: 1, padding: 8 }}
          />
        </div>
        <small style={{ opacity: 0.7, marginTop: 4, display: 'block' }}>
          Use "default" to replace Minecraft's font. Create custom names for additional fonts.
        </small>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Upload Font Texture</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ marginRight: 8 }}>
          Upload PNG
        </button>
        <small style={{ opacity: 0.7 }}>
          Uploaded textures: {fontTextures.length > 0 ? fontTextures.join(', ') : 'none'}
        </small>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Texture Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Texture name:</label>
            <input
              type="text"
              value={textureName}
              onChange={(e) => setTextureName(e.target.value)}
              placeholder="e.g., custom.png"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Character preset:</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="basic">Basic (A-Z, a-z, 0-9)</option>
              <option value="full">Full (with punctuation)</option>
              <option value="numbers">Numbers only (0-9)</option>
              <option value="uppercase">Uppercase only (A-Z)</option>
              <option value="lowercase">Lowercase only (a-z)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Font Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              Height (pixels):
              <small style={{ opacity: 0.7, marginLeft: 8 }}>Typically 8</small>
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={1}
              max={32}
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              Ascent (baseline):
              <small style={{ opacity: 0.7, marginLeft: 8 }}>Usually height - 1</small>
            </label>
            <input
              type="number"
              value={ascent}
              onChange={(e) => setAscent(Number(e.target.value))}
              min={-32}
              max={32}
              style={{ width: '100%', padding: 8 }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Character Mapping</h3>
        <textarea
          value={charMapping}
          onChange={(e) => {
            setCharMapping(e.target.value)
            setSelectedPreset('custom')
          }}
          placeholder="Enter one row of characters per line"
          rows={8}
          style={{
            width: '100%',
            padding: 8,
            fontFamily: 'monospace',
            fontSize: 14
          }}
        />
        <small style={{ opacity: 0.7, display: 'block', marginTop: 4 }}>
          Each line represents a row of characters in your texture PNG.
          <br />
          Example: "ABCDEFGH" maps the first 8 characters in the first row.
        </small>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={handleCreateFont} style={{ padding: '10px 16px' }}>
          {currentFont ? 'Replace Font' : 'Create Font'}
        </button>
        {currentFont && (
          <button onClick={handleAddProvider} style={{ padding: '10px 16px' }}>
            Add Provider
          </button>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#ff000020',
            border: '1px solid #ff0000',
            borderRadius: 4
          }}
        >
          <strong>Errors:</strong>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {currentFont && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Current Font Definition</h3>
          <div
            style={{
              background: '#00000020',
              padding: 12,
              borderRadius: 4,
              maxHeight: 300,
              overflow: 'auto'
            }}
          >
            <strong>Providers: {currentFont.providers.length}</strong>
            {getBitmapProviders().map((provider, i) => (
              <div key={i} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #ffffff20' }}>
                <div>
                  <strong>Provider {i + 1}:</strong> {provider.type}
                </div>
                <div style={{ marginTop: 4, fontSize: 14 }}>
                  <div>File: {provider.file}</div>
                  <div>
                    Height: {provider.height}px, Ascent: {provider.ascent}
                  </div>
                  <div>Rows: {provider.chars.length}</div>
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ cursor: 'pointer' }}>View character mapping</summary>
                    <pre
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        background: '#00000040',
                        padding: 8,
                        borderRadius: 4,
                        overflow: 'auto'
                      }}
                    >
                      {provider.chars.join('\n')}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#0080ff20',
          border: '1px solid #0080ff',
          borderRadius: 4
        }}
      >
        <strong>Quick Guide:</strong>
        <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>Upload your font texture PNG (or ensure it exists in assets/minecraft/textures/font/)</li>
          <li>Enter the texture filename in "Texture name"</li>
          <li>Choose a character preset or create custom mapping</li>
          <li>Adjust height and ascent if needed (default: 8 and 7)</li>
          <li>Click "Create Font" or "Add Provider"</li>
        </ol>
      </div>
        </>
      )}

      {activeTab === 'unicode' && (
        <>
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 8 }}>Upload Images for Unicode Characters</h3>
            <p style={{ opacity: 0.8, marginBottom: 12 }}>
              Upload PNG images to automatically map them to Unicode characters. Each image will be assigned a unique Unicode codepoint.
            </p>

            <input
              ref={unicodeFileInputRef}
              type="file"
              accept=".png"
              multiple
              onChange={handleUnicodeImageUpload}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => unicodeFileInputRef.current?.click()} style={{ padding: '10px 16px' }}>
                Upload PNG Images
              </button>
              <small style={{ opacity: 0.7 }}>You can select multiple images at once</small>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  Height (pixels):
                  <small style={{ opacity: 0.7, marginLeft: 8 }}>Typically 8-16</small>
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={1}
                  max={256}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  Ascent (baseline):
                  <small style={{ opacity: 0.7, marginLeft: 8 }}>Usually height - 1</small>
                </label>
                <input
                  type="number"
                  value={ascent}
                  onChange={(e) => setAscent(Number(e.target.value))}
                  min={-256}
                  max={256}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
            </div>
          </div>

          {unicodeMappings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Mapped Unicode Characters ({unicodeMappings.length})</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {unicodeMappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#00000020',
                      padding: 12,
                      borderRadius: 4,
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Character</div>
                      <div
                        style={{
                          fontSize: 32,
                          fontFamily: 'monospace',
                          textAlign: 'center',
                          padding: 8,
                          background: '#ffffff10',
                          borderRadius: 4
                        }}
                      >
                        {mapping.char}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'center' }}>
                        {formatCodepoint(mapping.codepoint)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        <strong>Texture:</strong> {mapping.textureName}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        <strong>Size:</strong> {mapping.height}px (ascent: {mapping.ascent})
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => copyToClipboard(mapping.char)}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          Copy Char
                        </button>
                        <button
                          onClick={() => copyToClipboard(formatCodepoint(mapping.codepoint))}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          Copy Code
                        </button>
                        <button
                          onClick={() => copyToClipboard(createTellrawCommand(mapping.codepoint))}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          Copy Command
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#0080ff20',
              border: '1px solid #0080ff',
              borderRadius: 4
            }}
          >
            <strong>How to use Unicode images in-game:</strong>
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Upload your PNG images (they will be automatically mapped to Unicode characters)</li>
              <li>Copy the character or command using the buttons above</li>
              <li>Use in signs, books, chat, or with /tellraw commands</li>
              <li>The images will display in-game when you type or use the character</li>
            </ol>
            <div style={{ marginTop: 12, padding: 8, background: '#00000020', borderRadius: 4, fontSize: 13 }}>
              <strong>Example command:</strong>
              <pre style={{ margin: '4px 0', fontFamily: 'monospace' }}>
                /tellraw @a {'{'}\"text\":\"[Your Unicode char]\",\"color\":\"white\"{'}'}
              </pre>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
