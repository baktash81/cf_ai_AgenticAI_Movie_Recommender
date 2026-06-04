# MovieMind - AI-Powered Movie Recommendation System

An intelligent, agentic movie recommendation system built on Cloudflare's serverless stack. Features conversational AI, personalized recommendations, and a modern React frontend.

## Live Demo

🎬 **Try it out**: [https://movie.baktashans.com](https://movie.baktashans.com)

## Features

### Core Features
- **Conversational AI Interface** - Chat naturally to get movie recommendations
- **Smart Recommendations** - AI understands context like "sci-fi movies like Inception"
- **Personalized Results** - Learns your taste and adapts recommendations
- **Preference Management** - Set favorite genres, actors, directors, and more

### Social & Engagement
- **Watchlist** - Save movies to watch later with priorities and notes
- **Movie Feedback** - Like, love, or dislike movies to improve recommendations
- **Reviews** - Write and share movie reviews
- **Shareable Lists** - Create and share movie lists with friends

### Discovery
- **Trending Movies** - See what's popular this week
- **Curated Collections** - Seasonal and themed movie collections
- **Similar Movies** - Find movies like ones you enjoyed
- **Where to Watch** - See streaming availability

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite + TypeScript)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Chat UI    │  │  Discovery  │  │  Watchlist  │  │  User Profile   │  │
│  │  Interface  │  │    Page     │  │    Page     │  │  & Preferences  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE WORKERS (Backend)                         │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         API Router (index.ts)                       │  │
│  │   • Auth endpoints        • Chat endpoint                          │  │
│  │   • Preference endpoints  • Watchlist/Reviews/Social               │  │
│  │   • Discovery endpoints   • TMDB proxy endpoints                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│           ┌────────────────────────┼────────────────────────┐            │
│           ▼                        ▼                        ▼            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │  DURABLE OBJECT │    │  DURABLE OBJECT │    │    WORKFLOW     │      │
│  │   Preference    │    │  Recommendation │    │  MovieSearch    │      │
│  │     Agent       │    │      Agent      │    │   Workflow      │      │
│  │                 │    │                 │    │                 │      │
│  │ • Extract prefs │    │ • Parse queries │    │ • Async search  │      │
│  │ • Store profile │    │ • Manage state  │    │ • TMDB API      │      │
│  │ • LLM analysis  │    │ • Cache results │    │ • Store results │      │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                    │                                      │
│           ┌────────────────────────┼────────────────────────┐            │
│           ▼                        ▼                        ▼            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │   WORKERS AI    │    │    D1 DATABASE  │    │    VECTORIZE    │      │
│  │  (Llama 3.3)    │    │    (SQLite)     │    │  (Similarity)   │      │
│  │                 │    │                 │    │                 │      │
│  │ • Intent detect │    │ • Users/Auth    │    │ • Preference    │      │
│  │ • Pref extract  │    │ • Conversations │    │   embeddings    │      │
│  │ • NL parsing    │    │ • Watchlists    │    │ • User matching │      │
│  └─────────────────┘    │ • Reviews       │    └─────────────────┘      │
│                         │ • Taste profiles│                              │
│                         └─────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────┐
                         │    TMDB API     │
                         │  (Movie Data)   │
                         └─────────────────┘
```

## Cloudflare Services Used

| Service | Purpose | Description |
|---------|---------|-------------|
| **Workers** | Serverless Backend | Hosts the entire backend API, handles routing, authentication, and business logic |
| **Durable Objects** | Stateful Agents | Two agents manage user preferences and movie recommendations with persistent state |
| **Workflows** | Async Processing | Handles long-running movie search operations asynchronously |
| **D1** | SQL Database | Stores users, conversations, watchlists, reviews, taste profiles, and cached results |
| **Vectorize** | Vector Database | Stores user preference embeddings for similarity-based recommendations |
| **Workers AI** | LLM Integration | Uses Llama 3.3 70B for intent detection, preference extraction, and NL understanding |

## Agentic Architecture

This project uses Cloudflare's [Agents SDK](https://developers.cloudflare.com/workers/ai/agentic/) to create intelligent, stateful agents:

### MoviePreferenceAnalysisAgent
- **Purpose**: Extracts and manages user movie preferences
- **Capabilities**:
  - Analyzes natural language input to extract structured preferences
  - Generates follow-up questions for clarification
  - Stores preferences in D1 and Vectorize for similarity matching
  - Calculates confidence scores for extracted preferences

### MovieRecommendationAgent  
- **Purpose**: Handles movie recommendation requests
- **Capabilities**:
  - Parses natural language movie queries
  - Manages search state and caching
  - Triggers async search workflows
  - Tracks active searches per user

### MovieSearchWorkflow
- **Purpose**: Executes movie searches asynchronously
- **Capabilities**:
  - Queries TMDB API with structured criteria
  - Enriches results with cast, director, and metadata
  - Caches results for performance
  - Handles pagination and filtering

## Smart Preference System

The recommendation system intelligently merges user preferences with explicit requests:

| Query Type | Example | Behavior |
|------------|---------|----------|
| **Specific** | "Give me horror movies" | Uses user's request, ignores conflicting preferences |
| **Vague** | "Recommend me something" | Applies user's favorite genres, actors, rating preferences |
| **Mixed** | "Good sci-fi movies" | Uses explicit genre, applies rating preference from profile |

This ensures that when a user asks for "horror movies" but has "horror" in their disliked genres, they still get horror movies (respecting explicit intent).

## Tech Stack

### Backend
- **Runtime**: Cloudflare Workers (Edge computing)
- **Database**: Cloudflare D1 (SQLite)
- **Vector Store**: Cloudflare Vectorize
- **AI Model**: Cloudflare Workers AI (Llama 3.3 70B)
- **Framework**: Cloudflare Agents SDK
- **External API**: TMDB (The Movie Database)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/movie-recommender.git
cd movie-recommender
npm install
cd frontend && npm install && cd ..
```

