# CI/CD Setup Guide

This repository includes GitHub Actions workflows for automatic deployment.

## Workflow Options

### Option 1: SSH Deployment (Recommended for most cases)
Uses `deploy.yml` - Deploys via SSH to your server.

### Option 2: Self-Hosted Runner (Best for direct server access)
Uses `deploy-self-hosted.yml` - Runs directly on your server.

## Setup Instructions

### For SSH Deployment (`deploy.yml`)

1. **Configure GitHub Secrets:**
   Go to your repository → Settings → Secrets and variables → Actions → New repository secret

   Add these secrets:
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token (with Workers edit permissions)
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID (from wrangler.toml)
   - `SERVER_HOST` - Your server IP or domain (e.g., `baktashans.com`)
   - `SERVER_USER` - SSH username (e.g., `root`)
   - `SERVER_SSH_KEY` - Your private SSH key (the entire key, including `-----BEGIN` and `-----END`)
   - `SERVER_SSH_PORT` - SSH port (optional, defaults to 22)

2. **Generate SSH Key (if needed):**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
   # Copy the public key to your server
   ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server
   # Add the private key to GitHub Secrets as SERVER_SSH_KEY
   ```

3. **Configure Sudo Access (for nginx reload):**
   On your server, allow passwordless sudo for nginx:
   ```bash
   sudo visudo
   # Add this line (replace USERNAME with your SSH user):
   USERNAME ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
   ```

### For Self-Hosted Runner (`deploy-self-hosted.yml`)

1. **Install GitHub Actions Runner on your server:**
   ```bash
   # Create a folder
   mkdir actions-runner && cd actions-runner
   
   # Download the latest runner package
   curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
   
   # Extract the installer
   tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
   
   # Configure the runner
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN
   # Get token from: Repo → Settings → Actions → Runners → New self-hosted runner
   
   # Install and start the service
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

2. **Configure GitHub Secrets:**
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID

3. **Update the workflow file:**
   - Rename `deploy-self-hosted.yml` to `deploy.yml` (or delete the SSH version)

## How It Works

1. **On push to `main` branch:**
   - Checks out the code
   - Sets up Node.js 20
   - Deploys backend to Cloudflare Workers
   - Builds the frontend
   - Deploys frontend to your server
   - Reloads nginx

2. **Manual trigger:**
   - Go to Actions tab → Select workflow → Run workflow

## Troubleshooting

### SSH Connection Issues
- Verify SSH key is correct in GitHub Secrets
- Test SSH connection manually: `ssh -i key user@host`
- Check server firewall allows SSH

### Permission Issues
- Ensure user has sudo access for nginx reload
- Check `/var/www/movie.baktashans.com/` permissions

### Cloudflare Deployment Issues
- Verify API token has correct permissions
- Check Account ID matches wrangler.toml
- Ensure wrangler is authenticated: `npx wrangler login`

### Frontend Build Issues
- Check Node.js version (should be 20+)
- Verify all dependencies are in package.json
- Check build logs in Actions tab

## Security Notes

- Never commit secrets to the repository
- Use GitHub Secrets for all sensitive data
- Rotate API tokens regularly
- Limit SSH key permissions
- Use dedicated deployment user (not root if possible)
