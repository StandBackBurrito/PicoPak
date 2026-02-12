# Pico Pak Package System

A lightweight package management system for Raspberry Pi Pico SDK projects, inspired by npm, pip, and NuGet.

## What is a .picopak package?

A `.picopak` file is a distributable package format for Pico SDK libraries. It's essentially a ZIP archive with a standardized structure containing:

- **Source files and headers** - Ready to compile with your project
- **CMake integration module** - Automatic configuration and linking
- **Package metadata** - Version, dependencies, platform requirements
- **Documentation** - README and usage examples

## Package Structure

```
LibraryName.picopak (ZIP file with .picopak extension)
├── include/                    # All library source files and headers
├── cmake/
│   └── LibraryName.cmake      # CMake integration module
├── picopak.json               # Package metadata (JSON)
├── README.md                  # Documentation
├── CMakeLists.txt.example     # Example integration (optional)
└── install-picopak.ps1        # Self-contained installer (optional)
```

## Installation

### Method 1: Universal Installer (Recommended)

Use the universal `picopak-install.ps1` script for any `.picopak` package:

```powershell
# Install to current directory
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak

# Install to specific project
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -ProjectDir C:\my_pico_project

# List package contents without installing
.\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -List
```

### Method 2: Package-Specific Installer

Some packages include their own installer:

```powershell
# Extract the .picopak package first
Expand-Archive FastLED-3.10.3-rp2040.picopak -DestinationPath FastLED

# Run the included installer
cd my_pico_project
..\FastLED\install-picopak.ps1
```

### Method 3: Manual Installation

```powershell
# Extract package
Expand-Archive LibraryName.picolib

# Copy to your project
Copy-Item -Recurse LibraryName libs/LibraryName
```

Then add to your `CMakeLists.txt`:
```cmake
include(${CMAKE_SOURCE_DIR}/libs/LibraryName/cmake/LibraryName.cmake)
target_link_libraries(your_project LibraryName)
```

## Using Installed Libraries

After installation, integrate the library into your CMakeLists.txt:

```cmake
cmake_minimum_required(VERSION 3.13)

# Include Pico SDK
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(my_project C CXX ASM)
set(CMAKE_CXX_STANDARD 17)

# Initialize Pico SDK
pico_sdk_init()

# Include installed library
include(${CMAKE_SOURCE_DIR}/libs/FastLED/cmake/FastLED.cmake)

# Your executable
add_executable(my_project
    main.cpp
)

# Link the library
target_link_libraries(my_project
    FastLED      # The picolib library
    pico_stdlib
)

pico_add_extra_outputs(my_project)
```

## Package Metadata (picopak.json)

Every `.picopak` package includes a `picopak.json` file with metadata:

```json
{
  "name": "FastLED",
  "version": "3.10.3",
  "description": "Library for controlling addressable LED strips",
  "author": "Daniel Garcia",
  "license": "MIT",
  "homepage": "https://github.com/FastLED/FastLED",
  "platforms": ["rp2040", "rp2350"],
  "architectures": ["cortex-m0plus", "cortex-m33"],
  
  "dependencies": {
    "pico_sdk": {
      "libraries": ["pico_stdlib", "hardware_pio", "hardware_dma"]
    }
  },
  
  "package_format": "1.0",
  "package_type": "picolib"
}
```

## Creating Your Own .picopak Packages

### 1. Create Package Directory Structure

```powershell
mkdir MyLibrary_package
mkdir MyLibrary_package\include
mkdir MyLibrary_package\cmake
```

### 2. Add Your Library Files

Copy your library source files and headers to `include/`:

```
MyLibrary_package/
├── include/
│   ├── MyLibrary.h
│   ├── MyLibrary.cpp
│   └── ... (other source files)
```

### 3. Create CMake Module

Create `cmake/MyLibrary.cmake`:

