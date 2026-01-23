#!/bin/bash

# Test Cloudflare Authentication
# This script helps verify your Cloudflare API token works

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cloudflare Authentication Test        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}CLOUDFLARE_API_TOKEN not set in environment${NC}"
    echo -e "${YELLOW}Checking .env file...${NC}"
    
    if [ -f .env ]; then
        source .env
        if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
            echo -e "${RED}ERROR: CLOUDFLARE_API_TOKEN not found in .env${NC}"
            echo ""
            echo "Please either:"
            echo "1. Set it as environment variable: export CLOUDFLARE_API_TOKEN='your-token'"
            echo "2. Add it to .env file: CLOUDFLARE_API_TOKEN=your-token"
            exit 1
        fi
    else
        echo -e "${RED}ERROR: .env file not found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ CLOUDFLARE_API_TOKEN is set${NC}"

# Check account ID
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    if [ -f wrangler.toml ]; then
        ACCOUNT_ID=$(grep "account_id" wrangler.toml | head -1 | cut -d'"' -f2)
        if [ -n "$ACCOUNT_ID" ]; then
            export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
            echo -e "${GREEN}✓ CLOUDFLARE_ACCOUNT_ID found in wrangler.toml: $ACCOUNT_ID${NC}"
        fi
    fi
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo -e "${YELLOW}CLOUDFLARE_ACCOUNT_ID not set, but will try anyway${NC}"
fi

# Test authentication
echo ""
echo -e "${YELLOW}Testing Cloudflare authentication...${NC}"
echo ""

# Test with wrangler whoami (if available)
if command -v wrangler &> /dev/null || [ -f node_modules/.bin/wrangler ]; then
    WRANGLER_CMD="npx wrangler"
    
    echo "Running: $WRANGLER_CMD whoami"
    if $WRANGLER_CMD whoami 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Authentication successful!${NC}"
    else
        echo ""
        echo -e "${RED}✗ Authentication failed${NC}"
        echo ""
        echo "Possible issues:"
        echo "1. Token is invalid or expired"
        echo "2. Token doesn't have required permissions"
        echo "3. Account ID mismatch"
        exit 1
    fi
else
    echo -e "${YELLOW}Wrangler not found, installing...${NC}"
    npm install
    npx wrangler whoami
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Test Complete!                       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "If authentication works here, the token is valid."
echo "Make sure to add it to GitHub Secrets:"
echo "  - Name: CLOUDFLARE_API_TOKEN"
echo "  - Value: (your token)"
echo ""
