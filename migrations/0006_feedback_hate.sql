-- Add 'hate' (crying face) feedback type — SQLite requires table rebuild for CHECK change

CREATE TABLE IF NOT EXISTS movie_feedback_new (
  feedback_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('like', 'dislike', 'love', 'not_interested', 'hate')),
  rating INTEGER CHECK(rating >= 1 AND rating <= 10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, movie_id)
);

INSERT INTO movie_feedback_new
  SELECT * FROM movie_feedback;

DROP TABLE movie_feedback;

ALTER TABLE movie_feedback_new RENAME TO movie_feedback;
