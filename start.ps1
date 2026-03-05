#!/usr/bin/env pwsh
# Startup script for vCard App (Windows PowerShell)

try {
    Write-Host "=== vCard App Startup ===" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Step 1: Starting Docker Compose services..." -ForegroundColor Cyan
    docker-compose up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to start Docker Compose services" -ForegroundColor Red
        Write-Host "Make sure Docker Desktop is running!" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "Docker services started successfully!" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 2: Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        $attempt++
        $result = docker exec vcard-postgres pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL is ready!" -ForegroundColor Green
            break
        }
        Write-Host "Waiting for database... ($attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 1
    }

    if ($attempt -eq $maxAttempts) {
        Write-Host "ERROR: PostgreSQL failed to start in time" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host ""
    Write-Host "Step 3: Applying database migrations..." -ForegroundColor Cyan

    # Get the WSL path for the current directory
    $currentPath = Get-Location
    $wslPath = $currentPath.Path -replace '\\', '/' -replace 'D:', '/mnt/d'

    wsl -d Ubuntu bash -c "cd '$wslPath/app' && wasp db migrate-dev"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Migration failed or was skipped" -ForegroundColor Yellow
    } else {
        Write-Host "Migrations applied successfully!" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Step 4: Starting Wasp application in WSL..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""

    wsl -d Ubuntu bash -c "cd '$wslPath/app' && wasp start"
}
catch {
    Write-Host ""
    Write-Host "ERROR: An unexpected error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
finally {
    # This runs when you press Ctrl+C or the script ends
    Write-Host ""
    Write-Host "Tip: To stop Docker services, run: docker-compose down" -ForegroundColor Yellow
}
