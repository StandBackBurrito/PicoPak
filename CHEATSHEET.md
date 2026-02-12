# Pico Pak - Quick Reference Card

## Installation

```bash
# Install globally
npm install -g picopak

# Or use locally
npm install
npm run build
node dist/index.js <command>
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `picopak install <pkg>` | Install package | `picopak install FastLED-3.10.3-rp2040.picopak` |
| `picopak install <pkg> --list` | List contents | `picopak install FastLED-3.10.3-rp2040.picopak --list` |
| `picopak install <pkg> --project-dir <dir>` | Install to dir | `picopak install pkg.picopak --project-dir ~/myproject` |
| `picopak version` | Show version | `picopak version` |
| `picopak banner` | Show banner | `picopak banner` |
| `picopak help` | Show help | `picopak help` |

## Workflow

### Installing a Package

```bash
cd /path/to/your/pico/project
picopak install FastLED-3.10.3-rp2040.picopak
```

### Integrating in CMake

After `pico_sdk_init()`:

```cmake
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)

target_link_libraries(your_project
    FastLED
)
```

### Using in Code

```cpp
#include <FastLED.h>

#define NUM_LEDS 64
CRGB leds[NUM_LEDS];

int main() {
    FastLED.addLeds<WS2812, 0>(leds, NUM_LEDS);
    // ...
}
```

### Building

```bash
mkdir build && cd build
cmake ..
make
```

## Creating Packages

### 1. Structure

```
MyLib/
├── include/          # Source files
├── cmake/
│   └── MyLib.cmake  # CMake module
├── picopak.json     # Metadata
└── README.md        # Docs
```

### 2. picopak.json

```json
{
  "name": "MyLib",
  "version": "1.0.0",
  "description": "My library",
  "author": "Your Name",
  "license": "MIT",
  "platforms": ["rp2040", "rp2350"],
  "dependencies": ["pico_stdlib"]
}
```

### 3. CMake Module

```cmake
add_library(MyLib INTERFACE)

file(GLOB_RECURSE SOURCES "${CMAKE_CURRENT_LIST_DIR}/../include/*.cpp")

target_sources(MyLib INTERFACE ${SOURCES})
target_include_directories(MyLib INTERFACE 
    "${CMAKE_CURRENT_LIST_DIR}/../include"
)
target_link_libraries(MyLib INTERFACE pico_stdlib)
```

### 4. Package

```bash
zip -r MyLib-1.0.0-rp2040.picopak include/ cmake/ picopak.json README.md
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Test locally
node dist/index.js <command>

# Install globally for testing
npm install -g .
```

## Troubleshooting

### Package not found
```bash
# Use full path
picopak install C:/path/to/package.picopak

# Or relative path
picopak install ../packages/FastLED-3.10.3-rp2040.picopak
```

### CMakeLists.txt not found
- Warning only - installation continues
- Add CMakeLists.txt to your project later

### Permission denied
```bash
# On Unix/Linux, use sudo for global install
sudo npm install -g picopak
```

## Platform Detection

Automatically sets based on `PICO_PLATFORM`:

| Platform | CPU Freq | Target |
|----------|----------|--------|
| rp2040 | 125 MHz | Pico 1 |
| rp2350 | 150 MHz | Pico 2 |

## File Locations

After installation:

```
your-project/
├── libs/
│   └── FastLED/          # Installed here
│       ├── include/      # Source files
│       ├── cmake/        # CMake module
│       └── picopak.json  # Metadata
├── CMakeLists.txt        # Your project
└── main.cpp              # Your code
```

## Environment

Requirements:
- Node.js ≥ 14.0.0
- npm or yarn
- Pico SDK (for using packages)
- CMake (for building)

## Publishing

```bash
npm login
npm version patch|minor|major
npm publish
```

## Links

- **Docs**: See README.md
- **Guide**: See PICO_PAK_GUIDE.md
- **Quick Start**: See PICO_PAK_QUICKSTART.md
- **Migration**: See MIGRATION.md

---

**Version:** 1.0.0 • **License:** MIT • **Platform:** Node.js + TypeScript
