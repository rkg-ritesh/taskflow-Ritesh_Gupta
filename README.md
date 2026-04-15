# TaskFlow

A collaborative task management system built as a full-stack take-home assignment.

## 1. Overview

TaskFlow lets users register, log in, create projects, and manage tasks within those projects. Tasks can be assigned to team members, prioritized, and moved between statuses on a drag-and-drop kanban board.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) — full-stack |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM + Migrations | Prisma 5 |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Auth | JWT (jose) + httpOnly cookies |
| Server state | TanStack Query v5 |
| Drag & Drop | @dnd-kit |
| Dark mode | next-themes |
| Logging | Winston |
| Containerization | Docker + Docker Compose |

---

## 2. Architecture Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed reasoning on every major decision.

**Summary:**
- **Next.js full-stack** instead of Go — single deployment unit, shared TypeScript types across API and frontend with zero duplication
- **Next.js App Router** instead of React Router — file-system routing provides the same navigation patterns with the added benefit of server-side rendering and middleware-level auth without extra configuration
- **httpOnly cookies** instead of `Authorization: Bearer <token>` — deliberate security tradeoff: httpOnly cookies are inaccessible to JavaScript, eliminating XSS token theft entirely; Bearer tokens require client-side storage (localStorage or memory) which is vulnerable to XSS. The API behaves identically otherwise — the token is verified on every request
- **Prisma migrations** — generates real SQL diff files; `prisma migrate deploy` applies them atomically; `down.sql` files are included in each migration folder for rollback documentation
- **TanStack Query** — optimistic updates for task status changes with automatic rollback on error
- **@dnd-kit** — lighter, actively maintained drag-and-drop for the kanban board

---

## 3. Data Model

```
User
  id          uuid, primary key
  name        string, required
  email       string, unique, required
  password    string, hashed (bcrypt cost=12), required
  created_at  timestamp

Project
  id          uuid, primary key
  name        string, required
  description string, optional
  owner_id    uuid → User (ON DELETE CASCADE)
  created_at  timestamp

Task
  id           uuid, primary key
  title        string, required
  description  string, optional
  status       enum: todo | in_progress | done  (default: todo)
  priority     enum: low | medium | high         (default: medium)
  project_id   uuid → Project (ON DELETE CASCADE)
  assignee_id  uuid → User, nullable             (ON DELETE SET NULL)
  created_by_id uuid → User, nullable            (ON DELETE SET NULL)
  due_date     date, optional
  created_at   timestamp
  updated_at   timestamp
```

**Indexes:** `project.owner_id`, `task.project_id`, `task.assignee_id`, `task.created_by_id`

**Migrations live in** `prisma/migrations/` — each folder contains `migration.sql` (up) and `down.sql` (rollback). Both are required and present for every migration.

---

## 4. Running Locally

**Requirements:** Docker and Docker Compose only.

```bash
git clone https://github.com/your-name/taskflow
cd taskflow
cp .env.example .env
docker compose up --build
```

App available at **http://localhost:3000**

The first startup will:
1. Start PostgreSQL and wait until healthy
2. Run `prisma migrate deploy` (applies all migrations)
3. Run `prisma db seed` (creates test user, project, and tasks)
4. Start the Next.js server

---

## 5. Running Migrations

Migrations run **automatically** on container start via `docker/entrypoint.sh`.

To run manually (requires a running PostgreSQL):
```bash
# Apply all pending migrations
npx prisma migrate deploy

# Create a new migration during development
npx prisma migrate dev --name your_migration_name
```

Migration files live in `prisma/migrations/` — each contains the SQL diff (`migration.sql`) and a corresponding `down.sql` with the rollback statements. Prisma does not execute `down.sql` automatically; apply it manually against a running database to roll back a migration.

---

## 6. Test Credentials

The seed script creates a ready-to-use account:

```
Email:    test@example.com
Password: password123
```

The seed also creates:
- 1 project: **Website Redesign**
- 3 tasks: one in each status (`todo`, `in_progress`, `done`)

---

## 7. API Reference

All endpoints require authentication via the `token` httpOnly cookie (set automatically on login/register).

**Error format:**
```json
{ "error": "validation failed", "fields": { "email": "is required" } }
```

**HTTP status codes:**
- `400` — validation error
- `401` — not authenticated
- `403` — authenticated but not authorized
- `404` — resource not found

---

### Auth

