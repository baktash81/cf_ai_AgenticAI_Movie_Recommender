# MovieMind - AI-Powered Movie Recommendation System

A full-stack movie recommendation system with a conversational AI interface, built on the Cloudflare stack.

## Features

- **Chat-based Interface** - Ask for movies in natural language
- **AI-Powered Recommendations** - Uses Cloudflare Workers AI for intelligent suggestions
- **Personalized Results** - Learns your preferences for better recommendations
- **User Authentication** - Secure JWT-based auth with refresh tokens
- **Watchlist** - Save movies to watch later
- **Rich Movie Data** - Posters, ratings, cast, and more via TMDB API

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  - Login/Signup        - Chat Interface                      │
│  - Profile Setup       - Movie Cards                         │
│  - Watchlist           - Preferences Form                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Cloudflare Workers)                │
│  - Auth Routes         - Movie Recommendation Agent          │
│  - Preference Agent    - Search Workflow                     │
│  - D1 Database         - Vectorize (similarity)              │
│  - Workers AI          - TMDB API Integration                │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **Cloudflare Workers** - Serverless compute
- **Cloudflare D1** - SQLite database
- **Cloudflare Vectorize** - Vector similarity search
- **Cloudflare Workers AI** - LLM for NLP tasks
- **Cloudflare Agents SDK** - Durable Object agents
- **TMDB API** - Movie data source

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- TMDB API key (free at https://www.themoviedb.org/settings/api)

### Backend Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Cloudflare:**
   ```bash
   # Login to Cloudflare
   npx wrangler login
   
   # Create D1 database (if not exists)
   npx wrangler d1 create movie_data
   
   # Create Vectorize index (if not exists)
   npx wrangler vectorize create user-preferences-index --dimensions=32 --metric=cosine
   ```

3. **Set secrets:**
   ```bash
   npx wrangler secret put TMDB_API_KEY
   npx wrangler secret put JWT_SECRET
   ```

4. **Apply migrations:**
   ```bash
   npx wrangler d1 migrations apply movie_data --remote
   ```

5. **Deploy:**
   ```bash
   npm run deploy
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Deployment

### Using Deploy Scripts

```bash
# Deploy everything
./deploy.sh all

# Deploy backend only
./deploy.sh backend

# Deploy frontend only
./deploy.sh frontend

# Initial server setup
REMOTE_HOST=your-server.com REMOTE_USER=user ./deploy.sh setup
```

### Manual Deployment

1. **Backend (Cloudflare Workers):**
   ```bash
   npm run deploy
   ```

2. **Frontend (your server):**
   ```bash
   cd frontend && npm run build
   # Copy dist/ to your server
   # Configure Nginx using deployment/nginx.conf
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
| `/auth/profile` | PUT | Update profile |

### Movies
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recommend` | POST | Get recommendations |
| `/recommendations/:id` | GET | Get search results |
| `/status/:id` | GET | Check search status |
| `/chat` | POST | Chat with AI |

### Preferences
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/preferences` | POST | Analyze preferences |
| `/preferences` | GET | Get user preferences |

### Watchlist
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/watchlist` | GET | Get watchlist |
| `/watchlist` | POST | Add to watchlist |
| `/watchlist/:id` | DELETE | Remove from watchlist |

## Project Structure

```
.
├── src/                    # Backend source
│   ├── agents/             # Durable Object agents
│   ├── tools/              # API integrations (TMDB)
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities (auth, cache, etc.)
│   ├── workflows/          # Cloudflare Workflows
│   └── index.ts            # Main entry point
├── frontend/               # React frontend
│   └── src/
│       ├── components/     # React components
│       ├── context/        # Context providers
│       ├── hooks/          # Custom hooks
│       ├── pages/          # Page components
│       └── services/       # API client
├── migrations/             # D1 database migrations
├── deployment/             # Nginx configs
├── deploy.sh               # Deployment script
└── wrangler.toml           # Cloudflare config
```

## License

MIT
