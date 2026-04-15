-- Down migration for: 20260413090739_init
-- Reverses the initial schema creation

DROP TABLE IF EXISTS "tasks";
DROP TABLE IF EXISTS "projects";
DROP TABLE IF EXISTS "users";
DROP TYPE IF EXISTS "TaskPriority";
DROP TYPE IF EXISTS "TaskStatus";
