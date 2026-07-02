# Vaultly — Data Room MVP

A full-stack virtual data room for secure document organization during due diligence. Users create isolated **Data Rooms**, nest **folders**, upload **PDF files**, preview them in-app, and share rooms with collaborators.

Built as a take-home project with emphasis on UX, end-to-end functionality, and maintainable TypeScript across a monorepo.

| App | URL (local)           |
| --- | --------------------- |
| Web | http://localhost:5173 |
| API | http://localhost:3001 |

---

## Features

### Core (take-home requirements)

- Create data rooms and upload PDF files
- **Folders** — create, nest, view, rename, delete (cascade), move via drag & drop
- **Files** — upload PDF, in-app preview, rename, delete with undo
- Duplicate name detection within the same parent folder
- Sortable file explorer (name, type, size, modified)
- Filter explorer by item type (all / folders / files)
- Debounced search across room contents

### Extra

- Supabase Auth — email/password + Google OAuth
- Per-user data room isolation + room sharing (Editor / Viewer roles)
- Activity log, breadcrumbs, responsive mobile layout
- Dark/light theme, English + Ukrainian i18n

---

## Design Decisions

### Why a monorepo with tRPC?

The app is split into `apps/web`, `apps/api`, and shared packages (`db`, `trpc`, `ui`).

- **tRPC + Zod** — API input/output types are shared between client and server without codegen drift. Validation lives in `packages/trpc` once and is enforced on every procedure.
- **Prisma** — relational metadata (rooms, folder tree, files, members, activity) maps naturally to PostgreSQL. Folder nesting uses a self-referential `parentId`; cascade deletes are handled in application logic with soft-delete support.
- **NestJS** — hosts the tRPC adapter and gives a clear server entry point without over-engineering REST routes.

### Split storage: PostgreSQL + Supabase Storage

| Layer    | What is stored                           | Why                                      |
| -------- | ---------------------------------------- | ---------------------------------------- |
| Postgres | Rooms, folders, files metadata, ACLs     | Queryable, relational, auditable         |
| Storage  | PDF binary blobs (`{userId}/{uuid}.pdf`) | Cross-device persistence, scalable blobs |

Upload flow: the browser uploads directly to Supabase Storage (authenticated via user JWT + RLS), then sends metadata (`storageKey`, name, size) to the API.

Preview flow: the API verifies room access, then issues a **short-lived signed URL** using the service role key. This works for room owners and shared members without exposing storage credentials to the client.

### Authentication & authorization

- **Supabase Auth** handles sign-up, login, and Google OAuth (PKCE flow).
- The web client attaches `Authorization: Bearer <jwt>` to every tRPC call.
- The API verifies JWTs via **JWKS** (`SUPABASE_URL`) with an optional **HS256** fallback (`SUPABASE_JWT_SECRET`).
- Every procedure uses `protectedProcedure`; room access is checked through a dedicated access layer (`owner` / `editor` / `viewer`).

Room sharing uses a `RoomMember` table with pending invites matched by email on first login.

### Soft delete + undo

Deletes set `deletedAt` instead of removing rows immediately.

- A **10-second toast** offers undo (restore via tRPC).
- After the window, the PDF blob is removed from Storage.
- Folder delete cascades recursively to child folders and files (also soft-deleted).

This avoids accidental data loss while keeping the UI responsive.

### Edge cases handled

| Scenario                                  | Behavior                                                      |
| ----------------------------------------- | ------------------------------------------------------------- |
| Duplicate folder/file name in same parent | API returns `CONFLICT`; UI shows localized error              |
| Rename/move into conflicting name         | Same conflict check before write                              |
| Move folder into itself or descendant     | Blocked with `BAD_REQUEST`                                    |
| Delete folder                             | Cascading soft-delete of all descendants                      |
| Upload non-PDF or file > 50 MB            | Rejected client-side before upload                            |
| PDF file name                             | Normalized to include `.pdf` extension                        |
| OAuth callback race                       | Auth provider waits for PKCE exchange before route guards run |

### UI architecture

