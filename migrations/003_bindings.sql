-- Add bindings table for topology visualization
CREATE TABLE IF NOT EXISTS bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,    -- 'container', 'worker'
  source_name TEXT NOT NULL,
  target_type TEXT NOT NULL,    -- 'd1', 'kv', 'r2', 'queue', 'do', 'service'
  target_name TEXT NOT NULL,
  binding_name TEXT NOT NULL,
  worker_name TEXT,             -- which wrangler.toml this came from
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bindings_worker ON bindings(worker_name);
CREATE INDEX IF NOT EXISTS idx_bindings_source ON bindings(source_name);
CREATE INDEX IF NOT EXISTS idx_bindings_target ON bindings(target_name);

INSERT OR IGNORE INTO migrations (name) VALUES ('003_bindings');