### 2. Cloudflare Setup

```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create movie_data

# Create Vectorize index
npx wrangler vectorize create user-preferences-index --dimensions=32 --metric=cosine

# Set secrets
npx wrangler secret put TMDB_API_KEY    # Your TMDB API key
npx wrangler secret put JWT_SECRET      # Any secure random string
```

### 3. Update wrangler.toml

Replace the following in `wrangler.toml` with your own values:
- `account_id` - Your Cloudflare Account ID
- `database_id` - Your D1 database ID from step 2

### 4. Deploy

```bash
# Apply database migrations
npx wrangler d1 migrations apply movie_data --remote

# Deploy backend
npm run deploy

# Build frontend
cd frontend && npm run build
```

### 5. Run Locally (Development)

```bash
# Backend (in root directory)
npm run dev

# Frontend (in frontend directory)
cd frontend && npm run dev
```

## Deployment Scripts

```bash
# Deploy everything (backend + frontend)
LOCAL_DEPLOY=true ./deploy.sh all

# Deploy backend only
./deploy.sh backend

# Deploy frontend only (to local server)
LOCAL_DEPLOY=true ./deploy.sh frontend
```

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new user |
| `/auth/login` | POST | Login |
| `/auth/logout` | POST | Logout |
| `/auth/refresh` | POST | Refresh tokens |
| `/auth/me` | GET | Get current user |

### Chat & Recommendations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Send message to AI assistant |
| `/recommend` | POST | Get movie recommendations |
| `/recommendations/:id` | GET | Get search results |
| `/status/:id` | GET | Check search status |

### Personalization
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/preferences` | POST | Analyze & save preferences |
| `/preferences` | GET | Get user preferences |
| `/feedback` | POST | Submit movie feedback |
| `/taste-profile` | GET | Get taste profile summary |

### Social Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/watchlist` | GET/POST | Manage watchlist |
| `/reviews` | GET/POST | Movie reviews |
| `/shared-lists` | POST | Create shareable lists |

### Discovery
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trending` | GET | Trending movies |
| `/collections` | GET | Curated collections |
| `/similar/:movieId` | GET | Similar movies |
| `/watch-providers/:movieId` | GET | Streaming availability |

## Project Structure

```
.
├── src/                          # Backend source code
│   ├── agents/                   # Durable Object agents
│   │   ├── MoviePreferenceAnalysisAgent.ts
│   │   └── MovieRecommendationAgent.ts
│   ├── tools/                    # External API integrations
│   │   └── movie-apis/tmdb.ts    # TMDB API wrapper
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── workflows/                # Cloudflare Workflows
│   │   └── MovieSearchWorkflow.ts
│   └── index.ts                  # Main entry point & API router
│
├── frontend/                     # React frontend
│   └── src/
│       ├── components/           # React components
│       │   ├── auth/             # Login, Signup forms
│       │   ├── chat/             # Chat interface, MovieCard
│       │   ├── discovery/        # Collections, Similar movies
│       │   ├── layout/           # Navbar, Sidebar, Footer
│       │   ├── profile/          # Preference form
│       │   └── social/           # Watchlist, Reviews, Share
│       ├── context/              # React Context providers
│       ├── hooks/                # Custom React hooks
│       ├── pages/                # Page components
│       ├── services/             # API client
│       └── types/                # Frontend types
│
├── migrations/                   # D1 database migrations
├── deployment/                   # Nginx configurations
├── deploy.sh                     # Deployment script
└── wrangler.toml                 # Cloudflare Workers config
```

## Environment Variables

### Backend (Cloudflare Secrets)
```bash
TMDB_API_KEY=your_tmdb_api_key
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```bash
VITE_API_URL=https://your-worker.workers.dev
```

## Testing

**Automated suite (120 tests)** — runs against the live Cloudflare Worker API and production site:

```bash
npm test              # all tests (~2 min)
npm run test:unit     # auth utils only (fast)
npm run test:integration
npm run test:site     # frontend smoke (movie.baktashans.com)
```

Optional environment variables:

```bash
MOVIE_API_BASE_URL=https://movie-recommendation-system.baktash-ansari1381.workers.dev
MOVIE_SITE_URL=https://movie.baktashans.com
```

Manual QA checklist: [docs/COMPREHENSIVE_TEST_PLAN.md](docs/COMPREHENSIVE_TEST_PLAN.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning or building your own movie recommendation system.

---

## Author

**Baktash Ansari**

- Website: [movie.baktashans.com](https://movie.baktashans.com)
- LinkedIn: [linkedin.com/in/baktashans](https://www.linkedin.com/in/baktashans/)
- Email: [baktash.ansari1381@gmail.com](mailto:baktash.ansari1381@gmail.com)

---

Built with Cloudflare Workers, React, and TMDB API.
