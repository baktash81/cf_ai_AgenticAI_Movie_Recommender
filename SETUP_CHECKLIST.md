# Movie Recommendation System - Setup Checklist

Use this checklist to verify your setup is complete.

## Prerequisites

- [ ] Node.js v20+ installed (`node -v`)
- [ ] Cloudflare account created
- [ ] Logged in to Wrangler (`npx wrangler login`)

## Cloudflare Resources

- [ ] Account ID configured in `wrangler.toml`
- [ ] D1 Database created (`movie_data`)
- [ ] Database migrations applied
- [ ] Vectorize index created (`user-preferences-index`)
- [ ] Workers AI enabled (automatic with account)

## API Keys

- [ ] TMDB API key obtained (free at https://www.themoviedb.org/settings/api)
- [ ] TMDB API key set as secret (`npx wrangler secret put TMDB_API_KEY`)

## Code Setup

- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiles without errors
- [ ] All movie-related files in place

## Testing

- [ ] Health check works: `curl https://your-worker.workers.dev/health`
- [ ] Preference analysis works: `POST /preferences`
- [ ] Movie recommendations work: `POST /recommend`

## Quick Verification Commands

```bash
# Check Node.js version
node -v

# Check Wrangler login
npx wrangler whoami

# List databases
npx wrangler d1 list

# List secrets
npx wrangler secret list

# Test deployment
npm run deploy
```

## Troubleshooting

See [DEV_TROUBLESHOOTING.md](DEV_TROUBLESHOOTING.md) for common issues.
