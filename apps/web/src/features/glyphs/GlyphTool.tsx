import type { ResourcePack } from '../../lib/resourcepack/types'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

export default function GlyphTool(_: Props) {
  return (
    <section className="panel">
      <h2>Unicode glyph images</h2>
      <p style={{ marginTop: 8, opacity: 0.9 }}>Coming soon...</p>
    </section>
  )
}
