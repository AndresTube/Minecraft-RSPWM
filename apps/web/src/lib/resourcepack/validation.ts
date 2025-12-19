import type { ResourcePack } from './types'
import { readJson, vfsGet } from './vfs'

export type ValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  message: string
  path?: string
  fix?: string
}

export function validatePack(pack: ResourcePack): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for pack.mcmeta
  if (!vfsGet(pack.files, 'pack.mcmeta')) {
    issues.push({
      severity: 'error',
      message: 'Missing pack.mcmeta file',
      path: 'pack.mcmeta',
      fix: 'Apply pack settings to generate pack.mcmeta',
    })
  } else {
    // Validate pack.mcmeta structure
    const mcmeta = readJson<{ pack?: { pack_format?: unknown; description?: unknown } }>(pack.files, 'pack.mcmeta')
    if (!mcmeta?.pack) {
      issues.push({
        severity: 'error',
        message: 'pack.mcmeta is missing "pack" object',
        path: 'pack.mcmeta',
      })
    } else {
      if (typeof mcmeta.pack.pack_format !== 'number') {
        issues.push({
          severity: 'error',
          message: 'pack.mcmeta is missing valid "pack_format" number',
          path: 'pack.mcmeta',
        })
      }
      if (typeof mcmeta.pack.description !== 'string') {
        issues.push({
          severity: 'warning',
          message: 'pack.mcmeta is missing "description" string',
          path: 'pack.mcmeta',
        })
      }
    }
  }

  // Validate all JSON files
  for (const [path, data] of pack.files.entries()) {
    if (path.endsWith('.json')) {
      try {
        const text = new TextDecoder().decode(data)
        JSON.parse(text)
      } catch (e) {
        issues.push({
          severity: 'error',
          message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
          path,
        })
      }
    }
  }

  // Check for pack.png
  if (!vfsGet(pack.files, 'pack.png')) {
    issues.push({
      severity: 'info',
      message: 'No pack.png icon found (optional but recommended)',
      path: 'pack.png',
    })
  }

  // Warn about common path mistakes
  for (const path of pack.files.keys()) {
    if (path.startsWith('assets/') && path.includes('//')) {
      issues.push({
        severity: 'warning',
        message: 'Path contains double slashes',
        path,
      })
    }

    if (path.startsWith('/')) {
      issues.push({
        severity: 'warning',
        message: 'Path starts with slash (should be relative)',
        path,
      })
    }

    if (path.includes('\\')) {
      issues.push({
        severity: 'error',
        message: 'Path contains backslashes (should use forward slashes)',
        path,
      })
    }
  }

  return issues
}

export function validateJson(jsonString: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(jsonString)
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export function validateTexturePath(path: string, namespace: string = 'minecraft'): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = path.trim()
  if (!trimmed) {
    return { valid: false, error: 'Path cannot be empty' }
  }

  // Check if it's already a full path
  if (trimmed.startsWith('assets/')) {
    if (!trimmed.endsWith('.png')) {
      return { valid: false, error: 'Texture path must end with .png' }
    }
    return { valid: true, normalized: trimmed }
  }

  // Check if it's a resource location (namespace:path)
  const match = /^([a-z0-9_.-]+):(.+)$/.exec(trimmed)
  if (match) {
    const ns = match[1]
    const subpath = match[2].replace(/^\//, '')
    const normalized = `assets/${ns}/textures/${subpath}${subpath.endsWith('.png') ? '' : '.png'}`
    return { valid: true, normalized }
  }

  // Assume it's a shorthand path
  const normalized = `assets/${namespace}/textures/${trimmed.replace(/^\//, '')}${trimmed.endsWith('.png') ? '' : '.png'}`
  return { valid: true, normalized }
}

export function validateItemId(itemId: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = itemId.trim()
  if (!trimmed) {
    return { valid: false, error: 'Item ID cannot be empty' }
  }

  // Check if it's already namespaced
  const match = /^([a-z0-9_.-]+):([a-z0-9_./-]+)$/.exec(trimmed.toLowerCase())
  if (match) {
    return { valid: true, normalized: trimmed.toLowerCase() }
  }

  // Check if it's a valid item name (no namespace)
  if (/^[a-z0-9_./-]+$/.test(trimmed.toLowerCase())) {
    return { valid: true, normalized: `minecraft:${trimmed.toLowerCase()}` }
  }

  return { valid: false, error: 'Invalid item ID format. Use lowercase letters, numbers, underscores, dots, and hyphens only.' }
}

export function suggestFixes(pack: ResourcePack): string[] {
  const suggestions: string[] = []
  const issues = validatePack(pack)

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  if (errors.length > 0) {
    suggestions.push(`Found ${errors.length} error(s) that must be fixed`)
    errors.forEach(e => {
      if (e.fix) {
        suggestions.push(`  • ${e.message}: ${e.fix}`)
      }
    })
  }

  if (warnings.length > 0) {
    suggestions.push(`Found ${warnings.length} warning(s) to review`)
  }

  return suggestions
}

export function autoFixPack(pack: ResourcePack): { pack: ResourcePack; fixed: string[] } {
  const fixed: string[] = []
  const newFiles = new Map(pack.files)

  // Remove paths with backslashes by re-normalizing them
  for (const [path, data] of Array.from(newFiles.entries())) {
    if (path.includes('\\')) {
      const normalized = path.replace(/\\/g, '/')
      newFiles.delete(path)
      newFiles.set(normalized, data)
      fixed.push(`Normalized path: ${path} → ${normalized}`)
    }
  }

  return {
    pack: { ...pack, files: newFiles },
    fixed,
  }
}
