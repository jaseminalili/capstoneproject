require('dotenv').config()
const { Pool } = require('pg')
const config   = require('../config')

const pool = new Pool(config.db)

const SCHEMA = `
-- ─────────────────────────────────────────────────────────────────────────────
-- TaskFlow Database Schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  avatar        VARCHAR(4),
  color         VARCHAR(10)   NOT NULL DEFAULT '#3B82F6',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200)  NOT NULL,
  description TEXT,
  owner_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL DEFAULT 'member'
               CHECK (role IN ('owner','admin','member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Workspace Invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        VARCHAR(255) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin','member')),
  token        UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  status       VARCHAR(30)  NOT NULL DEFAULT 'planning'
               CHECK (status IN ('active','planning','completed','on_hold','cancelled')),
  priority     VARCHAR(20)  NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('critical','high','medium','low')),
  progress     SMALLINT     NOT NULL DEFAULT 0
               CHECK (progress BETWEEN 0 AND 100),
  start_date   DATE,
  end_date     DATE,
  lead_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID         NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id    UUID         REFERENCES tasks(id) ON DELETE SET NULL,
  title        VARCHAR(300) NOT NULL,
  description  TEXT,
  status       VARCHAR(30)  NOT NULL DEFAULT 'todo'
               CHECK (status IN ('backlog','todo','in_progress','in_review','done','cancelled')),
  priority     VARCHAR(20)  NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('critical','high','medium','low')),
  type         VARCHAR(30)  NOT NULL DEFAULT 'task'
               CHECK (type IN ('task','bug','feature','improvement','story','epic')),
  assignee_id  UUID         REFERENCES users(id) ON DELETE SET NULL,
  reporter_id  UUID         NOT NULL REFERENCES users(id),
  due_date     DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours    DECIMAL(5,2),
  tags         TEXT[]       DEFAULT '{}',
  position     INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT         NOT NULL,
  is_edited  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Task Activity Log
CREATE TABLE IF NOT EXISTS task_activities (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      VARCHAR(50)  NOT NULL,
  field       VARCHAR(100),
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50)  NOT NULL,
  title        VARCHAR(300) NOT NULL,
  body         TEXT,
  link         TEXT,
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user     ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_projects_workspace         ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user       ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project              ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee             ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status               ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_comments_task         ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_task       ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user         ON notifications(user_id, is_read);

-- ─── Auto-update triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','workspaces','projects','tasks','task_comments'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_%1$s ON %1$s;
       CREATE TRIGGER trg_updated_%1$s
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;
`

;(async () => {
  console.log('🔧  Initialising TaskFlow database…')
  try {
    await pool.query(SCHEMA)
    console.log('✅  All tables, indexes and triggers created successfully.')
    console.log('    Next: run  npm run db:seed')
  } catch (err) {
    console.error('❌  Schema creation failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
})()
