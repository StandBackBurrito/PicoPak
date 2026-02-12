# Copilot Instructions for PicoPak

## Build and run commands

- Install dependencies: `npm install`
- Compile TypeScript: `npm run build`
- Watch mode during development: `npm run dev`
- Run CLI from compiled output: `node dist/index.js <command>`
- Local smoke checks used as the current test workflow:
  - Full smoke pass: `node dist/index.js version && node dist/index.js install examples/FastLED-3.10.3-rp2040.picopak --list`
  - Single-command check: `node dist/index.js version`

## High-level architecture

- PicoPak is a Node.js/TypeScript CLI that installs `.picopak` packages into Pico SDK projects.
- Entrypoint: `src/index.ts`
  - Defines commands via Commander (`install`, `version`, `banner`)
  - Applies splash behavior before command execution
- Install pipeline: `src/commands/install.ts`
  - Validates package path and extension
  - Extracts archive to a temp directory
  - Reads `picopak.json` metadata
  - Installs to `<project>/libs/<PackageName>`
  - Verifies `<package>/cmake/<Name>.cmake` and prints CMake integration instructions
- Splash system: `src/utils/banner.ts`
  - Left-aligned static splash and optional animated splash (`--banner`)
  - Animation uses in-place ANSI cursor control and environment gates (`CI`, `NO_COLOR`, `TERM=dumb`, `PICO_PAK_REDUCED_MOTION`, `PICO_PAK_DEBUG_BANNER`)
- Runtime wrappers:
  - `bin/picopak.js` loads `dist/index.js`
  - `bin/picopak.cmd` provides Windows command shim

## Repository-specific conventions

- Package format conventions (`PICO_PAK_GUIDE.md`):
  - `.picopak` is a ZIP archive containing `include/`, `cmake/<Library>.cmake`, and `picopak.json`
  - Installed libraries are expected under `libs/<LibraryName>/`
- Installer behavior conventions:
  - `install` overwrites existing library folder when already installed
  - Missing `CMakeLists.txt` is warning-only; install still proceeds
- CLI conventions:
  - Keep command surface in `src/index.ts` and implementation in `src/commands/*`
  - Keep splash rendering logic centralized in `src/utils/banner.ts`
- Cross-platform line endings are managed with `.gitattributes` (`* text=auto` with binary exceptions); do not hardcode per-file EOL assumptions.
