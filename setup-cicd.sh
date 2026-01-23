#!/bin/bash

# CI/CD Setup Script for Movie Recommender
# This script helps set up GitHub Actions self-hosted runner

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitHub Actions CI/CD Setup           ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}Warning: Running as root. Consider using a non-root user.${NC}"
fi

# Get repository URL
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}Repository URL is required${NC}"
    exit 1
fi

# Create actions-runner directory
RUNNER_DIR="$HOME/actions-runner"
if [ -d "$RUNNER_DIR" ]; then
    echo -e "${YELLOW}Actions runner directory already exists at $RUNNER_DIR${NC}"
    read -p "Remove and reinstall? (y/n): " REINSTALL
    if [ "$REINSTALL" = "y" ]; then
        cd "$RUNNER_DIR"
        sudo ./svc.sh stop || true
        sudo ./svc.sh uninstall || true
        cd ..
        rm -rf "$RUNNER_DIR"
    else
        echo -e "${YELLOW}Skipping runner installation${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}Installing GitHub Actions Runner...${NC}"

# Create directory
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download runner
RUNNER_VERSION="2.311.0"
echo -e "${YELLOW}Downloading runner v${RUNNER_VERSION}...${NC}"
curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
  https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Extract
echo -e "${YELLOW}Extracting runner...${NC}"
tar xzf ./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Get registration token
echo ""
echo -e "${YELLOW}To get your registration token:${NC}"
echo "1. Go to: ${REPO_URL}/settings/actions/runners/new"
echo "2. Select 'Linux' and 'x64'"
echo "3. Copy the registration token"
echo ""
read -p "Paste your registration token here: " REGISTRATION_TOKEN

if [ -z "$REGISTRATION_TOKEN" ]; then
    echo -e "${RED}Registration token is required${NC}"
    exit 1
fi

# Configure runner
echo -e "${YELLOW}Configuring runner...${NC}"
./config.sh --url "$REPO_URL" --token "$REGISTRATION_TOKEN" --name "$(hostname)-runner" --work "_work"

# Install as service
read -p "Install as a systemd service? (y/n): " INSTALL_SERVICE
if [ "$INSTALL_SERVICE" = "y" ]; then
    echo -e "${YELLOW}Installing as service...${NC}"
    sudo ./svc.sh install
    
    echo -e "${YELLOW}Starting service...${NC}"
    sudo ./svc.sh start
    
    echo -e "${GREEN}✓ Runner installed and started as service${NC}"
else
    echo -e "${YELLOW}To start the runner manually, run:${NC}"
    echo "  cd $RUNNER_DIR && ./run.sh"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!                      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo "1. Configure GitHub Secrets in your repository:"
echo "   - CLOUDFLARE_API_TOKEN"
echo "   - CLOUDFLARE_ACCOUNT_ID (from wrangler.toml: $(grep account_id wrangler.toml | cut -d'"' -f2))"
echo ""
echo "2. Choose a workflow file:"
echo "   - deploy-simple.yml (uses deploy-all.sh - recommended)"
echo "   - deploy-self-hosted.yml (direct deployment)"
echo ""
echo "3. Push to main branch to trigger deployment!"
echo ""
