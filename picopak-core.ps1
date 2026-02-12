#!/usr/bin/env pwsh
# Pico Pak - Package Manager for Raspberry Pi Pico SDK
# Main CLI driver script

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Capture all remaining arguments dynamically
$Script:AllArgs = $args
$ErrorActionPreference = "Stop"
$Script:PicopakVersion = "1.0.0"
$Script:ScriptDir = $PSScriptRoot

# ASCII Art Banner with Animation
function Show-Banner {
    param([switch]$Animated)
    
    # Better raspberry ASCII art
    $raspberry = @"
      .~~.   .~~.
     '. \ ' ' / .'
      .~ .~~~..~.
     : .~.'~'.~. :
    ~ (   ) (   ) ~
   ( : '~'.~.'~' : )
    ~ .~ (   ) ~. ~
     (  : '~' :  ) 
      '~ .~~~. ~'
          '~'
"@

    # Clean ASCII banner (no special Unicode)
    $banner = @"
 ____  _           ____       _    
|  _ \(_) ___ ___ |  _ \ __ _| | __
| |_) | |/ __/ _ \| |_) / _`` | |/ /
|  __/| | (_| (_) |  __/ (_| |   < 
|_|   |_|\___\___/|_|   \__,_|_|\_\
"@

    $subtitle = "Package Manager for Raspberry Pi Pico SDK"
    $tagline = "npm for Pico * Zero Config * Lightning Fast"
    
    if ($Animated) {
        # Animated reveal
        Clear-Host
        
        # Animated raspberry with growing effect
        $raspLines = $raspberry -split "`n"
        foreach ($line in $raspLines) {
            Write-Host $line -ForegroundColor Red
            Start-Sleep -Milliseconds 50
        }
        
        Write-Host ""
        Start-Sleep -Milliseconds 150
        
        # Main banner with wave effect
        $lines = $banner -split "`n"
        $colors = @('Magenta', 'DarkMagenta', 'Blue', 'DarkCyan', 'Cyan')
        
        for ($i = 0; $i -lt $lines.Length; $i++) {
            $line = $lines[$i]
            $color = $colors[$i % $colors.Length]
            
            # Character-by-character reveal
            foreach ($char in $line.ToCharArray()) {
                Write-Host $char -NoNewline -ForegroundColor $color
                Start-Sleep -Milliseconds 2
            }
            Write-Host ""
        }
        
        Write-Host ""
        Start-Sleep -Milliseconds 200
        
        # Typewriter effect for subtitle
        foreach ($char in $subtitle.ToCharArray()) {
            Write-Host $char -NoNewline -ForegroundColor Gray
            Start-Sleep -Milliseconds 12
        }
        Write-Host ""
        
        # Tagline
        Start-Sleep -Milliseconds 150
        Write-Host "  $tagline" -ForegroundColor DarkYellow
        
        # Version
        Start-Sleep -Milliseconds 100
        Write-Host ""
        Write-Host "  >> " -NoNewline -ForegroundColor Yellow
        Write-Host "v$Script:PicopakVersion" -NoNewline -ForegroundColor Cyan
        Write-Host " <<" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host ""
        Start-Sleep -Milliseconds 300
        
        # Separator line
        Write-Host ("-" * 70) -ForegroundColor DarkGray
        Write-Host ""
        
    } else {
        # Static banner
        Write-Host $raspberry -ForegroundColor Red
        Write-Host ""
        Write-Host $banner -ForegroundColor Cyan
        Write-Host ""
        Write-Host $subtitle -ForegroundColor Gray
        Write-Host "  $tagline" -ForegroundColor DarkYellow
        Write-Host "  v$Script:PicopakVersion" -ForegroundColor Cyan
        Write-Host ""
        Write-Host ("-" * 70) -ForegroundColor DarkGray
        Write-Host ""
    }
}

function Show-Help {
    Show-Banner
    
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  picopak <command> [options]`n" -ForegroundColor White
    
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  install <package>      Install a .picopak package" -ForegroundColor White
    Write-Host "                         Options: -ProjectDir <path>" -ForegroundColor DarkGray
    Write-Host "                                  -List (show contents)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  help                   Show this help message" -ForegroundColor White
    Write-Host "  version                Show version information" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  # Install package to current directory" -ForegroundColor DarkGray
    Write-Host "  picopak install FastLED-3.10.3-rp2040.picopak`n" -ForegroundColor White
    
    Write-Host "  # Install to specific project" -ForegroundColor DarkGray
    Write-Host "  picopak install FastLED-3.10.3-rp2040.picopak -ProjectDir C:\my_project`n" -ForegroundColor White
    
    Write-Host "  # List package contents" -ForegroundColor DarkGray
    Write-Host "  picopak install FastLED-3.10.3-rp2040.picopak -List`n" -ForegroundColor White
    
    Write-Host "Documentation:" -ForegroundColor Cyan
    Write-Host "  Quick Start: PICO_PAK_QUICKSTART.md" -ForegroundColor Gray
    Write-Host "  Full Guide:  PICO_PAK_GUIDE.md" -ForegroundColor Gray
    Write-Host ""
}

function Show-Version {
    Show-Banner -Animated
    
    Write-Host "Package Format:" -ForegroundColor Cyan
    Write-Host "  .picopak v1.0" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Supported Platforms:" -ForegroundColor Cyan
    Write-Host "  * Raspberry Pi Pico (RP2040)" -ForegroundColor White
    Write-Host "  * Raspberry Pi Pico 2 (RP2350)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Repository:" -ForegroundColor Cyan
    Write-Host "  https://github.com/FastLED/FastLED" -ForegroundColor Gray
    Write-Host ""
}

function Invoke-Install {
    # Show animated banner for install
    Show-Banner -Animated
    
    if ($Script:AllArgs.Length -eq 0) {
        Write-Host "❌ Error: Package file required" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage: picopak install <package.picopak> [options]" -ForegroundColor Yellow
        Write-Host "Example: picopak install FastLED-3.10.3-rp2040.picopak" -ForegroundColor Gray
        exit 1
    }
    
    # Call the install script
    $installScript = Join-Path $Script:ScriptDir "picopak-install.ps1"
    
    if (-not (Test-Path $installScript)) {
        Write-Host "❌ Error: Install script not found: $installScript" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🚀 Launching installer...`n" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 500
    
    # Execute install script with all arguments passed through
    & $installScript @Script:AllArgs
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "install" {
        Invoke-Install
    }
    
    "version" {
        Show-Version
    }
    
    "help" {
        Show-Help
    }
    
    default {
        Show-Banner -Animated
        Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Write-Host "Run 'picopak help' for usage information" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}
