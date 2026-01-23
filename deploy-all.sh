#!/bin/bash

# Movie Recommendation System - Full Deployment Script
# This script deploys both backend (Cloudflare Workers) and frontend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/root/movie_recommender/AgenticAI_Movie_Recommender"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
WEB_DIR="/var/www/movie.baktashans.com"
NGINX_CONF="/etc/nginx/sites-available/movie.baktashans.com"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Movie Recommendation System Deploy   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse arguments
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
RUN_MIGRATIONS=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            DEPLOY_FRONTEND=false
            shift
            ;;
        --frontend-only)
            DEPLOY_BACKEND=false
            shift
            ;;
        --with-migrations)
            RUN_MIGRATIONS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: ./deploy-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  --backend-only     Deploy only the backend (Cloudflare Workers)"
            echo "  --frontend-only    Deploy only the frontend"
            echo "  --with-migrations  Run database migrations before deploying"
            echo "  --skip-build       Skip frontend build (use existing dist)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Load environment variables
if [ -f "${PROJECT_DIR}/.env" ]; then
    source "${PROJECT_DIR}/.env"
fi

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 20+${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Node.js version must be 18 or higher. Current: $(node -v)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"
}

# Deploy backend to Cloudflare Workers
deploy_backend() {
    echo ""
    echo -e "${BLUE}Deploying Backend to Cloudflare Workers...${NC}"
    echo "----------------------------------------"
    
    cd "${PROJECT_DIR}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install
    fi
    
    # Run migrations if requested
    if [ "$RUN_MIGRATIONS" = true ]; then
        echo -e "${YELLOW}Running database migrations...${NC}"
        npx wrangler d1 migrations apply movie_data --remote
        echo -e "${GREEN}✓ Migrations applied${NC}"
    fi
    
    # Deploy to Cloudflare
    echo -e "${YELLOW}Deploying to Cloudflare Workers...${NC}"
    # Use API token if available (for CI/CD), otherwise use login
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        echo -e "${BLUE}Using Cloudflare API token for authentication...${NC}"
        export CLOUDFLARE_API_TOKEN
        export CLOUDFLARE_ACCOUNT_ID
        # Verify wrangler can see the token
        if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
            echo -e "${RED}ERROR: CLOUDFLARE_API_TOKEN is empty!${NC}"
            exit 1
        fi
        npx wrangler deploy --env=""
    else
        echo -e "${YELLOW}No API token found, using wrangler login...${NC}"
        npx wrangler deploy --env=""
    fi
    
    echo -e "${GREEN}✓ Backend deployed successfully${NC}"
}

# Build and deploy frontend
deploy_frontend() {
    echo ""
    echo -e "${BLUE}Deploying Frontend...${NC}"
    echo "----------------------------------------"
    
    cd "${FRONTEND_DIR}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi
    
    # Build frontend
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "${YELLOW}Building frontend...${NC}"
        npm run build
        echo -e "${GREEN}✓ Frontend built${NC}"
    else
        echo -e "${YELLOW}Skipping build (using existing dist)${NC}"
    fi
    
    # Check if dist exists
    if [ ! -d "dist" ]; then
        echo -e "${RED}Error: dist directory not found. Run without --skip-build${NC}"
        exit 1
    fi
    
    # Create web directory if it doesn't exist
    if [ ! -d "${WEB_DIR}" ]; then
        echo -e "${YELLOW}Creating web directory...${NC}"
        sudo mkdir -p "${WEB_DIR}"
    fi
    
    # Copy files to web directory
    echo -e "${YELLOW}Copying files to ${WEB_DIR}...${NC}"
    sudo rm -rf "${WEB_DIR}"/*
    sudo cp -r dist/* "${WEB_DIR}/"
    sudo chown -R www-data:www-data "${WEB_DIR}"
    
    echo -e "${GREEN}✓ Files copied to web directory${NC}"
    
    # Test nginx config and reload
    echo -e "${YELLOW}Testing nginx configuration...${NC}"
    if sudo nginx -t; then
        echo -e "${YELLOW}Reloading nginx...${NC}"
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    else
        echo -e "${RED}Nginx configuration test failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
}

# Main execution
main() {
    check_requirements
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        deploy_backend
    fi
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        deploy_frontend
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Complete!                  ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        echo -e "Backend:  ${BLUE}https://movie-recommendation-system.baktash-ansari1381.workers.dev${NC}"
    fi
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        echo -e "Frontend: ${BLUE}https://movie.baktashans.com${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Test the API:${NC}"
    echo "  curl https://movie.baktashans.com/api/health"
    echo ""
}

# Run main
main
