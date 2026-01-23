# Flight to Movie Recommendation System Conversion Guide

This document outlines the conversion from flight search to movie recommendation system.

## Overview

The system has been converted from searching flights to recommending movies. The architecture remains the same, but all domain-specific logic has been adapted for movies.

## Key Changes

### 1. Types
- ✅ `src/types/movie.ts` - Movie request, criteria, and result types
- ✅ `src/types/movie-preferences.ts` - Movie preference types
- ✅ `src/types/movie-agent-state.ts` - Agent state types for movies

### 2. APIs
- ✅ `src/tools/movie-apis/tmdb.ts` - TMDB API integration
- ❌ Removed: Amadeus, Skyscanner, Kiwi APIs

### 3. Database
- ✅ `migrations/0002_movie_schema.sql` - Movie database schema
- Tables: `user_movie_preferences`, `movie_searches`, `movie_results`, `user_watchlist`, `user_watch_history`

### 4. Agents
- ✅ `src/agents/MoviePreferenceAnalysisAgent.ts` - Analyzes user movie preferences
- ⏳ `src/agents/MovieRecommendationAgent.ts` - Main recommendation agent (needs creation)
- ⏳ `src/agents/MovieBookingAgent.ts` - Watchlist management (needs creation)

### 5. Workflows
- ⏳ `src/workflows/MovieSearchWorkflow.ts` - Movie search workflow (needs creation)

### 6. Configuration
- ⏳ `wrangler.toml` - Update bindings and environment variables
- ⏳ `src/index.ts` - Update endpoints

## API Endpoints (New)

- `POST /preferences` - Analyze movie preferences
- `POST /recommend` - Get movie recommendations
- `GET /recommendations/:searchId` - Get recommendation results
- `POST /watchlist` - Add to watchlist
- `GET /watchlist/:userId` - Get user watchlist

## Example Requests

### Analyze Preferences
```json
POST /preferences
{
  "userId": "user123",
  "input": "I love action movies with Tom Cruise from the 2000s, preferably rated 7.5 or higher"
}
```

### Get Recommendations
```json
POST /recommend
{
  "userId": "user123",
  "isStructured": true,
  "criteria": {
    "genres": ["Action", "Thriller"],
    "actors": ["Tom Cruise"],
    "releaseDateFrom": "2000-01-01",
    "releaseDateTo": "2009-12-31",
    "minRating": 7.5,
    "limit": 20
  }
}
```

### Natural Language Search
```json
POST /recommend
{
  "userId": "user123",
  "naturalLanguage": "movies from 2020 to 2024 with Leonardo DiCaprio in drama genre"
}
```

## TMDB API Setup

1. Get free API key from: https://www.themoviedb.org/settings/api
2. Set as secret: `npx wrangler secret put TMDB_API_KEY`
3. No credit card required for basic API access

## Next Steps

1. Complete remaining agent files
2. Complete workflow file
3. Update main index.ts with new endpoints
4. Update wrangler.toml configuration
5. Run database migration
6. Test the system

## Migration Steps

```bash
# 1. Apply movie schema migration
npx wrangler d1 migrations apply movie_data --remote

# 2. Set TMDB API key
npx wrangler secret put TMDB_API_KEY

# 3. Update Vectorize index (if needed)
# The existing index can be reused with same dimensions

# 4. Deploy
npm run deploy
```
