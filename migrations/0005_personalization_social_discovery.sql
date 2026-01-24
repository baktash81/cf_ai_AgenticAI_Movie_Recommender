-- Migration: Personalization, Social & Engagement, Content & Discovery features

-- ============================================
-- PERSONALIZATION TABLES
-- ============================================

-- Movie feedback (thumbs up/down, ratings)
CREATE TABLE IF NOT EXISTS movie_feedback (
  feedback_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('like', 'dislike', 'love', 'not_interested')),
  rating INTEGER CHECK(rating >= 1 AND rating <= 10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, movie_id)
);

-- User taste profile (computed from feedback and preferences)
CREATE TABLE IF NOT EXISTS user_taste_profiles (
  user_id TEXT PRIMARY KEY,
  genre_scores TEXT NOT NULL DEFAULT '{}', -- JSON: {"Action": 0.8, "Comedy": 0.6}
  actor_scores TEXT NOT NULL DEFAULT '{}', -- JSON: {"Tom Hanks": 0.9}
  director_scores TEXT NOT NULL DEFAULT '{}', -- JSON
  decade_scores TEXT NOT NULL DEFAULT '{}', -- JSON: {"2020s": 0.7, "1990s": 0.5}
  avg_rating_preference REAL DEFAULT 7.0,
  total_feedback_count INTEGER DEFAULT 0,
  profile_strength REAL DEFAULT 0.0, -- 0-1, how much data we have
  last_computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Watch history (movies user has seen)
CREATE TABLE IF NOT EXISTS watch_history (
  history_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  movie_data TEXT, -- JSON: cached movie details
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source TEXT, -- 'manual', 'inferred', 'imported'
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, movie_id)
);

-- ============================================
-- SOCIAL & ENGAGEMENT TABLES
-- ============================================

-- Watchlist with priority and notes
CREATE TABLE IF NOT EXISTS watchlist (
  watchlist_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  movie_data TEXT NOT NULL, -- JSON: cached movie details for offline display
  priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=must watch
  notes TEXT, -- User's personal notes
  reminder_date DATE, -- Optional reminder
  tags TEXT DEFAULT '[]', -- JSON array: ["date night", "weekend"]
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, movie_id)
);

-- Movie reviews
CREATE TABLE IF NOT EXISTS movie_reviews (
  review_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  movie_data TEXT, -- JSON: cached movie details
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
  title TEXT,
  content TEXT,
  contains_spoilers BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, movie_id)
);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_votes (
  vote_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES movie_reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(review_id, user_id)
);

