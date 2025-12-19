import { useState, useEffect } from 'react'

type Props = {
  imageData: Uint8Array | File | null
  alt?: string
  maxWidth?: number
  maxHeight?: number
  pixelated?: boolean
}

export default function TexturePreview({ imageData, alt = 'Texture preview', maxWidth = 256, maxHeight = 256, pixelated = true }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imageData) {
      setDataUrl(null)
      setError(null)
      return
    }

    let blob: Blob

    if (imageData instanceof File) {
      blob = imageData
    } else {
      // Convert Uint8Array to array for compatibility
      blob = new Blob([imageData as any], { type: 'image/png' })
    }

    const url = URL.createObjectURL(blob)
    setDataUrl(url)
    setError(null)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [imageData])

  if (!imageData) {
    return (
      <div className="texture-preview empty">
        <span>No image selected</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="texture-preview error">
        <span>Failed to load image: {error}</span>
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className="texture-preview loading">
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="texture-preview">
      <img
        src={dataUrl}
        alt={alt}
        style={{
          maxWidth,
          maxHeight,
          imageRendering: pixelated ? 'pixelated' : 'auto',
        }}
        onError={() => setError('Invalid image format')}
      />

      <style>{`
        .texture-preview {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          min-height: 80px;
          padding: 12px;
          border-radius: 2px;
          border: 2px solid var(--mc-border);
          background:
            /* Checkerboard pattern */
            repeating-conic-gradient(rgba(0,0,0,0.1) 0% 25%, transparent 0% 50%)
            50% / 16px 16px,
            rgba(0, 0, 0, 0.25);
        }

        .texture-preview img {
          display: block;
          max-width: 100%;
          height: auto;
        }

        .texture-preview.empty,
        .texture-preview.error,
        .texture-preview.loading {
          opacity: 0.6;
          font-size: 0.9em;
        }

        .texture-preview.error {
          color: tomato;
        }
      `}</style>
    </div>
  )
}
