import type { ResourcePack } from './types'
import type { PackSettings } from './metadata'
import { writeJson, writeText } from './vfs'

export type PackTemplate = {
  id: string
  name: string
  description: string
  create: (settings: PackSettings) => ResourcePack
}

export const PACK_TEMPLATES: PackTemplate[] = [
  {
    id: 'empty',
    name: 'Empty Pack',
    description: 'Start from scratch with just pack.mcmeta',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })
      return { name: settings.name, files }
    },
  },
  {
    id: 'basic',
    name: 'Basic Pack',
    description: 'Empty pack with standard folder structure',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })

      // Create standard directories with .keep files
      const directories = [
        'assets/minecraft/textures/block',
        'assets/minecraft/textures/item',
        'assets/minecraft/textures/entity',
        'assets/minecraft/textures/gui',
        'assets/minecraft/models/block',
        'assets/minecraft/models/item',
        'assets/minecraft/blockstates',
        'assets/minecraft/sounds',
        'assets/minecraft/lang',
        'assets/minecraft/font',
      ]

      for (const dir of directories) {
        writeText(files, `${dir}/.keep`, '')
      }

      return { name: settings.name, files }
    },
  },
  {
    id: 'custom-items',
    name: 'Custom Items Pack',
    description: 'Pre-configured for custom item textures and models',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })

      // Create custom namespace
      const ns = 'custom'
      const directories = [
        `assets/${ns}/textures/item`,
        `assets/${ns}/models/item`,
        'assets/minecraft/models/item',
      ]

      for (const dir of directories) {
        writeText(files, `${dir}/.keep`, '')
      }

      // Add example README
      writeText(files, 'README.txt',
        `Custom Items Resource Pack
========================

This pack is set up for custom item textures and models.

Structure:
- assets/custom/textures/item/ - Put your custom textures here
- assets/custom/models/item/ - Put your custom models here
- assets/minecraft/models/item/ - Override vanilla item models here

Use the Custom Model Data tool to add custom items!
`)

      return { name: settings.name, files }
    },
  },
  {
    id: 'gui-overhaul',
    name: 'GUI Overhaul Pack',
    description: 'Optimized for customizing GUI textures',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })

      const directories = [
        'assets/minecraft/textures/gui',
        'assets/minecraft/textures/gui/container',
        'assets/minecraft/textures/gui/title',
        'assets/minecraft/textures/gui/advancements',
        'assets/minecraft/textures/gui/sprites',
      ]

      for (const dir of directories) {
        writeText(files, `${dir}/.keep`, '')
      }

      writeText(files, 'README.txt',
        `GUI Overhaul Resource Pack
==========================

This pack is set up for customizing Minecraft's GUI.

Structure:
- assets/minecraft/textures/gui/ - Main GUI elements
- assets/minecraft/textures/gui/container/ - Inventory screens
- assets/minecraft/textures/gui/title/ - Title screen elements
- assets/minecraft/textures/gui/advancements/ - Achievement screens
- assets/minecraft/textures/gui/sprites/ - UI sprites (1.20+)
`)

      return { name: settings.name, files }
    },
  },
  {
    id: 'font-pack',
    name: 'Font Pack',
    description: 'Set up for custom fonts and Unicode glyphs',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })

      const directories = [
        'assets/minecraft/textures/font',
        'assets/minecraft/font',
      ]

      for (const dir of directories) {
        writeText(files, `${dir}/.keep`, '')
      }

      // Create an empty/default font file (providers will be added by tools)
      writeJson(files, 'assets/minecraft/font/default.json', {
        providers: [],
      })

      writeText(files, 'README.txt',
        `Font Resource Pack
==================

This pack is set up for custom fonts and Unicode glyphs.

Use the Unicode Glyphs tool to add custom characters!

Structure:
- assets/minecraft/textures/font/ - Font texture files
- assets/minecraft/font/ - Font definition JSON files
`)

      return { name: settings.name, files }
    },
  },
  {
    id: 'sounds',
    name: 'Sound Pack',
    description: 'Set up for custom sounds',
    create: (settings) => {
      const files = new Map<string, Uint8Array>()
      writeJson(files, 'pack.mcmeta', {
        pack: {
          pack_format: settings.packFormat,
          description: settings.description,
        },
      })

      const directories = [
        'assets/minecraft/sounds',
        'assets/minecraft/sounds/ambient',
        'assets/minecraft/sounds/block',
        'assets/minecraft/sounds/entity',
        'assets/minecraft/sounds/item',
        'assets/minecraft/sounds/music',
        'assets/minecraft/sounds/ui',
      ]

      for (const dir of directories) {
        writeText(files, `${dir}/.keep`, '')
      }

      // Create example sounds.json
      writeJson(files, 'assets/minecraft/sounds.json', {
        'example.custom_sound': {
          sounds: [
            {
              name: 'minecraft:custom/example',
              stream: false,
            },
          ],
        },
      })

      writeText(files, 'README.txt',
        `Sound Resource Pack
===================

This pack is set up for custom sounds.

Sound files must be .ogg format.

Structure:
- assets/minecraft/sounds/ - Sound files (.ogg)
- assets/minecraft/sounds.json - Sound definitions

Use the Sound Pack tool to add sounds!
`)

      return { name: settings.name, files }
    },
  },
]

export function getTemplate(id: string): PackTemplate | null {
  return PACK_TEMPLATES.find(t => t.id === id) ?? null
}

export function createPackFromTemplate(templateId: string, settings: PackSettings): ResourcePack {
  const template = getTemplate(templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  return template.create(settings)
}
