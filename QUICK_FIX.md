# Quick Fix for Setup Issues

## Issue: Node.js Version Too Old

**Error:** `Unsupported engine: required: { node: '>=20.0.0' }, current: { node: 'v16.20.2' }`

### Solution: Upgrade Node.js

**Fastest method (using NVM - no sudo needed):**

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install and use Node.js v20
nvm install 20
nvm use 20

# Verify
node -v  # Should show v20.x.x
```

**Then reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Run setup again:**
```bash
./setup.sh
```

## Issue: Permission Denied When Installing Wrangler

**Error:** `EACCES: permission denied, mkdir '/usr/local/lib/node_modules'`

### Solution: Use Local Installation (No sudo needed)

The setup script now installs Wrangler locally. If you still have issues:

```bash
# Install Wrangler as a dev dependency (already in package.json)
npm install

# Use npx to run wrangler commands
npx wrangler --version
```

All npm scripts in `package.json` now use `npx wrangler` automatically.

## Issue: Wrangler Not Found

**Error:** `wrangler: command not found`

### Solution:

```bash
# Install locally (no sudo needed)
npm install

# Use npx
npx wrangler --version

# Or add to PATH (optional)
export PATH="./node_modules/.bin:$PATH"
```

## Still Having Issues?

1. **Check Node.js version:**
   ```bash
   node -v  # Must be v20.0.0 or higher
   ```

2. **Check npm version:**
   ```bash
   npm -v
   ```

3. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

4. **Reinstall everything:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **See detailed guide:** [NODE_UPGRADE.md](NODE_UPGRADE.md)
