#!/bin/bash

# Flight Search Agent System - Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up Flight Search Agent System..."
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old!"
    echo "   Current: $(node -v)"
    echo "   Required: v18.0.0 or higher (v20+ recommended)"
    echo ""
    echo "Please upgrade Node.js using one of these methods:"
    echo "  1. Using nvm (recommended):"
    echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "     nvm install 20"
    echo "     nvm use 20"
    echo ""
    echo "  2. Download from: https://nodejs.org/"
    echo ""
    exit 1
fi

if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js v20+ is recommended for best compatibility"
    echo "   Current: $(node -v)"
    echo "   Continuing anyway..."
    echo ""
fi

# Check if wrangler is installed (globally or locally)
WRANGLER_CMD=""
if command -v wrangler &> /dev/null; then
    WRANGLER_CMD="wrangler"
    echo "✅ Found Wrangler CLI (global)"
elif [ -f "node_modules/.bin/wrangler" ]; then
    WRANGLER_CMD="npx wrangler"
    echo "✅ Found Wrangler CLI (local)"
else
    echo "📦 Wrangler CLI not found. Installing locally..."
    echo "   (Installing as dev dependency to avoid permission issues)"
    npm install --save-dev wrangler
    WRANGLER_CMD="npx wrangler"
    echo "✅ Wrangler installed locally"
fi
echo ""

# Check if user is logged in to Cloudflare
echo "📋 Checking Cloudflare authentication..."
if ! $WRANGLER_CMD whoami &> /dev/null; then
    echo "⚠️  Not logged in to Cloudflare. Please run: $WRANGLER_CMD login"
    echo "   This will open a browser for authentication."
    read -p "Press enter after logging in..."
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your API keys."
else
    echo "✅ .env file already exists."
fi

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Create D1 database
echo ""
echo "🗄️  Setting up D1 database..."
read -p "Do you want to create a new D1 database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating D1 database..."
    DB_OUTPUT=$($WRANGLER_CMD d1 create flight_data 2>&1)
    echo "$DB_OUTPUT"
    
    # Extract database ID from output
    DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")
    if [ ! -z "$DB_ID" ]; then
        echo ""
        echo "✅ Database created! ID: $DB_ID"
        echo "📝 Please update wrangler.toml with this database ID:"
        echo "   database_id = \"$DB_ID\""
        read -p "Press enter to continue..."
    fi
else
    echo "Skipping database creation. Make sure you have a database ID in wrangler.toml"
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
read -p "Do you want to run migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $WRANGLER_CMD d1 migrations apply flight_data --remote
    echo "✅ Migrations applied!"
fi

# Create Vectorize index
echo ""
echo "🔍 Setting up Vectorize index..."
read -p "Do you want to create Vectorize index? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $WRANGLER_CMD vectorize create user-preferences-index \
        --dimensions=12 \
        --metric=cosine
    echo "✅ Vectorize index created!"
fi

# Set up secrets
echo ""
echo "🔐 Setting up API keys as secrets..."
echo "You'll need to set these manually using: $WRANGLER_CMD secret put <KEY_NAME>"
echo ""
echo "Required secrets:"
echo "  - SKYSCANNER_API_KEY"
echo "  - AMADEUS_CLIENT_ID"
echo "  - AMADEUS_CLIENT_SECRET"
echo "  - KIWI_API_KEY"
echo ""
read -p "Do you want to set secrets now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting SKYSCANNER_API_KEY..."
    $WRANGLER_CMD secret put SKYSCANNER_API_KEY
    
    echo "Setting AMADEUS_CLIENT_ID..."
    $WRANGLER_CMD secret put AMADEUS_CLIENT_ID
    
    echo "Setting AMADEUS_CLIENT_SECRET..."
    $WRANGLER_CMD secret put AMADEUS_CLIENT_SECRET
    
    echo "Setting KIWI_API_KEY..."
    $WRANGLER_CMD secret put KIWI_API_KEY
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your API keys"
echo "2. Update wrangler.toml with your D1 database ID"
echo "3. Run 'npm run dev' to start development server"
echo "4. Run 'npm run deploy' to deploy to Cloudflare"
echo ""
