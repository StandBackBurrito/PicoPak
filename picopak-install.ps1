#!/usr/bin/env pwsh
# Universal Pico Pak Package Manager
# Install .picopak packages into any Pico SDK project

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$PicopakFile,
    
    [string]$ProjectDir = ".",
    [switch]$List,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host @"
Universal Pico Pak Package Manager
==================================

Install .picopak packages into your Pico SDK projects.

Usage:
    .\picopak-install.ps1 <package.picopak> [options]

Options:
    -ProjectDir <path>     Target project directory (default: current directory)
    -List                  List package contents without installing
    -Help                  Show this help message

Examples:
    # Install package to current project
    .\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak

    # Install to specific project
    .\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -ProjectDir C:\my_pico_project

    # List package contents
    .\picopak-install.ps1 FastLED-3.10.3-rp2040.picopak -List

Package Format (.picopak):
    A .picopak file is a ZIP archive containing:
    - include/                  # Library headers and source files
    - cmake/LibraryName.cmake   # CMake integration module
    - picopak.json              # Package metadata
    - README.md                 # Documentation

After Installation:
    Add to your CMakeLists.txt:
        include(\${CMAKE_SOURCE_DIR}/libs/<LibraryName>/cmake/<LibraryName>.cmake)
        target_link_libraries(your_target <LibraryName>)

"@
    exit 0
}

if ($Help) {
    Show-Help
}

# Validate picopak file
if (-not (Test-Path $PicopakFile)) {
    Write-Error "Package file not found: $PicopakFile"
    exit 1
}

$PicopakFile = Resolve-Path $PicopakFile

# Create temp directory for extraction
$TempDir = Join-Path $env:TEMP "picopak_$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
    # Extract package
    Write-Host "Extracting package..." -ForegroundColor Cyan
    Expand-Archive -Path $PicopakFile -DestinationPath $TempDir -Force
    
    # Load metadata
    $MetadataFile = Join-Path $TempDir "picopak.json"
    if (-not (Test-Path $MetadataFile)) {
        Write-Error "Invalid package: picopak.json not found"
        exit 1
    }
    
    $Metadata = Get-Content $MetadataFile -Raw | ConvertFrom-Json
    
    Write-Host "`nPackage Information:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host "Name:        $($Metadata.name)" -ForegroundColor White
    Write-Host "Version:     $($Metadata.version)" -ForegroundColor White
    Write-Host "Description: $($Metadata.description)" -ForegroundColor White
    Write-Host "License:     $($Metadata.license)" -ForegroundColor White
    Write-Host "Platforms:   $($Metadata.platforms -join ', ')" -ForegroundColor White
    
    # List mode - show contents and exit
    if ($List) {
        Write-Host "`nPackage Contents:" -ForegroundColor Cyan
        Get-ChildItem $TempDir -Recurse -File | ForEach-Object {
            $relativePath = $_.FullName.Replace($TempDir, "").TrimStart('\')
            Write-Host "  $relativePath" -ForegroundColor Gray
        }
        exit 0
    }
    
    # Resolve project directory
    $ProjectDir = Resolve-Path $ProjectDir -ErrorAction SilentlyContinue
    if (-not $ProjectDir) {
        Write-Error "Project directory does not exist: $ProjectDir"
        exit 1
    }
    
    # Check for CMakeLists.txt
    $CMakeListsPath = Join-Path $ProjectDir "CMakeLists.txt"
    if (-not (Test-Path $CMakeListsPath)) {
        Write-Warning "CMakeLists.txt not found in project directory."
        Write-Host "Continuing installation anyway...`n"
    }
    
    # Create libs directory
    $LibsDir = Join-Path $ProjectDir "libs"
    if (-not (Test-Path $LibsDir)) {
        New-Item -ItemType Directory -Path $LibsDir | Out-Null
        Write-Host "Created libs directory" -ForegroundColor Yellow
    }
    
    # Target directory
    $TargetLibDir = Join-Path $LibsDir $Metadata.name
    
    # Check if already installed
    if (Test-Path $TargetLibDir) {
        Write-Host "`n$($Metadata.name) is already installed" -ForegroundColor Yellow
        $Overwrite = Read-Host "Overwrite existing installation? [y/N]"
        if ($Overwrite -notmatch '^[Yy]') {
            Write-Host "Installation cancelled." -ForegroundColor Red
            exit 0
        }
        Remove-Item -Path $TargetLibDir -Recurse -Force
        Write-Host "Removed existing installation`n" -ForegroundColor Yellow
    }
    
    # Copy to project
    Write-Host "Installing $($Metadata.name) to: $TargetLibDir" -ForegroundColor Cyan
    Copy-Item -Path $TempDir -Destination $TargetLibDir -Recurse -Force
    
    # Verify installation
    $InstalledCMake = Get-ChildItem -Path (Join-Path $TargetLibDir "cmake") -Filter "*.cmake" -File | Select-Object -First 1
    if ($InstalledCMake) {
        Write-Host "`n✓ Installation successful!" -ForegroundColor Green
        
        # Show integration instructions
        Write-Host "`n" + "="*70 -ForegroundColor Cyan
        Write-Host "Integration Instructions" -ForegroundColor Cyan
        Write-Host "="*70 -ForegroundColor Cyan
        
        $cmakeModuleName = $InstalledCMake.BaseName
        
        Write-Host @"

Add to your CMakeLists.txt (after pico_sdk_init()):

    include(`${CMAKE_SOURCE_DIR}/libs/$($Metadata.name)/cmake/$($cmakeModuleName).cmake)

    target_link_libraries(your_project_name
        $($Metadata.name)
        # ... other libraries
    )

In your C++ code:

    #include <$($Metadata.name).h>

"@ -ForegroundColor White
        
        if ($Metadata.dependencies.pico_sdk.libraries) {
            Write-Host "Required Pico SDK libraries (auto-linked by module):" -ForegroundColor Yellow
            $Metadata.dependencies.pico_sdk.libraries | ForEach-Object {
                Write-Host "  - $_" -ForegroundColor Gray
            }
        }
        
        Write-Host "`n" + "="*70 -ForegroundColor Cyan
        Write-Host "Documentation: $($Metadata.homepage)" -ForegroundColor Gray
        Write-Host "Installed version: $($Metadata.version)" -ForegroundColor Gray
        Write-Host "`n✓ Ready to build!" -ForegroundColor Green
        
    } else {
        Write-Error "Installation verification failed"
        exit 1
    }
    
} finally {
    # Cleanup temp directory
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force
    }
}
