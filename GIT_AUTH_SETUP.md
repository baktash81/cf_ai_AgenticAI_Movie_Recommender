# Git Authentication Setup

You're getting authentication errors because Git needs credentials to push to GitHub.

## Quick Fix Options

### Option 1: Use SSH (Recommended) ⭐

**Run the setup script:**
```bash
./setup-git-auth.sh
```

This will:
1. Generate an SSH key (if needed)
2. Show you the public key to add to GitHub
3. Test the connection
4. Switch your remote to SSH

**Manual SSH Setup:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "git@github.com" -f ~/.ssh/id_ed25519

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/keys
# Then change remote:
git remote set-url origin git@github.com:baktash81/AgenticAI_Movie_Recommender.git
```

### Option 2: Use Personal Access Token (HTTPS)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "Movie Recommender Deploy"
   - Select scopes: `repo` (full control of private repositories)
   - Generate and copy the token

2. **Configure Git to use token:**
   ```bash
   git config --global credential.helper store
   ```

3. **Push (will prompt for credentials):**
   ```bash
   git push origin main
   # Username: baktash81
   # Password: <paste your token here>
   ```

4. **Or use token in URL (one-time):**
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/baktash81/AgenticAI_Movie_Recommender.git
   ```

### Option 3: Use GitHub CLI

```bash
# Install GitHub CLI (if not installed)
# Ubuntu/Debian:
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate
gh auth login

# Then push normally
git push origin main
```

## Verify Setup

After setup, test with:
```bash
git push origin main
```

## Troubleshooting

### SSH: Permission denied
- Check key is added to GitHub: https://github.com/settings/keys
- Test connection: `ssh -T git@github.com`
- Verify key permissions: `chmod 600 ~/.ssh/id_ed25519`

### HTTPS: Still asking for password
- Make sure you're using the token, not your GitHub password
- Check credential helper: `git config --global credential.helper`
- Clear stored credentials: `git credential-cache exit`

### Token expired
- Generate a new token at https://github.com/settings/tokens
- Update your credentials

## Recommended: SSH

SSH is recommended because:
- ✅ More secure
- ✅ No token expiration
- ✅ Works with CI/CD easily
- ✅ One-time setup