-- Shared recommendation lists
CREATE TABLE IF NOT EXISTS shared_lists (
  list_id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  share_code TEXT UNIQUE NOT NULL, -- Public shareable code
  movies TEXT NOT NULL DEFAULT '[]', -- JSON array of movie objects
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Optional expiration
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- CONTENT & DISCOVERY TABLES
-- ============================================

-- Curated collections (admin-created or auto-generated)
CREATE TABLE IF NOT EXISTS curated_collections (
  collection_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  collection_type TEXT NOT NULL CHECK(collection_type IN ('curated', 'seasonal', 'trending', 'genre', 'decade', 'director', 'actor', 'franchise')),
  criteria TEXT, -- JSON: search criteria for auto-refresh
  movies TEXT NOT NULL DEFAULT '[]', -- JSON array of movie objects
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  season TEXT, -- For seasonal: 'winter', 'summer', 'halloween', 'christmas', etc.
  valid_from DATE, -- When to start showing
  valid_until DATE, -- When to stop showing
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User collection saves (which collections user has saved/favorited)
CREATE TABLE IF NOT EXISTS user_saved_collections (
  save_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES curated_collections(collection_id) ON DELETE CASCADE,
  UNIQUE(user_id, collection_id)
);

-- Franchise/series tracking
CREATE TABLE IF NOT EXISTS franchises (
  franchise_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  total_movies INTEGER DEFAULT 0,
  movies TEXT NOT NULL DEFAULT '[]', -- JSON array: [{id, title, order, releaseDate}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User franchise progress
CREATE TABLE IF NOT EXISTS user_franchise_progress (
  progress_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  franchise_id TEXT NOT NULL,
  watched_movie_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of movie IDs
  progress_percentage REAL DEFAULT 0.0,
  last_watched_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (franchise_id) REFERENCES franchises(franchise_id) ON DELETE CASCADE,
  UNIQUE(user_id, franchise_id)
);

-- Similar movies cache (for "More like this" feature)
CREATE TABLE IF NOT EXISTS similar_movies_cache (
  cache_id TEXT PRIMARY KEY,
  source_movie_id TEXT NOT NULL,
  similar_movies TEXT NOT NULL DEFAULT '[]', -- JSON array of movie objects
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Personalization indexes
CREATE INDEX IF NOT EXISTS idx_movie_feedback_user ON movie_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_feedback_movie ON movie_feedback(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_feedback_type ON movie_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at);

-- Social indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_priority ON watchlist(user_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_movie_reviews_user ON movie_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_reviews_movie ON movie_reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_reviews_public ON movie_reviews(is_public, created_at);
CREATE INDEX IF NOT EXISTS idx_shared_lists_code ON shared_lists(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_lists_public ON shared_lists(is_public, created_at);

-- Discovery indexes
CREATE INDEX IF NOT EXISTS idx_collections_type ON curated_collections(collection_type, is_active);
CREATE INDEX IF NOT EXISTS idx_collections_season ON curated_collections(season, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_collections_order ON curated_collections(display_order);
CREATE INDEX IF NOT EXISTS idx_similar_movies_source ON similar_movies_cache(source_movie_id);
CREATE INDEX IF NOT EXISTS idx_similar_movies_expires ON similar_movies_cache(expires_at);

-- ============================================
-- SEED DATA: Initial Collections
-- ============================================

-- Seasonal collections (will be auto-populated by system)
INSERT OR IGNORE INTO curated_collections (collection_id, title, description, collection_type, season, is_active, display_order) VALUES
  ('seasonal-halloween', 'Halloween Horrors', 'Spooky picks for the Halloween season', 'seasonal', 'halloween', TRUE, 1),
  ('seasonal-christmas', 'Holiday Classics', 'Festive films for the holiday season', 'seasonal', 'christmas', TRUE, 2),
  ('seasonal-summer', 'Summer Blockbusters', 'Big action movies for summer viewing', 'seasonal', 'summer', TRUE, 3),
  ('seasonal-romance', 'Valentine''s Day Romance', 'Love stories for the romantic season', 'seasonal', 'valentine', TRUE, 4);

-- Genre-based collections
INSERT OR IGNORE INTO curated_collections (collection_id, title, description, collection_type, criteria, is_active, display_order) VALUES
  ('genre-scifi-classics', 'Sci-Fi Masterpieces', 'The greatest science fiction films ever made', 'genre', '{"genres": ["Science Fiction"], "minRating": 7.5}', TRUE, 10),
  ('genre-horror-best', 'Horror Hall of Fame', 'The scariest and most acclaimed horror films', 'genre', '{"genres": ["Horror"], "minRating": 7.0}', TRUE, 11),
  ('genre-comedy-gold', 'Comedy Gold', 'Guaranteed laughs from comedy classics', 'genre', '{"genres": ["Comedy"], "minRating": 7.0}', TRUE, 12);

-- Decade collections
INSERT OR IGNORE INTO curated_collections (collection_id, title, description, collection_type, criteria, is_active, display_order) VALUES
  ('decade-80s', 'Best of the 80s', 'Iconic films from the 1980s', 'decade', '{"releaseDateFrom": "1980", "releaseDateTo": "1989", "minRating": 7.0}', TRUE, 20),
  ('decade-90s', 'Best of the 90s', 'Memorable movies from the 1990s', 'decade', '{"releaseDateFrom": "1990", "releaseDateTo": "1999", "minRating": 7.0}', TRUE, 21),
  ('decade-2000s', 'Best of the 2000s', 'Top films from the new millennium', 'decade', '{"releaseDateFrom": "2000", "releaseDateTo": "2009", "minRating": 7.0}', TRUE, 22),
  ('decade-2010s', 'Best of the 2010s', 'Acclaimed films from the 2010s', 'decade', '{"releaseDateFrom": "2010", "releaseDateTo": "2019", "minRating": 7.0}', TRUE, 23),
  ('decade-2020s', 'Best of the 2020s', 'Top-rated recent releases', 'decade', '{"releaseDateFrom": "2020", "minRating": 7.0}', TRUE, 24);
