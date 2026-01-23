# Movie Recommendation System Setup

## Quick Start

### 1. Get TMDB API Key (Free)

1. Go to: **https://www.themoviedb.org/**
2. Create a free account (no credit card required)
3. Go to: **Settings → API**
4. Request an API key (automatic approval for basic access)
5. Copy your API key

### 2. Set API Key

```bash
npx wrangler secret put TMDB_API_KEY
# Paste your API key when prompted
```

### 3. Database Migration

The database has been created. Apply the migration:

```bash
npx wrangler d1 migrations apply movie_data --remote
```

### 4. Deploy

```bash
npm run deploy
```

## API Endpoints

### Analyze Movie Preferences

```bash
POST /preferences
{
  "userId": "user123",
  "input": "I love action movies with Tom Cruise from the 2000s, preferably rated 7.5 or higher"
}
```

### Get Movie Recommendations (Structured)

```bash
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

### Get Movie Recommendations (Natural Language)

```bash
POST /recommend
{
  "userId": "user123",
  "naturalLanguage": "movies from 2020 to 2024 with Leonardo DiCaprio in drama genre"
}
```

### Get Recommendation Results

```bash
GET /recommendations/{searchId}?userId=user123
```

### Get Search Status

```bash
GET /status/{searchId}?userId=user123
```

### Add to Watchlist

```bash
POST /watchlist
{
  "userId": "user123",
  "movieId": "550",
  "priority": 1
}
```

### Get Watchlist

```bash
GET /watchlist/{userId}
```

## Example Queries

### By Date Range
```json
{
  "criteria": {
    "releaseDateFrom": "2020-01-01",
    "releaseDateTo": "2024-12-31"
  }
}
```

### By Genre
```json
{
  "criteria": {
    "genres": ["Action", "Sci-Fi"]
  }
}
```

### By Actor
```json
{
  "criteria": {
    "actors": ["Tom Hanks", "Leonardo DiCaprio"]
  }
}
```

### By Director
```json
{
  "criteria": {
    "directors": ["Christopher Nolan", "Quentin Tarantino"]
  }
}
```

### Combined
```json
{
  "criteria": {
    "genres": ["Drama"],
    "actors": ["Tom Hanks"],
    "releaseDateFrom": "2010",
    "minRating": 8.0,
    "limit": 10
  }
}
```

## TMDB API Features

- **Free tier**: Unlimited requests (with rate limits)
- **No credit card required**
- **Comprehensive data**: Movies, TV shows, actors, directors, genres
- **Images**: Posters and backdrops included
- **Metadata**: Ratings, popularity, cast, crew, etc.

## System Architecture

- **Agents**: Durable Objects for stateful recommendation orchestration
- **Workflows**: Durable execution for movie searches
- **Database**: D1 for persistent storage (preferences, watchlist, history)
- **Vectorize**: Similarity matching for user preferences
- **Workers AI**: Natural language processing for preference extraction

## Personalization Features

- Genre preferences (favorite and disliked)
- Actor and director preferences
- Rating thresholds
- Era preferences (decades, years)
- Content filters (adult content, language)
- Recommendation style (diverse, similar, trending, classic)
