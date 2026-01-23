# Development Troubleshooting

## GLIBC Version Issue

If you see this error:
```
/lib64/libc.so.6: version `GLIBC_2.35' not found
```

This means your system's GLIBC is too old for the local workerd binary. Here are solutions:

### Solution 1: Use Remote Development (Recommended)

Use remote mode which doesn't require local workerd:

```bash
npm run dev
```

This uses `--remote` flag which runs your Worker on Cloudflare's infrastructure instead of locally.

### Solution 2: Deploy Directly

Skip local development and deploy directly:

```bash
npm run deploy
```

Then test on your deployed URL.

### Solution 3: Update System GLIBC (Advanced)

**Warning**: This requires system-level changes and may break other software.

For RHEL/CentOS 9:
```bash
# Check current GLIBC version
ldd --version

# Update system (requires root)
sudo yum update glibc
```

**Note**: This is not recommended unless you have full system control.

## Node.js Compatibility

The `nodejs_compat` flag has been added to `wrangler.toml`. This enables Node.js built-in modules like `node:os`.

## Vectorize Local Development

Vectorize is not supported in local development mode. Use remote mode:

```bash
npm run dev  # Uses --remote flag
```

## Recommended Development Workflow

1. **For quick testing**: Use remote dev mode
   ```bash
   npm run dev
   ```

2. **For production**: Deploy directly
   ```bash
   npm run deploy
   ```

3. **For local testing**: Use a newer system or Docker container with updated GLIBC

## Alternative: Use Cloudflare Dashboard

You can also test your Worker directly in the Cloudflare Dashboard after deployment, which avoids all local development issues.
