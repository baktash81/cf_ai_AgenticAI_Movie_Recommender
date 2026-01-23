-- Movie recommendation system schema

-- User movie preferences table
CREATE TABLE IF NOT EXISTS user_movie_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movie searches table
CREATE TABLE IF NOT EXISTS movie_searches (
  search_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  criteria TEXT NOT NULL, -- JSON string
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES user_movie_preferences(user_id)
);

-- Movie results cache table
CREATE TABLE IF NOT EXISTS movie_results (
  result_id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL,
  movie_data TEXT NOT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (search_id) REFERENCES movie_searches(search_id)
);

-- User watchlist table
CREATE TABLE IF NOT EXISTS user_watchlist (
  watchlist_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  priority INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES user_movie_preferences(user_id)
);

-- User watch history table
CREATE TABLE IF NOT EXISTS user_watch_history (
  history_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rating REAL, -- 0-10
  review TEXT,
  FOREIGN KEY (user_id) REFERENCES user_movie_preferences(user_id)
);

-- Movie preference analysis history
CREATE TABLE IF NOT EXISTS movie_preference_analysis (
  analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  extracted_preferences TEXT, -- JSON string
  confidence_score REAL,
  clarification_questions TEXT, -- JSON string array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_movie_preferences(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movie_searches_user_id ON movie_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_searches_status ON movie_searches(status);
CREATE INDEX IF NOT EXISTS idx_movie_results_search_id ON movie_results(search_id);
CREATE INDEX IF NOT EXISTS idx_movie_results_expires_at ON movie_results(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user_id ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_preference_analysis_user_id ON movie_preference_analysis(user_id);
