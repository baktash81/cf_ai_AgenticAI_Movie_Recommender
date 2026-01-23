# MovieMind Frontend

React-based frontend for the Movie Recommendation System.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Data fetching
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Build output will be in the `dist` folder.

## Project Structure

```
src/
├── components/
│   ├── auth/           # Login, Signup, ProtectedRoute
│   ├── chat/           # ChatInterface, MovieCard, MessageBubble
│   ├── layout/         # Layout, Navbar, Sidebar
│   └── profile/        # PreferenceForm
├── context/
│   └── AuthContext.tsx # Authentication state management
├── hooks/
│   ├── useAuth.ts      # Auth hook
│   └── useMovies.ts    # Movie search, watchlist, preferences hooks
├── pages/
│   ├── ChatPage.tsx    # Main chat interface
│   ├── HomePage.tsx    # Dashboard/welcome page
│   ├── LoginPage.tsx   # Login page
│   ├── ProfilePage.tsx # Profile & preferences
│   └── SignupPage.tsx  # Registration page
├── services/
│   └── api.ts          # API client with axios
├── types/
│   └── index.ts        # TypeScript types
├── App.tsx             # Main app with routing
├── main.tsx            # Entry point
└── index.css           # Global styles with Tailwind
```

## Features

### Authentication
- JWT-based authentication
- Automatic token refresh
- Protected routes
- Persistent login state

### Profile Setup
- Natural language preference input
- AI-powered preference extraction
- Follow-up questions for better accuracy

### Chat Interface
- Conversational movie search
- Rich movie cards with posters
- Add to watchlist functionality
- Search history

## API Proxy

In development, API requests to `/api/*` are proxied to the Cloudflare Workers backend. See `vite.config.ts` for configuration.

## Environment Variables

Create a `.env` file for local development:

```env
VITE_API_URL=/api
```

For production, update the `vite.config.ts` or Nginx configuration to point to your API endpoint.

## Deployment

See the main project README and deployment scripts in the root directory.
