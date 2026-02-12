# PicoPak Library Submission Guide

This document defines the **submission format, requirements, and
integration rules** for adding third-party libraries into PicoPak.

The goal of PicoPak is to provide an **Arduino-like ecosystem** while
staying fully compatible with the **pico-sdk C/C++ workflow**.

Contributors may submit libraries as:

-   Header files (.h)
-   Precompiled static libraries (.a)
-   Optional source code
-   Integration instructions

To keep PicoPak stable and secure, all submissions must follow the
structure and rules below.

------------------------------------------------------------------------

# Core Design Philosophy

PicoPak is not a full SDK replacement. The pico-sdk already exists in
user projects, so PicoPak focuses on:

-   Reusable drivers
-   Middleware
-   UI stacks
-   RF libraries
-   Storage and filesystem components
-   Graphics and LED systems

The submission process must:

-   Prevent ABI/toolchain breakage
-   Provide consistent installation steps
-   Maintain traceability and licensing

------------------------------------------------------------------------

# Required Submission Structure

Each library must be provided as a zip archive with the following
layout:

`<libname>`{=html}/ picopak.yaml include/ lib/ rp2040/
gcc-`<version>`{=html}/ lib`<name>`{=html}.a rp2350/
gcc-`<version>`{=html}/ lib`<name>`{=html}.a src/ (optional but strongly
encouraged) examples/ (optional) LICENSE README.md SHA256SUMS

------------------------------------------------------------------------

# picopak.yaml Manifest

Every submission must include a manifest file named:

picopak.yaml

This allows PicoPak tooling to automatically integrate libraries without
manual CMake edits.

Required fields:

name: version: description: license: supported_chips: language:
pico_sdk_version: toolchain: link_libraries: include_dirs: defines:

Optional but recommended:

requires_spi: requires_i2c: requires_dma: requires_pio: notes:

------------------------------------------------------------------------

# ABI & Toolchain Requirements

Binary compatibility is critical.

Submissions MUST specify:

-   Pico SDK version used to build
-   GCC version
-   Optimization flags
-   Float ABI if applicable
-   Exception/Rtti usage for C++

Without this information, binaries may fail to link or behave
incorrectly.

------------------------------------------------------------------------

# Security & Trust Policy

Because PicoPak accepts precompiled binaries, contributors must include:

-   LICENSE file
-   Author attribution
-   Original source repository (if available)
-   SHA256 hashes for all binaries

Submissions without licensing or provenance will be rejected.

------------------------------------------------------------------------

# Integration Model

Libraries must NOT require manual editing of multiple build files.

PicoPak will provide a wrapper layer that handles:

-   Include paths
-   Static library linking
-   Required pico-sdk dependencies

All integration instructions must assume a single call pattern:

picopak_add(`<library_name>`{=html})

The manifest drives how this function behaves.

------------------------------------------------------------------------

# Required Files

Every submission must include:

-   Headers under include/
-   Static libraries under lib/`<chip>`{=html}/gcc-`<ver>`{=html}/
-   picopak.yaml
-   LICENSE
-   SHA256SUMS
-   README.md

README.md must contain:

-   Description of the library
-   Supported peripherals (SPI/I2C/PIO/etc)
-   Minimal usage example

------------------------------------------------------------------------

# Strongly Encouraged Files

To improve long-term maintainability:

-   Source code under src/
-   A minimal example project
-   Pin wiring table (especially for RF or display drivers)

------------------------------------------------------------------------

# Prohibited Submissions

The following will be rejected:

-   Binary-only libraries without licensing
-   Unknown origin binaries
-   Libraries requiring modification of core pico-sdk files
-   Instructions that conflict with PicoPak's integration wrapper

------------------------------------------------------------------------

# Validation Expectations

Submissions may be automatically validated by PicoPak tooling.

Checks may include:

-   Folder structure validation
-   Manifest completeness
-   SHA256 hash verification
-   Test link against rp2040 and rp2350 targets

Libraries that fail a basic link test may be rejected.

------------------------------------------------------------------------

# Binary Submission Tiers

To keep the ecosystem healthy, PicoPak recognizes two submission types:

## Tier A (Preferred)

-   Source code included
-   Precompiled binaries optional

## Tier B (Allowed)

-   Headers + binaries only
-   Requires stricter metadata
-   May be flagged as "binary-only" in PicoPak index

------------------------------------------------------------------------

# Special Requirements for RF Libraries (Example: CC1101)

Radio drivers often depend heavily on SPI timing and configuration.

RF library submissions should include:

requires_spi: true spi_modes_supported: max_spi_hz_tested:

README should include:

-   Wiring diagram
-   Required GPIO pins
-   Tested frequency ranges if applicable

------------------------------------------------------------------------

# Contributor Workflow

1.  Package library following folder structure
2.  Create SHA256SUMS file
3.  Fill out picopak.yaml completely
4.  Zip the library folder
5.  Submit through PicoPak contribution process

------------------------------------------------------------------------

# Goals of PicoPak

PicoPak aims to provide:

-   Arduino-like ease of use
-   Pure pico-sdk compatibility
-   Reusable, modular libraries
-   Safe and predictable integration

Consistency is more important than flexibility.

Thank you for helping build a better ecosystem for RP2040 and RP2350
development.