- **Granular components** — `FileExplorer`, `TreeSidebar`, `UploadDropzone`, `PDFViewer`, `SearchBar`, `ShareRoomDialog`, etc.
- **TanStack Table** — sortable desktop explorer; card layout on mobile.
- **dnd-kit** — drag folders/files onto tree nodes or explorer rows to move.
- **Zustand** — ephemeral UI state (sidebar, PDF preview target).
- **TanStack Query** — server state, cache invalidation after mutations.
- **Shared UI package** — shadcn/Radix primitives with Tailwind v4 design tokens.

---

## Architecture

```mermaid
flowchart LR
  subgraph browser [Browser]
    Web[React SPA]
    Storage[(Supabase Storage)]
  end

  subgraph server [API]
    API[NestJS + tRPC]
    Prisma[Prisma]
  end

  subgraph supabase [Supabase]
    PG[(PostgreSQL)]
    Auth[Auth]
  end

  Web -->|tRPC + JWT| API
  Web -->|upload PDF| Storage
  Web -->|login OAuth| Auth
  API --> Prisma --> PG
  API -->|signed preview URL| Storage
  Auth -->|JWKS| API
```

### Request flow (example: upload PDF)

1. User drops a PDF in `UploadDropzone`.
2. Client uploads blob to `vaultly-files/{userId}/{uuid}.pdf`.
3. Client calls `file.create` with metadata; API checks editor access and name conflicts.
4. Query cache invalidates; file appears in explorer.

### Project structure

```
vaultly/
├── apps/
│   ├── web/                 # React 19 + Vite SPA
│   └── api/                 # NestJS + tRPC server
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── trpc/                # Shared Zod schemas + procedure types
│   └── ui/                  # shadcn/ui components
└── packages/db/supabase/
    └── storage-setup.sql    # Storage RLS policies
```

---

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- A **Supabase** project (PostgreSQL, Auth, Storage)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd vaultly
npm install
npm run setup
```

`npm run setup` copies `.env.example` → `.env` for `packages/db`, `apps/api`, and `apps/web` when missing.

### 2. Create a Supabase project

In the [Supabase Dashboard](https://supabase.com/dashboard), create a project and note:

- Project URL
- `anon` public key
- `service_role` secret key (API only — never expose to the browser)
- Database connection strings (pooled + direct)

### 3. Configure environment files

#### `packages/db/.env`

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
```

#### `apps/api/.env`

```env
DATABASE_URL="..."          # same as packages/db
DIRECT_URL="..."            # same as packages/db
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."   # Project Settings → API → service_role
SUPABASE_STORAGE_BUCKET="vaultly-files"
SUPABASE_JWT_SECRET="..."         # optional HS256 fallback
PORT=3001
```

#### `apps/web/.env`

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="..."
VITE_SUPABASE_STORAGE_BUCKET="vaultly-files"
```

> Find database URLs under **Project Settings → Database → Connection string** (use Transaction pooler for `DATABASE_URL`, Session/direct for `DIRECT_URL`).

### 4. Push database schema

```bash
npm run db:generate
npm run db:push
```

### 5. Configure Supabase Storage

1. **Storage → New bucket** → name: `vaultly-files`, **Public: off**
2. **SQL Editor** → paste and run [`packages/db/supabase/storage-setup.sql`](packages/db/supabase/storage-setup.sql)

This adds RLS policies so authenticated users can read/write only their own path prefix (`{userId}/...`).

### 6. Configure Supabase Auth

1. **Authentication → Providers** → enable **Email**
2. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
3. Copy keys into `apps/web/.env` and `apps/api/.env` as described above.

#### Google OAuth (optional)

1. [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → OAuth client ID (**Web application**)
2. Authorized JavaScript origins: `http://localhost:5173`
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (shown in Supabase Google provider settings)
4. Paste **Client ID** and **Client Secret** into Supabase → **Authentication → Providers → Google**

### 7. Start development

```bash
npm run dev
```

The web dev server waits for the API health check (`http://localhost:3001/health`) before starting Vite.

Open http://localhost:5173, sign in, create a data room, and upload a PDF.

