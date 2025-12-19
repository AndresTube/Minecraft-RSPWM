# Minecraft Resource Pack Web Manager
A browser-only web UI to build and manage Minecraft resource packs.

Goals
- Create custom model data (CMD) mappings for specific items.
- Replace vanilla textures.
- Merge multiple packs into one.
- Map images to private-use Unicode characters (bitmap font providers).

Important constraint (pure web)
- The app cannot write directly to folders on your machine.
- Workflow is: import pack ZIP(s) -> edit in the browser -> download a new ZIP.

Prerequisites
- Node.js (recommended: 18+)

Run
- `npm --prefix apps/web ci`
- `npm --prefix apps/web run dev`
- Open http://localhost:5173

Usage (ZIP in / ZIP out)
- You can import an existing pack ZIP, or start from an empty pack.
- Choose a Minecraft version (sets `pack_format` in `pack.mcmeta`).
- Download the edited ZIP and copy it into your Minecraft `resourcepacks/` folder.

Build / lint
- Build: `npm --prefix apps/web run build`
- Lint: `npm --prefix apps/web run lint`
