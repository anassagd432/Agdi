<#
.SYNOPSIS
Installs Agdi globally via npm.

.DESCRIPTION
This script checks for the presence of Node.js and npm on the system.
If they are installed, it automatically installs the agdi package globally.
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "                  ⚡ Agdi ⚡" -ForegroundColor Cyan
Write-Host "      The AI that actually does things." -ForegroundColor DarkGray
Write-Host "------------------------------------------------"

# 1. Check for Node.js
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not recognized, which is required to run Agdi."
    Write-Host "Please download Node.js (v22.14+) from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Check for npm
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not recognized."
    Write-Host "Please ensure npm is installed and added to your PATH." -ForegroundColor Yellow
    exit 1
}

# 3. Install globally
Write-Host "`nInstalling or updating Agdi globally..." -ForegroundColor White
$process = Start-Process -FilePath "npm" -ArgumentList "install", "-g", "agdi" -NoNewWindow -Wait -PassThru

if ($process.ExitCode -ne 0) {
    Write-Error "`nInstallation failed. Please try running 'npm install -g agdi' manually."
    exit $process.ExitCode
}

Write-Host "`n✅ Agdi has been installed successfully!" -ForegroundColor Green
Write-Host "Use the command " -NoNewline
Write-Host "agdi" -ForegroundColor Cyan -NoNewline
Write-Host " in your terminal to get started!`n"
