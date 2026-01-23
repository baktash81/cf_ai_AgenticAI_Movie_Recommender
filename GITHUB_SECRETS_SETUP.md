# GitHub Secrets Setup for CI/CD

## Required Secrets

To fix the Cloudflare authentication error, you need to add these secrets to your GitHub repository.

### Step 1: Get Your Cloudflare API Token

1. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Or: Dashboard → Your Profile (top right) → API Tokens

2. **Create a Custom Token:**
   - Click "Create Token"
   - Click "Get started" on "Create Custom Token"

3. **Configure Token Permissions:**
   - **Account** → **Workers Scripts** → **Edit**
   - **Account** → **D1** → **Edit**
   - **Account** → **Workers KV Storage** → **Edit**
   - **Account** → **Workers Routes** → **Edit**
   - **Account** → **Vectorize** → **Edit** (if using Vectorize)
   - **Account** → **AI** → **Edit** (if using Workers AI)

4. **Account Resources:**
   - Select "Include" → "All accounts" (or your specific account)

5. **Create Token:**
   - Click "Continue to summary"
   - Click "Create Token"
   - **IMPORTANT:** Copy the token immediately (you won't see it again!)

### Step 2: Get Your Account ID

Your Account ID is already in `wrangler.toml`:
```
account_id = "95aea7f4a15192de2ccd4a73e424294c"
```

### Step 3: Add Secrets to GitHub

1. **Go to your repository:**
   - https://github.com/baktash81/AgenticAI_Movie_Recommender

2. **Navigate to Secrets:**
   - Settings → Secrets and variables → Actions

3. **Add New Repository Secret:**
   
   **Secret 1: CLOUDFLARE_API_TOKEN**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Paste the token you copied in Step 1
   - Click "Add secret"

   **Secret 2: CLOUDFLARE_ACCOUNT_ID**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: `95aea7f4a15192de2ccd4a73e424294c`
   - Click "Add secret"

### Step 4: Verify Secrets

After adding secrets, they should appear in the list (values are hidden for security).

## Testing the Setup

1. **Push a change to trigger the workflow:**
   ```bash
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```

2. **Check the Actions tab:**
   - Go to: https://github.com/baktash81/AgenticAI_Movie_Recommender/actions
   - Click on the latest workflow run
   - Check if deployment succeeds

## Troubleshooting

### Error: "Unable to authenticate request [code: 10001]"

**Causes:**
- Token not set in GitHub Secrets
- Token doesn't have correct permissions
- Token expired or revoked

**Solutions:**
1. Verify token is in Secrets (Settings → Secrets and variables → Actions)
2. Check token has all required permissions (Workers Scripts Edit, D1 Edit, etc.)
3. Create a new token if needed

### Error: "Account ID mismatch"

**Solution:**
- Verify `CLOUDFLARE_ACCOUNT_ID` secret matches the account_id in `wrangler.toml`
- Current value should be: `95aea7f4a15192de2ccd4a73e424294c`

### Token Permissions Checklist

Make sure your token has these permissions:
- ✅ Account → Workers Scripts → Edit
- ✅ Account → D1 → Edit
- ✅ Account → Workers KV Storage → Edit
- ✅ Account → Workers Routes → Edit
- ✅ Account → Vectorize → Edit (if using)
- ✅ Account → AI → Edit (if using Workers AI)

## Security Notes

- ⚠️ **Never commit tokens to the repository**
- ✅ Tokens in GitHub Secrets are encrypted
- ✅ Only repository admins can view/edit secrets
- 🔄 Rotate tokens periodically (every 90 days recommended)

## Quick Reference

**Token Creation URL:**
https://dash.cloudflare.com/profile/api-tokens

**GitHub Secrets URL:**
https://github.com/baktash81/AgenticAI_Movie_Recommender/settings/secrets/actions

**Account ID:**
`95aea7f4a15192de2ccd4a73e424294c` (from wrangler.toml)
