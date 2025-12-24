-- Cloudflare Container Manager - Metadata Database Schema
-- This schema stores container metadata, job history, webhooks, snapshots, and scheduled actions

-- ============================================
-- CONTAINER COLORS (Visual organization)
-- ============================================
CREATE TABLE IF NOT EXISTS container_colors (
  container_name TEXT PRIMARY KEY,
  color TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- JOB HISTORY (Audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  container_name TEXT,
  operation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  metadata TEXT -- JSON blob for additional data
);

CREATE INDEX IF NOT EXISTS idx_jobs_container ON jobs(container_name);
CREATE INDEX IF NOT EXISTS idx_jobs_started_at ON jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- ============================================
-- WEBHOOKS
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  container_filter TEXT, -- NULL for all containers, or specific container name
  secret TEXT, -- HMAC secret for signing
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_triggered_at TEXT,
  last_status INTEGER -- HTTP status of last trigger
);

CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);

-- ============================================
-- SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  container_name TEXT NOT NULL,
  name TEXT,
  description TEXT,
  r2_key TEXT NOT NULL, -- R2 object key
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT, -- 'manual', 'scheduled', 'auto-before-delete', etc.
  size_bytes INTEGER,
  metadata TEXT -- JSON blob with snapshot contents summary
);

CREATE INDEX IF NOT EXISTS idx_snapshots_container ON snapshots(container_name);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at DESC);

-- ============================================
-- SCHEDULED ACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  container_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'restart', 'rebuild', 'scale', 'snapshot', 'signal'
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_run_status TEXT, -- 'success', 'failed'
  next_run_at TEXT,
  metadata TEXT, -- JSON blob for action-specific config (e.g., scale target)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_actions_container ON scheduled_actions(container_name);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_enabled ON scheduled_actions(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_next_run ON scheduled_actions(next_run_at);

-- ============================================
-- MIGRATIONS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mark this schema as the initial migration
INSERT OR IGNORE INTO migrations (name) VALUES ('001_initial_schema');
