# Node.js Upgrade Guide

Your current Node.js version (v16.20.2) is too old for this project. Wrangler requires Node.js v20.0.0 or higher.

## Quick Fix: Upgrade Node.js

### Option 1: Using NVM (Recommended - No sudo required)

NVM (Node Version Manager) allows you to install and manage multiple Node.js versions without sudo.

**Install NVM:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

**Reload your shell:**
```bash
source ~/.bashrc
# or
source ~/.zshrc
```

**Install Node.js v20:**
```bash
nvm install 20
nvm use 20
nvm alias default 20  # Set as default
```

**Verify:**
```bash
node -v  # Should show v20.x.x
```

### Option 2: Using System Package Manager

**On RHEL/CentOS/Fedora:**
```bash
# Enable NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs
# or for newer versions:
sudo dnf install -y nodejs
```

**On Ubuntu/Debian:**
```bash
# Enable NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs
```

### Option 3: Download from Node.js Website

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (v20.x or v22.x)
3. Install the package
4. Restart your terminal

## After Upgrading

1. **Verify Node.js version:**
   ```bash
   node -v  # Should be v20.0.0 or higher
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Run setup again:**
   ```bash
   ./setup.sh
   ```

## Why Node.js v20+?

- **Wrangler v4+** requires Node.js v20.0.0+
- **Better performance** and security
- **Modern JavaScript features** support
- **Compatibility** with latest npm packages

## Troubleshooting

### "nvm: command not found"
- Make sure you've reloaded your shell after installing NVM
- Check if NVM is in your PATH: `echo $PATH | grep nvm`
- Manually source: `source ~/.nvm/nvm.sh`

### "Permission denied" errors
- Use NVM (Option 1) - it doesn't require sudo
- Or use `sudo` with system package manager (Option 2)

### Still having issues?
- Check Node.js version: `node -v`
- Check npm version: `npm -v`
- Try clearing npm cache: `npm cache clean --force`
