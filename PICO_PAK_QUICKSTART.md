# FastLED Pico Pak Package - Quick Start

## What You Have

You now have a complete `.picopak` package system for Pico SDK projects, including:

1. **FastLED-3.10.3-rp2040.picopak** - The packaged library (4.03 MB)
2. **picopak-install.ps1** - Universal installer for any .picopak package
3. **PICO_PAK_GUIDE.md** - Complete documentation on the .picopak format

## Installation in 3 Steps

### Step 1: Copy files to your Pico project

```powershell
# Copy the package and installer to your project directory
Copy-Item FastLED-3.10.3-rp2040.picopak C:\path\to\your\pico_project\
Copy-Item picopak-install.ps1 C:\path\to\your\pico_project\
```

### Step 2: Install the package

```powershell
cd C:\path\to\your\pico_project
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak
```

This creates: `libs/FastLED/` with all headers, source files, and CMake integration.

### Step 3: Update your CMakeLists.txt

Add these lines to your project's `CMakeLists.txt`:

```cmake
# After pico_sdk_init()
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)

# In target_link_libraries()
target_link_libraries(your_project_name
    FastLED
    pico_stdlib
    # ... other libraries
)
```

## Example Project

**main.cpp:**
```cpp
#include "pico/stdlib.h"
#include <FastLED.h>

#define NUM_LEDS 60
#define DATA_PIN 16  // Any GPIO pin

CRGB leds[NUM_LEDS];

int main() {
    stdio_init_all();
    
    // Initialize FastLED
    FastLED.addLeds<WS2812, DATA_PIN, GRB>(leds, NUM_LEDS);
    FastLED.setBrightness(50);
    
    while (1) {
        // Rainbow effect
        static uint8_t hue = 0;
        for(int i = 0; i < NUM_LEDS; i++) {
            leds[i] = CHSV(hue + (i * 255 / NUM_LEDS), 255, 255);
        }
        FastLED.show();
        hue++;
        sleep_ms(20);
    }
    
    return 0;
}
```

**Complete CMakeLists.txt:**
```cmake
cmake_minimum_required(VERSION 3.13)

# Include Pico SDK
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(led_project C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Initialize Pico SDK
pico_sdk_init()

# Include FastLED from installed picolib
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)

# Your executable
add_executable(led_project
    main.cpp
)

# Link libraries
target_link_libraries(led_project
    FastLED         # FastLED (includes PIO, DMA, SPI automatically)
    pico_stdlib     # Pico standard library
)

# USB serial output
pico_enable_stdio_usb(led_project 1)
pico_enable_stdio_uart(led_project 0)

# Create UF2 file
pico_add_extra_outputs(led_project)
```

## Build and Flash

```powershell
mkdir build
cd build
cmake ..
make

# Copy build/led_project.uf2 to your Pico in bootloader mode
```

## Package Contents Verified

✅ All 1,798 files included
✅ FastLED.h header present
✅ CMake integration module
✅ Package metadata
✅ Documentation

## Supported Features

- **RP2040** (Pico 1): 125 MHz, 30 GPIO pins
- **RP2350** (Pico 2): 150 MHz, 48 GPIO pins
- **Hardware PIO** drivers for precise timing
- **All LED types**: WS2812, WS2811, SK6812, APA102, and more
- **Any GPIO pin** can be used for LED control

## Advanced Usage

### List package contents
```powershell
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -List
```

### Install to specific project
```powershell
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -ProjectDir C:\another_project
```

### Help
```powershell
.\picopak-install.ps1 -Help
```

## Creating Your Own Packages

See `PICO_PAK_GUIDE.md` for complete instructions on creating your own `.picopak` packages for distribution.

The format is designed to be:
- **Simple** - Just a ZIP with standardized structure
- **Portable** - Works on Windows, Linux, macOS
- **Self-contained** - Everything needed in one file
- **Version-tracked** - Clear versioning in filename and metadata

## Files Created

```
FastLED/
├── FastLED-3.10.3-rp2040.picopak    # The package (distribute this)
├── picopak-install.ps1              # Universal installer (distribute this)
├── PICO_PAK_GUIDE.md                # Format documentation
├── BUILD_RP2040_RP2350.md           # Build guide (reference)
└── fastled_picopak_package/         # Source (for package creation)
    ├── include/                      # All FastLED sources
    ├── cmake/FastLED.cmake          # CMake module
    ├── picopak.json                 # Metadata
    ├── README.md                    # Package docs
    ├── CMakeLists.txt.example       # Example integration
    └── install-picopak.ps1          # Package-specific installer
```

## Distribution

To share FastLED with others, they only need:
1. **FastLED-3.10.3-rp2040.picopak** (4.03 MB)
2. **picopak-install.ps1** (6.5 KB)

Or extract the package once and share the `install-picopak.ps1` from inside.

## Troubleshooting

**"CMakeLists.txt not found"**
- The installer works anyway. Create CMakeLists.txt before building.

**Build errors about undefined references**
- Make sure you added `FastLED` to `target_link_libraries()`

**Wrong LED timings**
- FastLED.cmake automatically sets F_CPU based on platform detection

## Next Steps

1. Copy the .picolib file to your project
2. Run the installer
3. Update CMakeLists.txt
4. Build your project
5. Flash to your Pico
6. Enjoy your LEDs!

---

**Questions?** See PICO_PAK_GUIDE.md for complete documentation.
