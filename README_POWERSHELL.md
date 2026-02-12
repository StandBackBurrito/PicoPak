# Pico Pak

**Modern Package Manager for Raspberry Pi Pico SDK**

A lightweight, npm-style package management system specifically designed for Pico SDK projects with CMake integration.

## Features

- 📦 **Single-file packages** - Everything in one `.picopak` file
- 🎨 **Beautiful CLI** - Animated ASCII art banners
- ⚙️ **Automatic CMake** - Zero-config integration
- 🎯 **Platform detection** - Auto-configures for RP2040/RP2350
- 🚀 **Fast & simple** - Install packages in seconds
- 🔧 **Extensible** - Easy to add new commands

## Quick Start

### Install a Package

```bash
# From the picopak directory
.\picopak.bat install path\to\package.picopak

# Or add picopak to your PATH
picopak install FastLED-3.10.3-rp2040.picopak
```

### View All Commands

```bash
picopak help
```

### See Version Info

```bash
picopak version
```

## What's Included

```
picopak/
├── picopak.bat              # Windows CLI launcher
├── picopak-core.ps1         # Main command dispatcher
├── picopak-install.ps1      # Install backend
├── README.md                # This file
├── PICO_PAK_CLI.md          # CLI documentation
├── PICO_PAK_GUIDE.md        # Package format specification
└── PICO_PAK_QUICKSTART.md   # Quick start guide
```

## Installation

### Add to PATH (Recommended)

**Windows:**
```powershell
# Add picopak directory to your PATH
$env:Path += ";C:\path\to\picopak"
```

Then you can run `picopak` from anywhere.

### Direct Usage

Run from the picopak directory:
```bash
.\picopak.bat install package.picopak
```

## Usage

### Install Package to Current Project

```bash
cd my_pico_project
picopak install ..\path\to\package.picopak
```

This creates `libs/PackageName/` with all source files and CMake integration.

### Install to Specific Project

```bash
picopak install package.picopak -ProjectDir C:\my_pico_project
```

### List Package Contents

```bash
picopak install package.picopak -List
```

## After Installation

Add to your `CMakeLists.txt`:

```cmake
# After pico_sdk_init()
include(${CMAKE_SOURCE_DIR}/libs/PackageName/cmake/PackageName.cmake)

# Link to your target
target_link_libraries(your_project
    PackageName
    pico_stdlib
)
```

## Creating Packages

See [PICO_PAK_GUIDE.md](PICO_PAK_GUIDE.md) for complete instructions on creating `.picopak` packages.

### Quick Package Creation

1. Create package structure:
```
MyLibrary_package/
├── include/           # Your library files
├── cmake/
│   └── MyLibrary.cmake
├── picopak.json       # Metadata
└── README.md
```

2. Package it:
```powershell
Compress-Archive -Path MyLibrary_package\* -DestinationPath MyLibrary-1.0.0.picopak
```

## Package Format

A `.picopak` file is a ZIP archive containing:

- **include/** - All library source files and headers
- **cmake/LibraryName.cmake** - CMake integration module
- **picopak.json** - Package metadata (version, dependencies, etc.)
- **README.md** - Documentation

See the [format specification](PICO_PAK_GUIDE.md) for details.

## Supported Platforms

- Raspberry Pi Pico (RP2040)
- Raspberry Pi Pico 2 (RP2350)
- Any Pico SDK compatible board

## Example Packages

Looking for packages? Check out:

- **FastLED** - High-performance LED library with hardware PIO support
- (More packages coming soon!)

## Documentation

- [PICO_PAK_CLI.md](PICO_PAK_CLI.md) - Complete CLI reference
- [PICO_PAK_GUIDE.md](PICO_PAK_GUIDE.md) - Package format specification
- [PICO_PAK_QUICKSTART.md](PICO_PAK_QUICKSTART.md) - Quick start guide

## Architecture

```
picopak.bat (Windows launcher)
    ↓
picopak-core.ps1 (Main CLI driver)
    ↓
    ├─→ picopak-install.ps1 (Install command)
    ├─→ picopak-update.ps1 (Future: Update command)
    └─→ picopak-list.ps1 (Future: List command)
```

The modular design makes it easy to add new commands.

## Future Commands

Planned features:

- `picopak search` - Search package registry
- `picopak update` - Update installed packages
- `picopak list` - List installed packages
- `picopak uninstall` - Remove packages
- `picopak create` - Interactive package creation
- `picopak verify` - Validate package integrity

## Contributing

To add new commands:

1. Create `picopak-<command>.ps1`
2. Add case in `picopak-core.ps1` switch statement
3. Update help text in `Show-Help` function
4. Document in PICO_PAK_CLI.md

## Requirements

- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- Pico SDK 1.5.0+
- CMake 3.13+

## License

MIT License

## Links

- Project Repository: https://github.com/FastLED/FastLED
- Issues: https://github.com/FastLED/FastLED/issues
- Discussions: https://github.com/FastLED/FastLED/discussions

---

**Version:** 1.0.0  
**Created:** February 2026  
**Maintainer:** FastLED Project

Made with ❤️ for the Pico community
