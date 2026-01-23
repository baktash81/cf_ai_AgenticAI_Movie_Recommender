# Flight Search Agent System - Setup Script (PowerShell)
# This script helps set up the development environment

Write-Host "🚀 Setting up Flight Search Agent System..." -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
try {
    wrangler --version | Out-Null
} catch {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Check if user is logged in to Cloudflare
Write-Host "📋 Checking Cloudflare authentication..." -ForegroundColor Cyan
try {
    wrangler whoami | Out-Null
} catch {
    Write-Host "⚠️  Not logged in to Cloudflare. Please run: wrangler login" -ForegroundColor Yellow
    Write-Host "   This will open a browser for authentication."
    Read-Host "Press enter after logging in"
}

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file. Please update it with your API keys." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists." -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Cyan
npm install

# Create D1 database
Write-Host ""
Write-Host "🗄️  Setting up D1 database..." -ForegroundColor Cyan
$createDb = Read-Host "Do you want to create a new D1 database? (y/n)"
if ($createDb -eq "y" -or $createDb -eq "Y") {
    Write-Host "Creating D1 database..."
    $dbOutput = wrangler d1 create flight_data 2>&1 | Out-String
    Write-Host $dbOutput
    
    # Extract database ID from output
    if ($dbOutput -match 'database_id = "([^"]+)"') {
        $dbId = $matches[1]
        Write-Host ""
        Write-Host "✅ Database created! ID: $dbId" -ForegroundColor Green
        Write-Host "📝 Please update wrangler.toml with this database ID:" -ForegroundColor Yellow
        Write-Host "   database_id = `"$dbId`""
        Read-Host "Press enter to continue"
    }
} else {
    Write-Host "Skipping database creation. Make sure you have a database ID in wrangler.toml"
}

# Run migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
$runMigrations = Read-Host "Do you want to run migrations now? (y/n)"
if ($runMigrations -eq "y" -or $runMigrations -eq "Y") {
    wrangler d1 migrations apply flight_data --remote
    Write-Host "✅ Migrations applied!" -ForegroundColor Green
}

# Create Vectorize index
Write-Host ""
Write-Host "🔍 Setting up Vectorize index..." -ForegroundColor Cyan
$createIndex = Read-Host "Do you want to create Vectorize index? (y/n)"
if ($createIndex -eq "y" -or $createIndex -eq "Y") {
    wrangler vectorize create user-preferences-index --dimensions=12 --metric=cosine
    Write-Host "✅ Vectorize index created!" -ForegroundColor Green
}

# Set up secrets
Write-Host ""
Write-Host "🔐 Setting up API keys as secrets..." -ForegroundColor Cyan
Write-Host "You'll need to set these manually using: wrangler secret put <KEY_NAME>"
Write-Host ""
Write-Host "Required secrets:"
Write-Host "  - SKYSCANNER_API_KEY"
Write-Host "  - AMADEUS_CLIENT_ID"
Write-Host "  - AMADEUS_CLIENT_SECRET"
Write-Host "  - KIWI_API_KEY"
Write-Host ""
$setSecrets = Read-Host "Do you want to set secrets now? (y/n)"
if ($setSecrets -eq "y" -or $setSecrets -eq "Y") {
    Write-Host "Setting SKYSCANNER_API_KEY..."
    wrangler secret put SKYSCANNER_API_KEY
    
    Write-Host "Setting AMADEUS_CLIENT_ID..."
    wrangler secret put AMADEUS_CLIENT_ID
    
    Write-Host "Setting AMADEUS_CLIENT_SECRET..."
    wrangler secret put AMADEUS_CLIENT_SECRET
    
    Write-Host "Setting KIWI_API_KEY..."
    wrangler secret put KIWI_API_KEY
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update .env file with your API keys"
Write-Host "2. Update wrangler.toml with your D1 database ID"
Write-Host "3. Run 'npm run dev' to start development server"
Write-Host "4. Run 'npm run deploy' to deploy to Cloudflare"
Write-Host ""