#### `POST /api/auth/register`
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// Response 201
{ "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

#### `POST /api/auth/login`
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{ "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

#### `POST /api/auth/logout`
```json
// Response 200
{ "ok": true }
```

#### `GET /api/auth/me`
```json
// Response 200
{ "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

---

### Projects

#### `GET /api/projects?page=1&limit=20`
```json
// Response 200
{
  "projects": [
    {
      "id": "uuid",
      "name": "Website Redesign",
      "description": "Q2 project",
      "ownerId": "uuid",
      "createdAt": "2026-04-01T10:00:00Z",
      "_count": { "tasks": 3 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/projects`
```json
// Request
{ "name": "New Project", "description": "Optional description" }

// Response 201
{ "id": "uuid", "name": "New Project", "description": "Optional description", "ownerId": "uuid", "createdAt": "2026-04-09T10:00:00Z" }
```

#### `GET /api/projects/:id`
```json
// Response 200
{
  "id": "uuid",
  "name": "Website Redesign",
  "description": "Q2 project",
  "ownerId": "uuid",
  "createdAt": "2026-04-01T10:00:00Z",
  "tasks": [
    {
      "id": "uuid",
      "title": "Design homepage",
      "status": "in_progress",
      "priority": "high",
      "assigneeId": "uuid",
      "assignee": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" },
      "dueDate": "2026-04-15",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### `PATCH /api/projects/:id` — owner only
```json
// Request
{ "name": "Updated Name", "description": "Updated description" }

// Response 200 — returns updated project object
```

#### `DELETE /api/projects/:id` — owner only
```
Response 204 No Content
```

#### `GET /api/projects/:id/stats`
```json
// Response 200
{
  "byStatus": { "todo": 1, "in_progress": 1, "done": 1 },
  "byAssignee": [
    { "assigneeId": "uuid", "name": "Jane Doe", "count": 3 }
  ]
}
```

---

### Tasks

#### `GET /api/projects/:id/tasks?status=todo&assignee=uuid&page=1&limit=20`
```json
// Response 200
{
  "tasks": [ /* task objects */ ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/projects/:id/tasks`
```json
// Request
{ "title": "Design homepage", "description": "...", "priority": "high", "assigneeId": "uuid", "dueDate": "2026-04-15" }

// Response 201 — returns created task object
```

#### `PATCH /api/tasks/:id`
> Project owner can update all fields. Assignee can only update `status`.

```json
// Request — all fields optional
{ "title": "Updated title", "status": "done", "priority": "low", "assigneeId": "uuid", "dueDate": "2026-04-20" }

// Response 200 — returns updated task object
```

#### `DELETE /api/tasks/:id` — project owner or task creator only
```
Response 204 No Content
```

**Status values:** `todo` · `in_progress` · `done`
**Priority values:** `low` · `medium` · `high`

---

### Users

#### `GET /api/users`
```json
// Response 200
{ "users": [{ "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" }] }
```

---

## 8. Running Tests

Integration tests hit a real PostgreSQL database — no mocks.

```bash
docker compose up -d postgres   # DB must be running
npm test
```

**The 3 auth tests:**

| Test | Expected |
|---|---|
| Register with valid data | 201, user returned, `token` cookie set |
| Register with duplicate email | 400, `fields.email` validation error |
| Login with wrong password | 401, `error: "unauthorized"` |

Test users are scoped to `@test.taskflow` emails and cleaned up after each test — seed data is never affected.

---

## 9. What You'd Do With More Time

**Security:**
- Refresh tokens with rotation (short-lived access + long-lived refresh cookie)
- Rate limiting on auth endpoints (Upstash Redis or similar)

**Product features:**
- Real-time updates via Server-Sent Events or WebSocket
- Task comments and activity feed
- Email notifications for assignments
- User search/invite flow for adding collaborators to projects

**Engineering:**
- Integration test suite for auth and task endpoints (Jest + Supertest or Playwright)
- Pagination UI on projects and tasks lists (API already supports `?page=&limit=`)

**Shortcuts taken:**
- Pagination is implemented on the API but not rendered in the UI — adding it to the frontend is straightforward with TanStack Query's `keepPreviousData` but was cut for time
- Dark mode transition is disabled (`disableTransitionOnChange`) to avoid flash — enabling it requires a CSS transition on `html` that doesn't interfere with other transitions
- Test coverage is limited to the 3 auth integration tests; task and project endpoints follow the same patterns and are the natural next candidates
