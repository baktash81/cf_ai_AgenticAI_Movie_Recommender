# Deployment Guide - Movie Recommendation System

## Prerequisites

1. Cloudflare account with Workers enabled
2. TMDB API key (free, from https://www.themoviedb.org/settings/api)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create D1 Database

```bash
npm run db:create
```

This will output a database ID. Update `wrangler.toml` with this ID (already done if you followed setup).

## Step 3: Run Database Migrations

```bash
npm run db:migrate
```

This applies the movie schema to your database.

## Step 4: Create Vectorize Index

The index should already be created. Verify:

```bash
npx wrangler vectorize list
```

If not created, create it:
```bash
npx wrangler vectorize create user-preferences-index \
  --dimensions=32 \
  --metric=cosine
```

## Step 5: Set Environment Variables

Set your API keys as secrets:

```bash
# TMDB API Key (required)
npx wrangler secret put TMDB_API_KEY
# Paste your API key when prompted
```

## Step 6: Deploy

```bash
npm run deploy
```

After deployment, you'll see your Worker URL:
```
Deployed movie-recommendation-system triggers
  https://movie-recommendation-system.YOUR_SUBDOMAIN.workers.dev
```

## Step 7: Verify Deployment

Test the health endpoint:
```bash
curl https://your-worker.workers.dev/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","service":"movie-recommendation"}
```

## Step 8: Test Movie Recommendations

```bash
# Test preference analysis
curl -X POST https://your-worker.workers.dev/preferences \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","input":"I love action movies with Tom Cruise"}'

# Test recommendations
curl -X POST https://your-worker.workers.dev/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "naturalLanguage": "action movies from 2020"
  }'
```

## Monitoring

- View logs: `npm run tail` or Cloudflare Dashboard
- Monitor usage: Cloudflare Dashboard → Workers & Pages
- Check database: Cloudflare Dashboard → D1

## Cost Optimization

- Results are cached for 24 hours
- Vectorize queries are optimized
- Workers AI usage is minimal (only for preference extraction)

## Troubleshooting

See [DEV_TROUBLESHOOTING.md](DEV_TROUBLESHOOTING.md) for common deployment issues.
