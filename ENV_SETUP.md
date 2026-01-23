# Environment Setup Guide

This guide will help you set up your development environment for the Movie Recommendation System.

## Quick Start

### Option 1: Automated Setup (Recommended)

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

### Option 2: Manual Setup

Follow the steps below to set up your environment manually.

## Step 1: Install Prerequisites

1. **Node.js** (v20 or higher recommended)
   ```bash
   node --version
   ```

2. **Wrangler CLI** (installed as dev dependency)
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

## Step 2: Create Environment File

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in your values (optional for local dev, secrets are set via wrangler):
- D1 Database ID (from Step 3)
- Vectorize Index Name
- TMDB API Key
- Cloudflare Account ID

## Step 3: Create D1 Database

```bash
npx wrangler d1 create movie_data
```

Copy the `database_id` from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
database_name = "movie_data"
database_id = "YOUR_DATABASE_ID_HERE"
binding = "MOVIE_DB"
```

## Step 4: Run Database Migrations

```bash
npx wrangler d1 migrations apply movie_data --remote
```

## Step 5: Create Vectorize Index

```bash
npx wrangler vectorize create user-preferences-index \
  --dimensions=32 \
  --metric=cosine
```

The index name should match what's in `wrangler.toml`.

## Step 6: Get TMDB API Key

1. Go to: **https://www.themoviedb.org/**
2. Create a free account (no credit card required)
3. Navigate to: **Settings → API**
4. Request an API key (automatic approval)
5. Copy your API key

## Step 7: Set Secrets

Set your API keys as secrets (they won't be stored in `.env`):

```bash
# TMDB API Key
npx wrangler secret put TMDB_API_KEY
# Paste your API key when prompted
```

## Step 8: Verify Setup

```bash
# Check authentication
npx wrangler whoami

# List databases
npx wrangler d1 list

# List Vectorize indexes
npx wrangler vectorize list

# List secrets (names only)
npx wrangler secret list
```

## Step 9: Deploy

```bash
npm run deploy
```

## Troubleshooting

### Database Issues
- Ensure database ID in `wrangler.toml` matches the created database
- Run migrations: `npx wrangler d1 migrations apply movie_data --remote`

### API Key Issues
- Verify TMDB API key is correct
- Check secret is set: `npx wrangler secret list`

### Vectorize Issues
- Ensure index dimensions match (32 for movie preferences)
- Verify index name in `wrangler.toml`

## Next Steps

See [MOVIE_SETUP.md](MOVIE_SETUP.md) for API usage examples and [README.md](README.md) for system overview.
