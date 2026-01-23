# CI/CD Troubleshooting Guide

## Authentication Error: "Unable to authenticate request [code: 10001]"

### Check 1: Verify Secrets Are Set

1. Go to: https://github.com/baktash81/AgenticAI_Movie_Recommender/settings/secrets/actions
2. Verify these secrets exist:
   - ✅ `CLOUDFLARE_API_TOKEN`
   - ✅ `CLOUDFLARE_ACCOUNT_ID`

### Check 2: Verify Token Permissions

Your Cloudflare API token needs these permissions:
- ✅ Account → Workers Scripts → **Edit**
- ✅ Account → D1 → **Edit**
- ✅ Account → Workers KV Storage → **Edit**
- ✅ Account → Workers Routes → **Edit**
- ✅ Account → Vectorize → **Edit**
- ✅ Account → AI → **Edit**

**To check/create token:**
https://dash.cloudflare.com/profile/api-tokens

### Check 3: Verify Account ID

The `CLOUDFLARE_ACCOUNT_ID` secret should be:
```
95aea7f4a15192de2ccd4a73e424294c
```

This matches the `account_id` in `wrangler.toml`.

### Check 4: Test Token Manually

On your server, test if the token works:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="95aea7f4a15192de2ccd4a73e424294c"
npx wrangler deploy --env=""
```

If this works, the token is valid. If not, create a new token.

### Check 5: Workflow Logs

In GitHub Actions, check the workflow logs:
1. Go to Actions tab
2. Click on the failed workflow
3. Expand "Deploy Backend to Cloudflare" step
4. Look for error messages

The workflow now includes verification steps that will show if secrets are missing.

## Common Issues

### Issue: "CLOUDFLARE_API_TOKEN is not set!"

**Solution:**
- Add the secret in GitHub: Settings → Secrets → Actions
- Name must be exactly: `CLOUDFLARE_API_TOKEN`
- Value should be your Cloudflare API token (starts with something like `...`)

### Issue: Token works locally but not in CI/CD

**Possible causes:**
1. Secret name mismatch (check spelling)
2. Token doesn't have correct permissions
3. Token was revoked/expired

**Solution:**
1. Create a new token with all required permissions
2. Update the secret in GitHub
3. Re-run the workflow

### Issue: "Account ID mismatch"

**Solution:**
- Verify `CLOUDFLARE_ACCOUNT_ID` secret matches `wrangler.toml`
- Current value: `95aea7f4a15192de2ccd4a73e424294c`

## Quick Fix Checklist

- [ ] Token created at: https://dash.cloudflare.com/profile/api-tokens
- [ ] Token has all required permissions (Workers Scripts Edit, D1 Edit, etc.)
- [ ] Secret `CLOUDFLARE_API_TOKEN` added to GitHub
- [ ] Secret `CLOUDFLARE_ACCOUNT_ID` added to GitHub (value: `95aea7f4a15192de2ccd4a73e424294c`)
- [ ] Token tested manually on server
- [ ] Workflow re-run after adding secrets

## Still Not Working?

1. **Check workflow file:**
   - Make sure you're using `deploy-simple.yml` or `deploy-self-hosted.yml`
   - Verify the `env:` section includes both secrets

2. **Create a fresh token:**
   - Sometimes tokens can have issues
   - Create a new one and update the secret

3. **Check token format:**
   - Token should be a long string
   - No spaces or line breaks
   - Copy the entire token from Cloudflare

4. **Verify account access:**
   - Make sure your Cloudflare account has access to Workers
   - Check you're using the correct account ID
