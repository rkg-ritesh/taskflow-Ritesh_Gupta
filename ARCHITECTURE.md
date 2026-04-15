# TaskFlow — Architecture Decisions

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js (App Router) | Full-stack with a single deployment unit. API Routes replace a separate Go server. Server Components enable session reads without client round-trips. |
| Language | TypeScript | End-to-end type safety; shared types between API and frontend without a separate codegen step. |
| Database | PostgreSQL 16 | Relational data with foreign keys, enums, and JSONB if needed later. |
| ORM + Migrations | Prisma 5 | Schema-first with explicit migration files (SQL diffs in `prisma/migrations/`). Not auto-migrate — `prisma migrate deploy` applies migrations atomically. |
| Component Library | shadcn/ui + Tailwind CSS v4 | Unstyled primitives (Radix) with Tailwind utility classes. Copy-paste components mean no runtime overhead and full control over markup. |
| Auth | JWT (jose) + httpOnly cookies | `jose` is Edge-runtime compatible (used in Next.js middleware). httpOnly cookies prevent XSS from reading the token. SameSite=lax protects against CSRF for standard form submissions. |
| Password hashing | bcryptjs cost=12 | Meets the ≥12 requirement; bcryptjs is pure JS (no native bindings needed in Docker). |
| Server state | TanStack Query v5 | Handles caching, background refetching, and optimistic updates cleanly. Optimistic task status changes update the UI immediately and revert on error. |
| Logging | Winston | Structured JSON logging in production; colorized simple format in development. Writes to `logs/combined.log` and `logs/error.log`. |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable | Lighter than react-beautiful-dnd, actively maintained, works with React 19. |
| Dark mode | next-themes | Persists in localStorage under `taskflow-theme`. Zero-flash with `suppressHydrationWarning` on `<html>`. |
| Testing | Jest + jest-environment-node | Integration tests for auth routes against a real PostgreSQL database. `next/jest` provides the SWC transformer. |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Public pages: /login, /register
│   ├── (dashboard)/     # Protected pages: /projects, /projects/[id]
│   │   └── layout.tsx   # Reads session cookie server-side, injects user into Navbar
│   ├── api/             # REST API (Next.js Route Handlers)
│   └── layout.tsx       # Root: ThemeProvider + QueryProvider + Toaster
├── components/          # UI components (auth/, layout/, projects/, tasks/)
├── hooks/               # TanStack Query hooks (useProjects, useTasks)
├── lib/
│   ├── prisma.ts        # Singleton PrismaClient
│   ├── jwt.ts           # jose sign/verify
│   ├── auth.ts          # getCurrentUser(request) → User | null
│   ├── logger.ts        # Winston instance
│   ├── api-helpers.ts   # Typed response builders + requireAuth
│   └── validations/     # Zod schemas for all request bodies
├── providers/           # QueryProvider, ThemeProvider (client components)
├── types/               # Shared TypeScript types
└── middleware.ts        # Route protection (Edge runtime)
```

---

## Authentication Flow

```
1. POST /api/auth/login
   ├── Validate body (Zod)
   ├── Find user by email
   ├── bcrypt.compare(password, hash)
   ├── signToken({ sub: userId, email, name }) — 24h expiry
   └── response.cookies.set("token", jwt, { httpOnly: true })

2. Every protected request
   ├── middleware.ts reads cookies().get("token")
   ├── jwtVerify(token, secret)
   ├── If invalid → redirect to /login (pages) or 401 (API)
   └── NextResponse.next() — request proceeds

3. API routes
   ├── requireAuth(request) → [User, null] | [null, 401 Response]
   └── All business logic runs after this check
