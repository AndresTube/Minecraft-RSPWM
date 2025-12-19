import { useState, useEffect } from 'react'
import './App.css'
import SinglePackWorkspace from './components/SinglePackWorkspace'
import CmdTool from './features/cmd/CmdTool'
import GlyphTool from './features/glyphs/GlyphTool'
import MixerTool from './features/mixer/MixerTool'
import VanillaTool from './features/vanilla/VanillaTool'
import JsonEditorTool from './features/editor/JsonEditorTool'
import SoundTool from './features/sounds/SoundTool'
import AnalyzerTool from './features/analyzer/AnalyzerTool'
import ConverterTool from './features/converter/ConverterTool'
import ManagerTool from './features/manager/ManagerTool'
import { createEmptyPack, defaultPackSettings, type PackSettings } from './lib/resourcepack/metadata'
import type { ResourcePack } from './lib/resourcepack/types'
import { savePackToStorage, loadPackFromStorage } from './lib/resourcepack/persistence'

type ToolKey = 'cmd' | 'vanilla' | 'mixer' | 'glyphs' | 'json' | 'sounds' | 'analyzer' | 'converter' | 'manager'

function App() {
  const [tool, setTool] = useState<ToolKey>('cmd')
  const [settings, setSettings] = useState<PackSettings>(() => defaultPackSettings())
  const [pack, setPack] = useState<ResourcePack>(() => createEmptyPack(defaultPackSettings()))
  const [loadedFromStorage, setLoadedFromStorage] = useState(false)

  // Load pack from localStorage on mount
  useEffect(() => {
    async function load() {
      const stored = await loadPackFromStorage()
      if (stored) {
        setPack(stored.pack)
        setSettings(stored.settings)
        setLoadedFromStorage(true)
      }
    }
    void load()
  }, [])

  // Auto-save to localStorage on changes (debounced)
  useEffect(() => {
    if (!loadedFromStorage && pack.files.size === 0) return

    const timeout = setTimeout(() => {
      savePackToStorage(pack, settings)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [pack, settings, loadedFromStorage])

  return (
    <div className="app">
      <header className="header">
        <h1>Minecraft Resource Pack Web Manager</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Pure web app: import pack ZIP(s) → edit in-browser → download a new ZIP.
        </p>

        <nav className="tabs" aria-label="Tools">
          <button type="button" className={tool === 'cmd' ? 'active' : ''} onClick={() => setTool('cmd')}>
            Custom Model Data
          </button>
          <button
            type="button"
            className={tool === 'vanilla' ? 'active' : ''}
            onClick={() => setTool('vanilla')}
          >
            Vanilla Textures
          </button>
          <button type="button" className={tool === 'glyphs' ? 'active' : ''} onClick={() => setTool('glyphs')}>
            Unicode Glyphs
          </button>
          <button type="button" className={tool === 'sounds' ? 'active' : ''} onClick={() => setTool('sounds')}>
            Sounds
          </button>
          <button type="button" className={tool === 'manager' ? 'active' : ''} onClick={() => setTool('manager')}>
            Manager
          </button>
          <button type="button" className={tool === 'json' ? 'active' : ''} onClick={() => setTool('json')}>
            JSON Editor
          </button>
          <button type="button" className={tool === 'analyzer' ? 'active' : ''} onClick={() => setTool('analyzer')}>
            Analyzer
          </button>
          <button type="button" className={tool === 'converter' ? 'active' : ''} onClick={() => setTool('converter')}>
            Version Converter
          </button>
          <button type="button" className={tool === 'mixer' ? 'active' : ''} onClick={() => setTool('mixer')}>
            Pack Mixer
          </button>
        </nav>
      </header>

      <main className="content">
        {tool !== 'mixer' && (
          <SinglePackWorkspace
            pack={pack}
            onPackChange={setPack}
            settings={settings}
            onSettingsChange={setSettings}
            exportNameSuffix="edited"
          />
        )}

        {tool === 'mixer' && <MixerTool />}

        {tool === 'cmd' && <CmdTool pack={pack} onPackChange={setPack} />}
        {tool === 'vanilla' && <VanillaTool pack={pack} onPackChange={setPack} />}
        {tool === 'glyphs' && <GlyphTool pack={pack} onPackChange={setPack} />}
        {tool === 'sounds' && <SoundTool pack={pack} onPackChange={setPack} />}
        {tool === 'manager' && <ManagerTool pack={pack} onPackChange={setPack} />}
        {tool === 'json' && <JsonEditorTool pack={pack} onPackChange={setPack} />}
        {tool === 'analyzer' && <AnalyzerTool pack={pack} onPackChange={setPack} />}
        {tool === 'converter' && <ConverterTool pack={pack} onPackChange={setPack} />}
      </main>
    </div>
  )
}

export default App
