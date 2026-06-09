-- db/migrations/003_project_tracking.sql
-- Nexus AI Pro — Project Tracking Schema (Coding, Game Dev, AR/VR/3D)
-- Author: Cameron Fox <contact@nexusai.pro>
-- Date: 2026-06-09

DO $$ BEGIN
  CREATE TYPE project_type   AS ENUM ('coding', 'game', 'ar', 'vr', 'xr', '3d', 'mobile', 'web', 'desktop', 'api');
  CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'review', 'on_hold', 'completed', 'cancelled');
  CREATE TYPE task_status    AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked');
  CREATE TYPE milestone_status AS ENUM ('todo', 'in_progress', 'completed', 'blocked');
  CREATE TYPE task_priority  AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Projects ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             TEXT           NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
    description      TEXT,
    type             project_type   NOT NULL,
    status           project_status NOT NULL DEFAULT 'planning',
    tech_stack       TEXT[]         NOT NULL DEFAULT '{}',
    target_platforms TEXT[]         NOT NULL DEFAULT '{}',
    repo_url         TEXT,
    tags             TEXT[]         NOT NULL DEFAULT '{}',
    collaborators    UUID[]         NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Milestones ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestones (
    id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID             NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         TEXT             NOT NULL,
    description  TEXT,
    status       milestone_status NOT NULL DEFAULT 'todo',
    due_date     TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Tasks ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id       UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id     UUID          REFERENCES milestones(id) ON DELETE SET NULL,
    assignee_id      UUID          REFERENCES users(id) ON DELETE SET NULL,
    title            TEXT          NOT NULL,
    description      TEXT,
    status           task_status   NOT NULL DEFAULT 'todo',
    priority         task_priority NOT NULL DEFAULT 'medium',
    estimated_hours  DECIMAL(7,2),
    logged_hours     DECIMAL(7,2)  NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Commit log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_commits (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sha           CHAR(40)    NOT NULL,
    message       TEXT        NOT NULL,
    author        TEXT,
    branch        TEXT        NOT NULL DEFAULT 'main',
    files_changed INTEGER     NOT NULL DEFAULT 0,
    committed_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Unreal Engine projects ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS unreal_projects (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    engine_version    TEXT        NOT NULL DEFAULT '5.4',
    platform          TEXT        NOT NULL DEFAULT 'PC',
    genre             TEXT,
    build_target      TEXT        NOT NULL DEFAULT 'Development',
    build_status      TEXT        NOT NULL DEFAULT 'idle',
    build_errors      INTEGER     NOT NULL DEFAULT 0,
    build_warnings    INTEGER     NOT NULL DEFAULT 0,
    last_build_at     TIMESTAMPTZ,
    last_build_duration_s INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id      ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type_status  ON projects(type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id      ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id    ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_commits_project_id    ON project_commits(project_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_unreal_user_id        ON unreal_projects(user_id);

-- Triggers
DROP TRIGGER IF EXISTS update_projects_updated_at   ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at      ON tasks;
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;

CREATE TRIGGER update_projects_updated_at   BEFORE UPDATE ON projects   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at      BEFORE UPDATE ON tasks      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN RAISE NOTICE '✅ Migration 003 — Project tracking schema applied.'; END $$;
