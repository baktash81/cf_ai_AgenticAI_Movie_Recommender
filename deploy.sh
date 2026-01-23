#!/bin/bash

# Movie Recommendation System - Deployment Script
# Usage: ./deploy.sh [frontend|backend|all]

set -e

# Configuration
REMOTE_USER="${REMOTE_USER:-user}"
REMOTE_HOST="${REMOTE_HOST:-your-server.com}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/movie-recommendation}"
CLOUDFLARE_WORKER_URL="https://movie-recommendation-system.baktash-ansari1381.workers.dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Deploy backend (Cloudflare Workers)
deploy_backend() {
    log_info "Deploying backend to Cloudflare Workers..."
    
    # Check if wrangler is available
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js and npm."
        exit 1
    fi

    # Apply database migrations
    log_info "Applying database migrations..."
    npx wrangler d1 migrations apply movie_data --remote
    
    # Deploy the worker
    log_info "Deploying worker..."
    npx wrangler deploy --env=""
    
    # Test health endpoint
    log_info "Testing backend health..."
    if curl -s "$CLOUDFLARE_WORKER_URL/health" | grep -q "ok"; then
        log_info "Backend deployed successfully!"
    else
        log_warn "Backend deployed but health check failed. Please verify manually."
    fi
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build
    npm run build
    
    cd ..
    
    log_info "Frontend build complete!"
}

# Deploy frontend to server
deploy_frontend() {
    log_info "Deploying frontend to $REMOTE_HOST..."
    
    # Check if remote host is configured
    if [ "$REMOTE_HOST" = "your-server.com" ]; then
        log_error "Please configure REMOTE_HOST environment variable"
        log_info "Example: REMOTE_HOST=server.example.com ./deploy.sh frontend"
        exit 1
    fi
    
    # Build frontend first
    build_frontend
    
    # Create remote directory if it doesn't exist
    ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"
    
    # Sync build files
    log_info "Syncing files to server..."
    rsync -avz --delete frontend/dist/ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
    
    # Reload nginx
    log_info "Reloading Nginx..."
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo systemctl reload nginx"
    
    log_info "Frontend deployed successfully!"
}

# Setup server (first time only)
setup_server() {
    log_info "Setting up server..."
    
    if [ "$REMOTE_HOST" = "your-server.com" ]; then
        log_error "Please configure REMOTE_HOST environment variable"
        exit 1
    fi
    
    # Install nginx if not present
    ssh "$REMOTE_USER@$REMOTE_HOST" "command -v nginx || sudo apt-get update && sudo apt-get install -y nginx"
    
    # Create web directory
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_PATH && sudo chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_PATH"
    
    # Copy nginx config
    log_info "Copying Nginx configuration..."
    scp deployment/nginx.conf "$REMOTE_USER@$REMOTE_HOST:/tmp/movie-recommendation.conf"
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo mv /tmp/movie-recommendation.conf /etc/nginx/sites-available/movie-recommendation"
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo ln -sf /etc/nginx/sites-available/movie-recommendation /etc/nginx/sites-enabled/"
    
    # Test and reload nginx
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo nginx -t && sudo systemctl reload nginx"
    
    log_info "Server setup complete!"
    log_warn "Don't forget to:"
    log_warn "  1. Update domain name in /etc/nginx/sites-available/movie-recommendation"
    log_warn "  2. Set up SSL with: sudo certbot --nginx -d your-domain.com"
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  backend    Deploy backend to Cloudflare Workers"
    echo "  frontend   Build and deploy frontend to server"
    echo "  build      Build frontend only (no deploy)"
    echo "  all        Deploy both backend and frontend"
    echo "  setup      Initial server setup (Nginx, directories)"
    echo ""
    echo "Environment variables:"
    echo "  REMOTE_USER  SSH user for server (default: user)"
    echo "  REMOTE_HOST  Server hostname (default: your-server.com)"
    echo "  REMOTE_PATH  Deployment path (default: /var/www/movie-recommendation)"
}

# Main
case "${1:-all}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    build)
        build_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    setup)
        setup_server
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
