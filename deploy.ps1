# Movie Recommendation System - Deployment Script (Windows PowerShell)
# Usage: .\deploy.ps1 [frontend|backend|all|build]

param(
    [Parameter(Position=0)]
    [ValidateSet('frontend', 'backend', 'all', 'build', 'help')]
    [string]$Command = 'all'
)

$ErrorActionPreference = "Stop"

# Configuration
$CloudflareWorkerUrl = "https://movie-recommendation-system.baktash-ansari1381.workers.dev"

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Err($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Deploy-Backend {
    Write-Info "Deploying backend to Cloudflare Workers..."
    
    # Apply database migrations
    Write-Info "Applying database migrations..."
    npx wrangler d1 migrations apply movie_data --remote
    
    # Deploy the worker
    Write-Info "Deploying worker..."
    npx wrangler deploy --env=""
    
    # Test health endpoint
    Write-Info "Testing backend health..."
    try {
        $response = Invoke-RestMethod -Uri "$CloudflareWorkerUrl/health" -Method Get
        if ($response.status -eq "ok") {
            Write-Info "Backend deployed successfully!"
        }
    } catch {
        Write-Warn "Backend deployed but health check failed. Please verify manually."
    }
}

function Build-Frontend {
    Write-Info "Building frontend..."
    
    Push-Location frontend
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing frontend dependencies..."
        npm install
    }
    
    # Build
    npm run build
    
    Pop-Location
    
    Write-Info "Frontend build complete!"
}

function Deploy-Frontend {
    Write-Info "Building frontend for deployment..."
    Build-Frontend
    
    Write-Info "Frontend built successfully!"
    Write-Info "To deploy to your server:"
    Write-Info "  1. Copy the 'frontend/dist' folder to your server"
    Write-Info "  2. Configure Nginx using the config in 'deployment/nginx.conf'"
    Write-Info "  3. Reload Nginx: sudo systemctl reload nginx"
}

function Show-Help {
    Write-Host @"
Movie Recommendation System - Deployment Script

Usage: .\deploy.ps1 [command]

Commands:
  backend    Deploy backend to Cloudflare Workers
  frontend   Build frontend (and show deployment instructions)
  build      Build frontend only
  all        Deploy backend and build frontend
  help       Show this help message

"@
}

# Main
switch ($Command) {
    'backend' {
        Deploy-Backend
    }
    'frontend' {
        Deploy-Frontend
    }
    'build' {
        Build-Frontend
    }
    'all' {
        Deploy-Backend
        Deploy-Frontend
    }
    'help' {
        Show-Help
    }
}
