<#
Helper script to start the frontend Next.js development server.

Usage:
  PS D:\Code-Compass> .\start-frontend.ps1
#>

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\frontend"

if (-not (Test-Path node_modules)) {
    Write-Output "Installing frontend dependencies (npm install)..."
    npm install
}

if (-not $env:NEXT_PUBLIC_API_BASE_URL) {
    Write-Output "Setting NEXT_PUBLIC_API_BASE_URL to http://127.0.0.1:8000/api"
    $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000/api"
}

Write-Output "Starting Next.js dev server (npm run dev)..."
npm run dev
