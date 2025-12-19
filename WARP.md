# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository layout (big picture)
This repo is a browser-only React + Vite app in `apps/web`.

Key constraint: since this is pure web (no backend), all resource-pack operations happen in-memory and the app exports a new ZIP for the user to download.

## Common commands

### Install dependencies
- `npm --prefix apps/web ci`

### Run dev
- `npm --prefix apps/web run dev`
- UI: http://localhost:5173

Root shortcuts:
- `npm run dev`

### Build
- `npm --prefix apps/web run build`

Root shortcuts:
- `npm run build`

### Lint
- `npm --prefix apps/web run lint`
- Lint one file:
  - `npm --prefix apps/web run lint -- src/App.tsx`

### Preview production build
- `npm --prefix apps/web run preview`

### Tests
No test runner is configured yet (no `test` scripts or test framework dependencies found).

## Architecture notes

### apps/web (React + Vite)
Entry points:
- `apps/web/src/main.tsx`: React bootstrap.
- `apps/web/src/App.tsx`: app shell and tool navigation.

Core resource-pack logic is implemented as a web-only library under `apps/web/src/lib/resourcepack/`:
- `zip.ts`: import/export ZIPs.
- `vfs.ts`: in-memory virtual filesystem helpers.
- `metadata.ts`: create/update `pack.mcmeta` and pack settings.
- `tools.ts`: the actual pack operations (CMD, vanilla texture write, pack merge, unicode glyph provider).

UI features live under `apps/web/src/features/` and operate by mutating the in-memory pack, then exporting a new ZIP.

Linting:
- `apps/web/eslint.config.js` uses ESLint flat config with TypeScript + React hooks + react-refresh rules.
