import { useState, useMemo } from 'react'
import type { ResourcePack } from '../lib/resourcepack/types'
import { vfsDelete } from '../lib/resourcepack/vfs'
import { formatSize } from '../lib/resourcepack/analyzer'

type Props = {
  pack: ResourcePack
  onPackChange: (pack: ResourcePack) => void
  onFileSelect?: (path: string) => void
}

type FileNode = {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  children?: FileNode[] | Record<string, FileNode>
}

export default function FileBrowser({ pack, onPackChange, onFileSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['assets']))
  const [filter, setFilter] = useState('')

  const fileTree = useMemo(() => {
    return buildFileTree(Array.from(pack.files.keys()), pack.files)
  }, [pack.files])

  const filteredTree = useMemo(() => {
    if (!filter) return fileTree
    return filterTree(fileTree, filter.toLowerCase())
  }, [fileTree, filter])

  function toggleFolder(path: string) {
    const next = new Set(expanded)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    setExpanded(next)
  }

  function deleteFile(path: string) {
    if (!confirm(`Delete ${path}?`)) return

    const files = new Map(pack.files)
    vfsDelete(files, path)
    onPackChange({ ...pack, files })
  }

  function renderNode(node: FileNode, depth: number = 0): React.JSX.Element {
    const isExpanded = expanded.has(node.path)
    const paddingLeft = depth * 20

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className="file-browser-item folder"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            <span className="icon">{isExpanded ? '📂' : '📁'}</span>
            <span className="name">{node.name}</span>
            <span className="count">({Array.isArray(node.children) ? node.children.length : 0})</span>
          </div>
          {isExpanded && node.children && Array.isArray(node.children) && (
            <div className="folder-children">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        key={node.path}
        className="file-browser-item file"
        style={{ paddingLeft }}
      >
        <span className="icon">{getFileIcon(node.name)}</span>
        <span
          className="name clickable"
          onClick={() => onFileSelect?.(node.path)}
          title={node.path}
        >
          {node.name}
        </span>
        <span className="size">{formatSize(node.size || 0)}</span>
        <button
          type="button"
          className="delete-btn"
          onClick={() => deleteFile(node.path)}
          title="Delete file"
        >
          🗑️
        </button>
      </div>
    )
  }

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <h3 style={{ margin: 0 }}>Files ({pack.files.size})</h3>
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div className="file-browser-tree">
        {filteredTree.map(node => renderNode(node))}
      </div>

      <style>{`
        .file-browser {
          border: 2px solid var(--mc-border);
          border-radius: 2px;
          background: var(--mc-panel);
          padding: 16px;
          max-height: 500px;
          display: flex;
          flex-direction: column;
        }

        .file-browser-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
        }

        .file-browser-tree {
          overflow-y: auto;
          flex: 1;
        }

        .file-browser-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          cursor: pointer;
          user-select: none;
          border-radius: 2px;
          transition: background 100ms;
        }

        .file-browser-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-browser-item .icon {
          flex-shrink: 0;
          width: 20px;
        }

        .file-browser-item .name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.9em;
        }

        .file-browser-item .name.clickable:hover {
          text-decoration: underline;
          color: var(--mc-accent);
        }

        .file-browser-item .size {
          flex-shrink: 0;
          font-size: 0.85em;
          opacity: 0.7;
        }

        .file-browser-item .count {
          flex-shrink: 0;
          font-size: 0.85em;
          opacity: 0.6;
        }

        .file-browser-item .delete-btn {
          flex-shrink: 0;
          padding: 2px 6px;
          font-size: 0.8em;
          opacity: 0;
          transition: opacity 150ms;
        }

        .file-browser-item:hover .delete-btn {
          opacity: 1;
        }

        .folder-children {
          /* No additional styling needed */
        }
      `}</style>
    </div>
  )
}

function buildFileTree(paths: string[], files: Map<string, Uint8Array>): FileNode[] {
  const root: Record<string, FileNode> = {}

  for (const path of paths) {
    const parts = path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const fullPath = parts.slice(0, i + 1).join('/')

      if (!current[part]) {
        current[part] = {
          name: part,
          path: fullPath,
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : {},
          size: isLast ? files.get(path)?.byteLength : undefined,
        }
      }

      if (!isLast) {
        current = current[part].children as Record<string, FileNode>
      }
    }
  }

  return Object.values(root).map(node => convertToArray(node)).sort(sortNodes)
}

function convertToArray(node: FileNode): FileNode {
  if (node.type === 'folder' && node.children) {
    return {
      ...node,
      children: Object.values(node.children as Record<string, FileNode>)
        .map(convertToArray)
        .sort(sortNodes),
    }
  }
  return node
}

function sortNodes(a: FileNode, b: FileNode): number {
  // Folders first
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1
  }
  // Then alphabetically
  return a.name.localeCompare(b.name)
}

function filterTree(nodes: FileNode[], filter: string): FileNode[] {
  const filtered: FileNode[] = []

  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.path.toLowerCase().includes(filter)) {
        filtered.push(node)
      }
    } else if (node.children && Array.isArray(node.children)) {
      const filteredChildren = filterTree(node.children, filter)
      if (filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
        })
      }
    }
  }

  return filtered
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'json': return '📄'
    case 'png': return '🖼️'
    case 'ogg': return '🔊'
    case 'txt': return '📝'
    case 'mcmeta': return '⚙️'
    default: return '📄'
  }
}
