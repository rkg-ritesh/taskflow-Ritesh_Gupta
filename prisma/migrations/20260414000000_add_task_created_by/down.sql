-- Down migration for: 20260414000000_add_task_created_by

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_created_by_id_fkey";
DROP INDEX IF EXISTS "tasks_created_by_id_idx";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "created_by_id";
