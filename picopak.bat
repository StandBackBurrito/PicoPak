@echo off
REM Pico Pak - Package Manager for Raspberry Pi Pico SDK
REM Windows batch wrapper

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Call the PowerShell script with all arguments passed through
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%picopak-core.ps1" %*
