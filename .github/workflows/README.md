# CI/CD Workflows

## Available Workflows

### 1. `deploy-simple.yml` ⭐ Recommended
- Uses your existing `deploy-all.sh` script
- Requires self-hosted runner
- Simplest setup

### 2. `deploy-self-hosted.yml`
- Direct deployment on self-hosted runner
- No SSH needed
- Requires self-hosted runner

### 3. `deploy.yml`
- SSH-based deployment
- Works with GitHub-hosted runners
- Requires SSH key setup

## Quick Setup

1. **Choose a workflow** (recommend `deploy-simple.yml`)
2. **Rename it to `deploy.yml`** (or keep the name if you want multiple options)
3. **Set up runner** (if using self-hosted):
   ```bash
   ./setup-cicd.sh
   ```
4. **Add GitHub Secrets:**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. **Push to main** - deployment happens automatically!

## Secrets Required

### For all workflows:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (`95aea7f4a15192de2ccd4a73e424294c`)

### For SSH deployment (`deploy.yml`):
- `SERVER_HOST` - Server IP/domain
- `SERVER_USER` - SSH username
- `SERVER_SSH_KEY` - Private SSH key
- `SERVER_SSH_PORT` - SSH port (optional)

## How to Use

1. **Automatic:** Push to `main` branch
2. **Manual:** Actions tab → Select workflow → Run workflow
