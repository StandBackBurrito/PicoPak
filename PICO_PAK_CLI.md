# Pico Pak CLI

**Package Manager for Raspberry Pi Pico SDK**

A modern, npm-style package manager specifically designed for Pico SDK projects with animated CLI and automatic CMake integration.

## Installation

Add `picopak.bat` (Windows) or `picopak` (Linux/Mac) to your PATH, or run it directly from the FastLED directory.

## Usage

```bash
picopak <command> [options]
```

### Commands

#### `install` - Install a .picopak package

```bash
# Install to current directory
picopak install FastLED-3.10.3-rp2040.picopak

# Install to specific project
picopak install FastLED-3.10.3-rp2040.picopak -ProjectDir C:\my_project

# List package contents without installing
picopak install FastLED-3.10.3-rp2040.picopak -List
```

#### `version` - Show version information

```bash
picopak version
```

Displays version info with animated banner showing:
- Pico Pak version
- Package format version  
- Supported platforms (RP2040, RP2350)

#### `help` - Show help message

```bash
picopak help
```

## Features

### 🎨 Animated ASCII Banner

Every command shows a beautiful animated ASCII art banner:

```
    ____  _            ____        __  
   / __ \(_)______    / __ \____ _/ /__
  / /_/ / / ___/ /_  / /_/ / __ `/ //_/
 / ____/ / /__/ __ \/ ____/ /_/ / ,<   
/_/   /_/\___/\____/_/    \__,_/_/|_|  

Package Manager for Raspberry Pi Pico SDK
  ✨ v1.0.0 ✨
```

### 📦 Simple Package Management

- Single `.picopak` file contains everything
- Automatic CMake integration
- Platform auto-detection (RP2040/RP2350)
- Version tracking built-in

### 🚀 Zero Configuration

Install a package in 3 steps:

1. `picopak install package.picopak`
2. Add one line to CMakeLists.txt
3. Build your project

## Architecture

```
picopak.bat (Windows launcher)
    ↓
picopak-core.ps1 (Main CLI driver)
    ↓
picopak-install.ps1 (Install backend)
```

The CLI is modular - new commands can be easily added by:
1. Creating a new script (e.g., `picopak-update.ps1`)
2. Adding a case in `picopak-core.ps1`
3. Documenting in help

## Examples

### Install FastLED to your project

```bash
cd my_led_project
picopak install ../FastLED-3.10.3-rp2040.picopak
```

Then add to your `CMakeLists.txt`:

```cmake
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)
target_link_libraries(my_project FastLED)
```

### Check what's in a package

```bash
picopak install FastLED-3.10.3-rp2040.picopak -List
```

Shows all files in the package without extracting.

## Creating Packages

See `PICO_PAK_GUIDE.md` for complete instructions on creating your own `.picopak` packages.

## Future Commands

Planned enhancements:

- `picopak search <keyword>` - Search package registry
- `picopak update <package>` - Update installed package
- `picopak list` - List installed packages  
- `picopak uninstall <package>` - Remove package
- `picopak create` - Create new package interactively
- `picopak verify <package>` - Validate package integrity

## Technical Details

**Language:** PowerShell 7+ (cross-platform)  
**Package Format:** ZIP with `.picopak` extension  
**Metadata:** JSON (`picopak.json`)  
**Integration:** CMake modules

## Contributing

To add new commands to Pico Pak:

1. Create `picopak-<command>.ps1` in the same directory
2. Add case in `picopak-core.ps1` switch statement
3. Update help text
4. Test on Windows and Linux

## License

MIT License - Same as FastLED

---

**Version:** 1.0.0  
**Maintainer:** FastLED Project
