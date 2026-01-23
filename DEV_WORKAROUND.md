# Development Mode Workaround

## Issue
The `npm run dev` command gets stuck during upload when using `--remote` mode.

## Solution: Use Direct Deployment for Development

Since direct deployment works perfectly, use this workflow instead:

### Quick Development Workflow

1. **Make your code changes**

2. **Deploy to test:**
   ```bash
   npm run deploy
   ```

3. **Test on your live URL:**
   ```bash
   curl https://agentic-flight-system.baktash-ansari1381.workers.dev/health
   ```

### Alternative: Use Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Navigate to Workers & Pages → agentic-flight-system
3. Use the "Quick Edit" feature for rapid testing
4. View logs in real-time

### Why Dev Mode Gets Stuck

The `wrangler dev --remote` command uploads your Worker to Cloudflare's preview environment, but the upload process can hang due to:
- Network latency
- Firewall/proxy issues
- Cloudflare API rate limiting
- System GLIBC compatibility issues

### Recommended Development Approach

**For Active Development:**
- Use direct deployment (`npm run deploy`) - it's fast and reliable
- Test on your production URL
- Use Cloudflare Dashboard for logs and debugging

**For Local Testing (if needed):**
- The GLIBC issue prevents local workerd from running
- Consider using a Docker container with updated GLIBC
- Or use a different machine/VM with newer system libraries

### Quick Commands

```bash
# Deploy changes
npm run deploy

# Test health endpoint
curl https://agentic-flight-system.baktash-ansari1381.workers.dev/health

# Test preference analysis
curl -X POST https://agentic-flight-system.baktash-ansari1381.workers.dev/preferences \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","input":"I prefer direct flights"}'

# View logs (via Cloudflare Dashboard)
# Or use: npx wrangler tail
```

### Using Wrangler Tail for Logs

Instead of dev mode, use tail to see logs in real-time:

```bash
# In one terminal, deploy
npm run deploy

# In another terminal, tail logs
npx wrangler tail
```

This gives you real-time logs without the dev mode upload issues.