```

---

## Data Access Patterns

- **Projects list**: `WHERE ownerId = user OR tasks.assigneeId = user` — returns projects the user is relevant to
- **Project detail**: Includes all tasks + assignee data in a single query to avoid N+1
- **Task status change**: Optimistic update in TanStack Query; PATCH on server with `onError` revert
- **Stats**: `groupBy` aggregation — two queries (by status, by assignee) run in `Promise.all`

---

## Key Tradeoffs

### Next.js instead of Go
The assignment prefers Go but permits other languages. Next.js was chosen because:
- Single deployment artifact (no separate API server)
- Shared TypeScript types across the stack
- API Routes support the exact same REST contract specified in the rubric

Tradeoff: Node.js is less memory-efficient than Go for high concurrency. For a take-home demo with ≤100 concurrent users, this is irrelevant.

### Prisma instead of raw SQL migrations
Prisma generates explicit SQL migration files in `prisma/migrations/`. These are real SQL files (not ORM magic) that can be reviewed, modified, and rolled back. `prisma migrate deploy` applies them without regenerating anything. Down migrations are written manually in the migration files.

Tradeoff: Prisma abstracts some advanced PostgreSQL features. For complex queries, raw SQL via `prisma.$queryRaw` is always available.

### httpOnly Cookies instead of localStorage
Tokens in localStorage are readable by any JavaScript on the page (XSS vector). httpOnly cookies are inaccessible to JavaScript entirely, eliminating XSS token theft. Bearer tokens require client-side storage (localStorage or memory) which is vulnerable to XSS. The API behaves identically otherwise — the token is verified on every request.

Tradeoff: Requires `SameSite=lax` to mitigate CSRF. State-changing mutations must be same-origin POST/PATCH/DELETE (they are).

**API client access (Postman):** httpOnly cookies are set automatically by the browser but Postman doesn't share the browser cookie jar. The login and register responses include the JWT in the response body (`{ "token": "...", "user": {...} }`). Copy the token and pass it as `Authorization: Bearer <token>` on subsequent requests. `getCurrentUser` in `src/lib/auth.ts` checks the cookie first, then falls back to the `Authorization` header.

**Is returning the token in the body safe?** The React frontend never reads or stores the token from the response body — it relies entirely on the httpOnly cookie. The `token` field is only consumed by non-browser API clients. Since the frontend ignores it, browser XSS protection is unchanged. This also matches the API contract specified in the assignment brief.

### TanStack Query instead of Zustand
Server state (projects, tasks) lives on the server. TanStack Query fetches, caches, and invalidates it without a separate store. Optimistic updates are first-class. Zustand would require manual sync logic.

---

## Testing

Integration tests live in `src/__tests__/` and run against a real PostgreSQL database — no mocks. The three auth tests cover:

| Test | What it asserts |
|---|---|
| Register — happy path | 201, user returned (password excluded), `token` httpOnly cookie set |
| Register — duplicate email | 400, `fields.email` validation error |
| Login — wrong password | 401, `error: "unauthorized"` |

**Test isolation:** each test user is created with an `@test.taskflow` email domain. A `afterEach` hook deletes all `@test.taskflow` users via Prisma cascade, so seed data is never touched.

**Jest setup note:** `jose` (JWT library) is ESM-only. `next/jest` sets its own `transformIgnorePatterns` after merging user config, silently overriding it. The config in `jest.config.ts` unwraps the fully-resolved config and re-stamps `transformIgnorePatterns` so SWC transforms `jose` into CommonJS before Jest runs it.

```bash
docker compose up -d postgres
npm test
```

---

## What Was Intentionally Left Out

| Feature | Reason |
|---|---|
| Refresh tokens | 24h JWT is sufficient for a demo; refresh token rotation adds complexity without UI value |
| Rate limiting | Would require Redis or a middleware service (e.g., Upstash); out of scope |
| Email verification | No email infrastructure; not required by the rubric |
| WebSocket / SSE real-time | Would require a separate server or Next.js custom server; Tanstack Query polling is a reasonable fallback |
| Pagination UI | API supports `?page=&limit=` but the projects page loads all (reasonable for a project list ≤100 items) |