---

## Environment Variables Reference

### `packages/db/.env` and `apps/api/.env`

| Variable                    | Required | Description                                      |
| --------------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`              | Yes      | Pooled PostgreSQL connection (Prisma queries)    |
| `DIRECT_URL`                | Yes      | Direct connection (migrations / `db:push`)       |
| `SUPABASE_URL`              | Yes      | Supabase project URL (JWKS for JWT verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key (signed PDF preview URLs)       |
| `SUPABASE_STORAGE_BUCKET`   | Yes      | Storage bucket name (default: `vaultly-files`)   |
| `SUPABASE_JWT_SECRET`       | No       | Legacy HS256 JWT fallback                        |
| `CORS_ORIGIN`               | Yes\*    | Comma-separated web app URLs (production)        |
| `PORT`                      | No       | API port (default: `3001`; set by host in prod)  |

\* Required in production so the browser can call the API from your Vercel domain.

### `apps/web/.env`

| Variable                       | Required | Description                      |
| ------------------------------ | -------- | -------------------------------- |
| `VITE_SUPABASE_URL`            | Yes      | Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY`       | Yes      | Supabase anon public key         |
| `VITE_SUPABASE_STORAGE_BUCKET` | Yes      | Storage bucket name              |
| `VITE_API_URL`                 | Yes\*    | API base URL (no `/trpc` suffix) |

\* Required in production (e.g. `https://vaultly-api.onrender.com`). Leave empty locally — Vite proxies `/trpc` to the API.

---

## Deployment

The app is split across two hosts:

