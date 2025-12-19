import { useState } from 'react'
import type { ResourcePack } from '../../lib/resourcepack/types'
import { analyzePack, findUnusedFiles, findDuplicateTextures, formatSize, type PackStats } from '../../lib/resourcepack/analyzer'
import { validatePack, type ValidationIssue } from '../../lib/resourcepack/validation'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
}

type TabType = 'stats' | 'validation' | 'unused' | 'duplicates'

export default function AnalyzerTool({ pack }: Props) {
  const [tab, setTab] = useState<TabType>('stats')
  const [stats, setStats] = useState<PackStats | null>(null)
  const [validation, setValidation] = useState<ValidationIssue[] | null>(null)
  const [unused, setUnused] = useState<string[] | null>(null)
  const [duplicates, setDuplicates] = useState<Array<{ paths: string[]; size: number }> | null>(null)

  function runAnalysis() {
    setStats(analyzePack(pack))
    setValidation(validatePack(pack))
    setUnused(findUnusedFiles(pack))
    setDuplicates(findDuplicateTextures(pack))
  }

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Pack Analyzer</h2>
      <p style={{ opacity: 0.85 }}>
        Analyze your pack for statistics, validation issues, unused files, and duplicate textures.
      </p>

      <button type="button" onClick={runAnalysis} className="primary">
        Run Analysis
      </button>

      {stats && (
        <>
          <div className="tabs" style={{ marginTop: 16 }}>
            <button type="button" className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
              Statistics
            </button>
            <button type="button" className={tab === 'validation' ? 'active' : ''} onClick={() => setTab('validation')}>
              Validation ({validation?.length || 0})
            </button>
            <button type="button" className={tab === 'unused' ? 'active' : ''} onClick={() => setTab('unused')}>
              Unused Files ({unused?.length || 0})
            </button>
            <button type="button" className={tab === 'duplicates' ? 'active' : ''} onClick={() => setTab('duplicates')}>
              Duplicates ({duplicates?.length || 0})
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            {tab === 'stats' && <StatsTab stats={stats} />}
            {tab === 'validation' && <ValidationTab issues={validation || []} />}
            {tab === 'unused' && <UnusedTab files={unused || []} />}
            {tab === 'duplicates' && <DuplicatesTab duplicates={duplicates || []} />}
          </div>
        </>
      )}
    </section>
  )
}

function StatsTab({ stats }: { stats: PackStats }) {
  return (
    <div>
      <h3>Overview</h3>
      <ul>
        <li><strong>Total Files:</strong> {stats.totalFiles}</li>
        <li><strong>Total Size:</strong> {formatSize(stats.totalSize)}</li>
      </ul>

      <h3>By File Type</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--mc-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Count</th>
            <th style={{ textAlign: 'right', padding: '8px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats.byType)
            .sort((a, b) => b[1].size - a[1].size)
            .map(([type, data]) => (
              <tr key={type}>
                <td style={{ padding: '8px' }}>.{type}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{data.count}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>{formatSize(data.size)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h3>By Namespace</h3>
      <ul>
        {Object.entries(stats.byNamespace)
          .sort((a, b) => b[1] - a[1])
          .map(([ns, count]) => (
            <li key={ns}><strong>{ns}:</strong> {count} files</li>
          ))}
      </ul>

      <h3>Largest Files</h3>
      <ol>
        {stats.largestFiles.slice(0, 10).map(file => (
          <li key={file.path}>
            <code style={{ fontSize: '0.85em' }}>{file.path}</code> - {formatSize(file.size)}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ValidationTab({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return <p style={{ color: 'var(--mc-accent)' }}>No validation issues found!</p>
  }

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const info = issues.filter(i => i.severity === 'info')

  return (
    <div>
      {errors.length > 0 && (
        <>
          <h3 style={{ color: 'tomato' }}>Errors ({errors.length})</h3>
          <ul>
            {errors.map((issue, i) => (
              <li key={i}>
                <strong>{issue.path || 'General'}:</strong> {issue.message}
                {issue.fix && <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Fix: {issue.fix}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {warnings.length > 0 && (
        <>
          <h3 style={{ color: 'orange' }}>Warnings ({warnings.length})</h3>
          <ul>
            {warnings.map((issue, i) => (
              <li key={i}>
                <strong>{issue.path || 'General'}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </>
      )}

      {info.length > 0 && (
        <>
          <h3>Info ({info.length})</h3>
          <ul>
            {info.map((issue, i) => (
              <li key={i}>
                <strong>{issue.path || 'General'}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function UnusedTab({ files }: { files: string[] }) {
  if (files.length === 0) {
    return <p style={{ color: 'var(--mc-accent)' }}>No unused files detected!</p>
  }

  return (
    <div>
      <p>These files are not referenced by any JSON files in the pack. They may be unused.</p>
      <ul style={{ fontSize: '0.9em' }}>
        {files.map(file => (
          <li key={file}><code>{file}</code></li>
        ))}
      </ul>
    </div>
  )
}

function DuplicatesTab({ duplicates }: { duplicates: Array<{ paths: string[]; size: number }> }) {
  if (duplicates.length === 0) {
    return <p style={{ color: 'var(--mc-accent)' }}>No duplicate textures found!</p>
  }

  const totalWasted = duplicates.reduce((sum, d) => sum + (d.size * (d.paths.length - 1)), 0)

  return (
    <div>
      <p>These texture files have identical content. You could save {formatSize(totalWasted)} by deduplicating them.</p>
      {duplicates.map((dup, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 2 }}>
          <strong>Size: {formatSize(dup.size)}</strong>
          <ul style={{ fontSize: '0.9em', marginTop: 8 }}>
            {dup.paths.map(path => (
              <li key={path}><code>{path}</code></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
