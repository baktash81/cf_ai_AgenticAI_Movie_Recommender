#!/bin/bash

# Git Authentication Setup Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Git Authentication Setup              ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if SSH key exists
SSH_KEY="$HOME/.ssh/id_ed25519"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t ed25519 -C "git@github.com" -f "$SSH_KEY" -N ""
    echo -e "${GREEN}✓ SSH key generated${NC}"
else
    echo -e "${GREEN}✓ SSH key already exists${NC}"
fi

# Display public key
echo ""
echo -e "${YELLOW}Your public SSH key:${NC}"
echo "----------------------------------------"
cat "${SSH_KEY}.pub"
echo "----------------------------------------"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the public key above"
echo "2. Go to: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Paste the key and save"
echo ""
read -p "Press Enter after you've added the key to GitHub..."

# Test SSH connection
echo ""
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${GREEN}✓ SSH connection successful!${NC}"
    
    # Change remote to SSH
    echo ""
    echo -e "${YELLOW}Changing remote URL to SSH...${NC}"
    cd /root/movie_recommender/AgenticAI_Movie_Recommender
    git remote set-url origin git@github.com:baktash81/AgenticAI_Movie_Recommender.git
    echo -e "${GREEN}✓ Remote URL updated${NC}"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Setup Complete!                      ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "You can now push with: git push origin main"
else
    echo -e "${RED}SSH connection failed. Please check your key.${NC}"
    exit 1
fi