| Component               | Platform                     | Why                                                       |
| ----------------------- | ---------------------------- | --------------------------------------------------------- |
| **Web** (Vite SPA)      | [Vercel](https://vercel.com) | Static assets + SPA routing; fast CDN                     |
| **API** (NestJS + tRPC) | [Render](https://render.com) | Long-running Node server; not suited to Vercel serverless |

Supabase (Auth, Postgres, Storage) stays on your existing Supabase project — no separate deploy.

```mermaid
flowchart LR
  Browser --> Vercel[Vercel — apps/web]
  Browser --> Supabase[Supabase Auth + Storage]
  Vercel --> Render[Render — apps/api]
  Render --> SupabaseDB[(Supabase Postgres)]
  Render --> SupabaseStorage[Supabase Storage]
```

### 1. Deploy the API (Render)

**Option A — Blueprint** (recommended): Render Dashboard → **New** → **Blueprint** → connect this repo. Render reads [`render.yaml`](render.yaml) at the repo root.

**Option B — Manual Web Service**

| Setting           | Value                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| Root directory    | _(repo root)_                                                                     |
| Build command     | `npm install && npm run db:generate && npx turbo run build --filter=@vaultly/api` |
| Start command     | `node apps/api/dist/main.js`                                                      |
| Health check path | `/health`                                                                         |

**Environment variables** (same as local `apps/api/.env`):

| Variable                    | Notes                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`              | Supabase pooled connection string                                                                |
| `DIRECT_URL`                | Supabase direct connection string                                                                |
| `SUPABASE_URL`              | Project URL                                                                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (signed PDF URLs)                                                                   |
| `SUPABASE_STORAGE_BUCKET`   | `vaultly-files`                                                                                  |
| `SUPABASE_JWT_SECRET`       | Optional HS256 fallback                                                                          |
| `CORS_ORIGIN`               | Your Vercel URL, e.g. `https://vaultly.vercel.app` (add preview URLs if needed, comma-separated) |
| `NODE_ENV`                  | `production`                                                                                     |

After deploy, note the public URL (e.g. `https://vaultly-api.onrender.com`).

> **Free tier:** Render free web services spin down after inactivity (~50s cold start on first request). Use a paid plan or [Railway](https://railway.app) / [Fly.io](https://fly.io) if you need always-on.

### 2. Deploy the web app (Vercel)

**Option A — Git integration:** Vercel Dashboard → **Add New Project** → import repo. Use defaults from root [`vercel.json`](vercel.json) (install at repo root, Turbo builds `@vaultly/web`, output `apps/web/dist`).

**Option B — CLI:**

```bash
npm i -g vercel
vercel login
vercel --prod
```

**Environment variables** (Project → Settings → Environment Variables):

| Variable                       | Example                            |
| ------------------------------ | ---------------------------------- |
| `VITE_SUPABASE_URL`            | `https://xxxx.supabase.co`         |
| `VITE_SUPABASE_ANON_KEY`       | anon key from Supabase             |
| `VITE_SUPABASE_STORAGE_BUCKET` | `vaultly-files`                    |
| `VITE_API_URL`                 | `https://vaultly-api.onrender.com` |

Redeploy after changing `VITE_*` variables (they are baked in at build time).

SPA routing is handled by `vercel.json` rewrites (all routes → `index.html`).

### 3. Configure Supabase for production

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL configuration**:

| Setting           | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Site URL**      | `https://your-app.vercel.app`                                                 |
| **Redirect URLs** | `https://your-app.vercel.app/**`, `http://localhost:5173/**` (keep local dev) |

**Google OAuth** (if enabled): add your Vercel origin to Google Cloud Console **Authorized JavaScript origins** and Supabase redirect URLs.

**Storage:** ensure [`packages/db/supabase/storage-setup.sql`](packages/db/supabase/storage-setup.sql) was run on the project (same as local).

### 4. Post-deploy checklist

1. API `/health` returns OK on Render URL.
2. `CORS_ORIGIN` on Render includes the exact Vercel origin (scheme + host, no trailing slash).
3. Web loads; login (email or Google) works.
4. Upload PDF → preview opens (checks API + service role key).
5. Optional: add Vercel preview URLs to `CORS_ORIGIN` for PR previews.

### Why not Vercel for the API?

NestJS runs as a persistent HTTP server with tRPC mounted on Express. Vercel is optimized for serverless functions and static sites. Running the full Nest app on Vercel would require a rewrite to serverless handlers, lose WebSocket/long-lived behavior, and complicate monorepo builds. Render (or Railway/Fly) is the straightforward fit for this stack.

---

## Scripts

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `npm run dev`         | Start API + web in development mode |
| `npm run build`       | Build all packages                  |
| `npm run test`        | Run unit tests                      |
| `npm run lint`        | Lint all packages                   |
| `npm run setup`       | Copy `.env.example` files           |
| `npm run db:generate` | Generate Prisma client              |
| `npm run db:push`     | Push Prisma schema to the database  |

---

## Testing

```bash
npm run test
```

Coverage includes Zod schema validation, utility helpers, file storage key generation, and React component tests (Testing Library).

---

## Code Quality

- TypeScript strict mode across the monorepo
- ESLint + Prettier (with Tailwind class sorting)
- Husky pre-commit hooks + lint-staged
- [Conventional Commits](https://www.conventionalcommits.org/) via commitlint

---

## Troubleshooting

| Problem                        | Likely cause                               | Fix                                    |
| ------------------------------ | ------------------------------------------ | -------------------------------------- |
| `ECONNREFUSED` on `/trpc`      | API not ready                              | Wait for API or restart `npm run dev`  |
| CORS error in production       | `CORS_ORIGIN` missing/wrong                | Set exact Vercel URL on Render API     |
| tRPC fails after Vercel deploy | Missing `VITE_API_URL`                     | Set to Render API URL and redeploy web |
| Render cold start slow         | Free tier spin-down                        | Wait ~30–60s or upgrade plan           |
| Upload fails with 403          | Storage RLS not applied                    | Run `storage-setup.sql`                |
| PDF preview empty / error      | Missing `SUPABASE_SERVICE_ROLE_KEY` on API | Add to `apps/api/.env`, restart API    |
| Google OAuth loops to login    | URL config / double code exchange          | Check Redirect URLs; close extra tabs  |
| `provider is not enabled`      | Google provider off in Supabase            | Enable provider + add Client ID/Secret |
| Duplicate name error           | Name already exists in folder              | Rename or pick a different name        |

---

## License

MIT
