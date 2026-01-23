# CI/CD Setup Guide

This guide will help you set up automatic deployment using GitHub Actions.

## Quick Start (Recommended)

### Option 1: Self-Hosted Runner (Easiest)

1. **Run the setup script on your server:**
   ```bash
   cd /root/movie_recommender/AgenticAI_Movie_Recommender
   ./setup-cicd.sh
   ```

2. **Configure GitHub Secrets:**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions → New repository secret
   - Add these secrets:
     - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID` - `95aea7f4a15192de2ccd4a73e424294c` (from wrangler.toml)

3. **Use the simple workflow:**
   - The workflow file `deploy-simple.yml` uses your existing `deploy-all.sh` script
   - Rename it to `deploy.yml` or it will run automatically

4. **Push to main:**
   ```bash
   git add .
   git commit -m "Setup CI/CD"
   git push origin main
   ```

### Option 2: SSH Deployment

If you prefer not to install a runner on your server:

1. **Generate SSH key for GitHub Actions:**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
   ```

2. **Add public key to server:**
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@your-server-ip
   ```

3. **Configure GitHub Secrets:**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `SERVER_HOST` - Your server IP or domain
   - `SERVER_USER` - SSH username (usually `root`)
   - `SERVER_SSH_KEY` - Contents of `~/.ssh/github_actions_deploy` (private key)
   - `SERVER_SSH_PORT` - SSH port (optional, default 22)

4. **Configure sudo access for nginx:**
   ```bash
   sudo visudo
   # Add this line (replace USERNAME):
   USERNAME ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
   ```

5. **Use `deploy.yml` workflow** (already configured for SSH)

## Workflow Files

- **`deploy-simple.yml`** - Uses your existing `deploy-all.sh` script (recommended)
- **`deploy-self-hosted.yml`** - Direct deployment on self-hosted runner
- **`deploy.yml`** - SSH-based deployment (for GitHub-hosted runners)

## Manual Deployment

You can still deploy manually using:
```bash
./deploy-all.sh
```

Or trigger the workflow manually:
- Go to Actions tab → Select workflow → Run workflow

## Troubleshooting

### Runner not connecting
- Check runner status: `sudo systemctl status actions.runner.*`
- View logs: `cd ~/actions-runner/_diag && cat Runner_*.log`
- Restart: `sudo ./svc.sh restart` (in runner directory)

### Deployment fails
- Check Actions tab for error logs
- Verify secrets are set correctly
- Test deployment manually: `./deploy-all.sh`

### Permission errors
- Ensure runner user has access to project directory
- Check nginx reload permissions
- Verify `/var/www/movie.baktashans.com/` permissions

## Security Best Practices

1. **Use dedicated deployment user** (not root if possible)
2. **Limit SSH key permissions** (use specific key for CI/CD)
3. **Rotate tokens regularly**
4. **Never commit secrets** to repository
5. **Use environment-specific secrets** if you have multiple environments

## What Gets Deployed

- **Backend:** Cloudflare Workers (via `wrangler deploy`)
- **Frontend:** Built and copied to `/var/www/movie.baktashans.com/`
- **Nginx:** Automatically reloaded after frontend deployment

## Testing

After setup, test the deployment:
1. Make a small change (e.g., update README)
2. Commit and push to main
3. Check Actions tab to see deployment progress
4. Verify site is updated at https://movie.baktashans.com
