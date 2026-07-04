<#
Helper script to create a virtualenv, install backend dependencies (preferring binary wheels),
and run the FastAPI backend with uvicorn.

Usage: run from project root (optional)
  PS D:\Code-Compass> .\start-backend.ps1
#>

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\backend"

if (-not (Test-Path .venv)) {
    Write-Output "Creating virtual environment (.venv)..."
    try {
        py -3.12 -m venv .venv
    } catch {
        Write-Output "py -3.12 failed, falling back to system 'python' to create venv"
        python -m venv .venv
    }
}

Write-Output "Activating virtual environment..."
. .\.venv\Scripts\Activate.ps1

Write-Output "Upgrading packaging tools..."
python -m pip install --upgrade pip setuptools wheel

Write-Output "Installing backend dependencies (using --prefer-binary to prefer wheels)..."
pip install --prefer-binary -r requirements.txt

Write-Output "Starting backend: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
