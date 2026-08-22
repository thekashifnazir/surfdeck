-- One-time production migrations (run manually against live D1):
-- ALTER TABLE sites ADD COLUMN vibecoded INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE sites ADD COLUMN built_with TEXT;
-- ALTER TABLE sites ADD COLUMN embeddable INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mood_tags TEXT NOT NULL,
  character TEXT NOT NULL,
  stack TEXT,
  host TEXT,
  static_or_dynamic TEXT,
  built_with TEXT,
  why_note TEXT NOT NULL,
  nsfw INTEGER NOT NULL DEFAULT 0,
  vibecoded INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  added_at TEXT NOT NULL,
  embeddable INTEGER NOT NULL DEFAULT 1
);