```cmake
cmake_minimum_required(VERSION 3.13)

if(NOT DEFINED MYLIBRARY_DIR)
    get_filename_component(MYLIBRARY_DIR "${CMAKE_CURRENT_LIST_DIR}/.." ABSOLUTE)
endif()

# Collect source files
file(GLOB_RECURSE MYLIBRARY_SOURCES "${MYLIBRARY_DIR}/include/*.cpp")

# Create library
add_library(MyLibrary STATIC ${MYLIBRARY_SOURCES})

target_include_directories(MyLibrary PUBLIC 
    ${MYLIBRARY_DIR}/include
)

# Platform detection
if(PICO_PLATFORM STREQUAL "rp2040")
    target_compile_definitions(MyLibrary PUBLIC MYLIBRARY_RP2040=1)
elseif(PICO_PLATFORM STREQUAL "rp2350")
    target_compile_definitions(MyLibrary PUBLIC MYLIBRARY_RP2350=1)
endif()

# Link required libraries
target_link_libraries(MyLibrary PUBLIC
    pico_stdlib
    # ... add other dependencies
)

set(MYLIBRARY_FOUND TRUE CACHE BOOL "MyLibrary found")
```

### 4. Create Package Metadata

Create `picopak.json`:

```json
{
  "name": "MyLibrary",
  "version": "1.0.0",
  "description": "Description of your library",
  "author": "Your Name",
  "license": "MIT",
  "platforms": ["rp2040", "rp2350"],
  "dependencies": {
    "pico_sdk": {
      "libraries": ["pico_stdlib"]
    }
  },
  "package_format": "1.0",
  "package_type": "picolib"
}
```

### 5. Add README

Create `README.md` with usage instructions.

### 6. Package It

```powershell
Compress-Archive -Path MyLibrary_package\* -DestinationPath MyLibrary-1.0.0.picopak
```

## Available Packages

### FastLED-3.10.3-rp2040.picopak

High-performance LED control library for WS2812, APA102, and other addressable LEDs.

- **Platforms:** RP2040, RP2350
- **Features:** Hardware PIO support, parallel output, effects library
- **Size:** ~4 MB
- **Dependencies:** pico_stdlib, hardware_pio, hardware_dma, hardware_spi

## Advantages of .picopak Format

1. **Self-Contained** - Everything needed in one file
2. **Version Management** - Clear version tracking via filename and metadata
3. **Easy Distribution** - Single file to share or download
4. **Automatic Integration** - CMake modules handle all configuration
5. **Platform Detection** - Automatic RP2040/RP2350 configuration
6. **Dependency Tracking** - Explicit dependency declarations
7. **Portable** - Works across Windows, Linux, macOS

## Comparison with Other Package Managers

| Feature | Pico Pak | Git Submodules | PlatformIO | vcpkg |
|---------|----------|----------------|------------|-------|
| Single file distribution | ✅ | ❌ | ❌ | ❌ |
| Versioning | ✅ | ⚠️ | ✅ | ✅ |
| Offline install | ✅ | ❌ | ❌ | ❌ |
| Pico SDK specific | ✅ | N/A | ⚠️ | ⚠️ |
| CMake integration | ✅ | Manual | ✅ | ✅ |
| Lightweight | ✅ | ✅ | ❌ | ❌ |

## Best Practices

### For Library Authors

1. **Version in filename** - `LibraryName-X.Y.Z-platform.picopak`
2. **Include examples** - Add `CMakeLists.txt.example`
3. **Document dependencies** - List all Pico SDK requirements
4. **Test on hardware** - Verify on real RP2040/RP2350
5. **Minimize size** - Exclude unnecessary files (tests, docs, etc.)

### For Library Users

1. **Check compatibility** - Verify platform support in metadata
2. **Use libs/ directory** - Standard location for all packages
3. **Version control** - Consider committing installed packages to git
4. **Update carefully** - Test new versions before deploying

## Troubleshooting

### "CMakeLists.txt not found"
The installer warns if no CMakeLists.txt exists, but still installs to `libs/`. Create your CMakeLists.txt before building.

### "Package already exists"
The installer prompts before overwriting. Choose 'y' to update or 'n' to keep existing version.

### "Invalid package: picopak.json not found"
The .picopak file is corrupted or not a valid package. Re-download or re-create.

### CMake can't find library
Ensure the `include()` statement in CMakeLists.txt uses the correct path:
```cmake
include(${CMAKE_SOURCE_DIR}/libs/LibraryName/cmake/LibraryName.cmake)
```

## Future Enhancements

Potential improvements to the .picopak format:

- **Binary packages** - Pre-compiled `.a` libraries for faster builds
- **Multi-platform support** - Single package for RP2040, RP2350, ESP32, etc.
- **Dependency resolution** - Automatic installation of dependencies
- **Package registry** - Central repository of available packages
- **Signature verification** - Package integrity and authenticity checks

## License

The .picopak package format specification is released under MIT License and free to use for any purpose.

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Maintainer:** FastLED Project
