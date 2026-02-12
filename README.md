# Pico Pak 🍓

**Modern Package Manager for Raspberry Pi Pico SDK**

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/picopak)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> npm for Pico • Zero Config • Lightning Fast

---

## ✨ Features

- 🎨 **Beautiful CLI** - Animated ASCII art banner with raspberry logo
- 📦 **Zero Configuration** - Automatic CMake integration
- 🚀 **Lightning Fast** - Native Node.js performance
- 🌍 **Cross-Platform** - Windows, macOS, Linux support
- 🔧 **Simple** - One command to install any library
- 🎯 **Platform-Aware** - Automatic RP2040/RP2350 detection

---

## 🚀 Quick Start

### Installation

```bash
npm install -g picopak
```

Or run locally:

```bash
npm install
npm run build
node dist/index.js version
```

### Usage

```bash
# Show awesome animated banner
picopak banner

# Install a package
picopak install FastLED-3.10.3-rp2040.picopak

# List package contents
picopak install FastLED-3.10.3-rp2040.picopak --list

# Show version
picopak version

# Get help
picopak help
```

---

## 📦 What is a .picopak Package?

A `.picopak` file is a ZIP archive containing everything needed to use a library with Pico SDK:

```
FastLED-3.10.3-rp2040.picopak
├── include/              # Library source files
├── cmake/                # CMake integration module
├── picopak.json          # Package metadata
└── README.md             # Documentation
```

### Package Metadata Example

```json
{
  "name": "FastLED",
  "version": "3.10.3",
  "description": "High-performance LED library with RP2040/RP2350 support",
  "author": "FastLED Project",
  "license": "MIT",
  "platforms": ["rp2040", "rp2350"],
  "dependencies": ["pico_stdlib", "hardware_pio", "hardware_dma"],
  "compile_definitions": {
    "rp2040": ["F_CPU=125000000"],
    "rp2350": ["F_CPU=150000000"]
  }
}
```

---

## 🛠️ Installing Packages in Your Project

### Step 1: Install the package

```bash
cd /path/to/your/pico/project
picopak install FastLED-3.10.3-rp2040.picopak
```

This will:
- ✅ Create `libs/FastLED` directory
- ✅ Extract all library files
- ✅ Set up CMake integration
- ✅ Show integration instructions

### Step 2: Update CMakeLists.txt

Add after `pico_sdk_init()`:

```cmake
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)

target_link_libraries(your_project_name
    FastLED
    # ... other libraries
)
```

### Step 3: Use in your code

```cpp
#include <FastLED.h>

#define NUM_LEDS 64
CRGB leds[NUM_LEDS];

int main() {
    FastLED.addLeds<WS2812, 0>(leds, NUM_LEDS);
    // Your code here
}
```

### Step 4: Build

```bash
mkdir build && cd build
cmake ..
make
```

Done! 🎉

---

## 🎨 Commands

### `picopak install <package>`

Install a .picopak package to your project.

**Options:**
- `--project-dir <path>` - Target project directory (default: current directory)
- `--list` - List package contents without installing

**Examples:**

```bash
# Install to current directory
picopak install FastLED-3.10.3-rp2040.picopak

# Install to specific project
picopak install FastLED-3.10.3-rp2040.picopak --project-dir ~/my-pico-project

# Preview package contents
picopak install FastLED-3.10.3-rp2040.picopak --list
```

### `picopak version`

Show version information with animated banner and platform details.

### `picopak banner`

Show the awesome animated ASCII art banner! 🍓

### `picopak help`

Show help message with examples.

---

## 📚 Documentation

- **[Quick Start Guide](PICO_PAK_QUICKSTART.md)** - Get started in 5 minutes
- **[Package Format Specification](PICO_PAK_GUIDE.md)** - Complete .picopak format docs
- **[CLI Reference](PICO_PAK_CLI.md)** - All commands and options

---

## 🔧 Development

### Build from source

```bash
# Clone repository
git clone https://github.com/FastLED/FastLED.git
cd PicoPak

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
node dist/index.js version
node dist/index.js install examples/FastLED-3.10.3-rp2040.picopak --list
```

### Watch mode

```bash
npm run dev
```

### Project Structure

```
PicoPak/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── commands/
│   │   └── install.ts        # Install command
│   └── utils/
│       └── banner.ts         # Animated banner
├── bin/
│   ├── picopak.js            # Node executable
│   └── picopak.cmd           # Windows wrapper
├── examples/
│   └── FastLED-*.picopak     # Example packages
├── dist/                     # Compiled JavaScript
├── package.json              # npm configuration
└── tsconfig.json             # TypeScript configuration
```

---

## 🌟 Creating Your Own Packages

### 1. Organize your library

```
MyLibrary/
├── include/               # Your .h and .cpp files
├── cmake/
│   └── MyLibrary.cmake   # CMake integration
├── picopak.json          # Metadata
└── README.md             # Documentation
```

### 2. Create picopak.json

```json
{
  "name": "MyLibrary",
  "version": "1.0.0",
  "description": "My awesome Pico library",
  "author": "Your Name",
  "license": "MIT",
  "platforms": ["rp2040", "rp2350"],
  "dependencies": ["pico_stdlib"]
}
```

### 3. Create CMake module

```cmake
# cmake/MyLibrary.cmake
add_library(MyLibrary INTERFACE)

file(GLOB_RECURSE MYLIBRARY_SOURCES 
    "${CMAKE_CURRENT_LIST_DIR}/../include/*.cpp"
)

target_sources(MyLibrary INTERFACE ${MYLIBRARY_SOURCES})
target_include_directories(MyLibrary INTERFACE "${CMAKE_CURRENT_LIST_DIR}/../include")
target_link_libraries(MyLibrary INTERFACE pico_stdlib)
```

### 4. Package it

```bash
# Create ZIP archive with .picopak extension
zip -r MyLibrary-1.0.0-rp2040.picopak include/ cmake/ picopak.json README.md
```

Done! Share your .picopak with the community! 🚀

---

## 🎯 Platform Support

Pico Pak automatically detects your target platform:

- **RP2040** (Raspberry Pi Pico)
  - 125 MHz CPU frequency
  - Dual-core ARM Cortex-M0+
  
- **RP2350** (Raspberry Pi Pico 2)
  - 150 MHz CPU frequency
  - Dual-core ARM Cortex-M33

Platform-specific settings are applied automatically via CMake!

---

## 📦 Tech Stack

- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Commander.js](https://github.com/tj/commander.js)** - CLI framework
- **[Chalk](https://github.com/chalk/chalk)** - Terminal colors
- **[Ora](https://github.com/sindresorhus/ora)** - Spinners & progress
- **[Gradient String](https://github.com/bokub/gradient-string)** - Gradient text
- **[Extract-zip](https://github.com/max-mapper/extract-zip)** - ZIP extraction

---

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - Same as FastLED

---

## 🔗 Links

- **FastLED Repository**: https://github.com/FastLED/FastLED
- **Issues**: https://github.com/FastLED/FastLED/issues
- **npm**: (coming soon)

---

## ❤️ Acknowledgments

- **FastLED Team** - For the amazing LED library
- **Raspberry Pi Foundation** - For the Pico SDK
- **Node.js Community** - For excellent CLI tools

---

**Made with ❤️ for the Pico community**

**Version:** 1.0.0 • **Powered by:** Node.js + TypeScript
