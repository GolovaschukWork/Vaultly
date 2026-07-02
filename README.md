# Vaultly - Data Room MVP

A full-stack Data Room application (Google Drive analog) built with React, NestJS, tRPC, and Supabase.

## Tech Stack

### Frontend (`apps/web`)

- React 19 + TypeScript + Vite
- TanStack Router, Query, Table
- Tailwind CSS v4 + shadcn/ui (Radix)
- Zustand (UI state)
- Supabase Storage (PDF blobs)
- react-pdf (in-app PDF viewer)
- i18next (EN + UK localization)
- next-themes (dark/light mode)
- dnd-kit (drag & drop)
- react-hook-form + Zod

### Backend (`apps/api`)

- NestJS + tRPC
- Prisma ORM → Supabase PostgreSQL

### Monorepo

- Turborepo + npm workspaces

## Features

- **Auth** — Supabase email/password and Google OAuth login, per-user data rooms
- **Room sharing** — invite members by email with Editor or Viewer roles
- **Folders** — nested folders with rename, delete (cascade), move
- **Files** — PDF upload, preview, rename, delete with undo
- **Tree Sidebar** — recursive folder tree with drag & drop
- **Breadcrumbs** — navigation path
- **Search** — debounced search across files and folders
- **PDF Preview** — in-app viewer with pagination
- **Undo Delete** — 10-second undo window for deleted items
- **Recent Activity** — activity log panel
- **Dark/Light Theme** — CSS custom properties via Tailwind
- **i18n** — English (base) and Ukrainian
- **Responsive** — mobile, tablet, desktop layouts

## Architecture

```
vaultly/
├── apps/
│   ├── web/          # React SPA
│   └── api/          # NestJS + tRPC
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── trpc/         # Shared Zod schemas
│   └── ui/           # shadcn/ui components
```

### Data Storage Strategy

- **Metadata** (rooms, folders, files, activity) → Supabase PostgreSQL via Prisma
- **PDF blobs** → Supabase Storage (`vaultly-files` bucket, private per-user paths)
- **Auth** → Supabase Auth (JWT verified on API)

### Per-user isolation

- Each `DataRoom` belongs to a Supabase user (`userId`)
- All tRPC procedures require a valid JWT (`Authorization: Bearer <token>`)
- Storage paths use `{userId}/{uuid}.pdf` with RLS policies (see `packages/db/supabase/storage-setup.sql`)

### Auth flow

1. User signs in on `/login` via Supabase Auth (email/password or Google OAuth)
2. Web attaches JWT to every tRPC request
3. API verifies JWT via JWKS (`SUPABASE_URL`) with HS256 fallback
4. All queries filter by `userId` on the owning data room

### File Upload Flow

1. User selects/drops PDF → uploaded to Supabase Storage
2. Metadata sent to API via tRPC `file.create` with `storageKey`
3. TanStack Query invalidates file list
4. PDF preview downloads blob from Storage

### Soft Delete + Undo

1. Delete sets `deletedAt` timestamp in DB
2. Toast shows 10-second undo button
3. On undo → `restore` tRPC call clears `deletedAt`
4. After 10s → PDF blob purged from Storage

## Prerequisites

- Node.js >= 20
- npm >= 10
- Supabase project (PostgreSQL + Auth + Storage)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd vaultly
npm install
npm run setup
```

`npm run setup` copies `.env.example` files if they are missing.

### 2. Configure Supabase

Copy environment files and set your Supabase connection strings:

```bash
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
```

Update `DATABASE_URL` and `DIRECT_URL` in both files with your Supabase credentials.

### 3. Configure Supabase Storage

Bucket `vaultly-files` must exist (private). Then run in **SQL Editor**:

```bash
# paste contents of packages/db/supabase/storage-setup.sql
```

### 4. Configure Supabase Auth

In the [Supabase Dashboard](https://supabase.com/dashboard):

1. Enable **Email** provider under Authentication → Providers
2. (Optional) Enable **Google** provider — see [Google OAuth setup](#google-oauth-optional) below
3. Under Authentication → URL Configuration, set **Site URL** to `http://localhost:5173` and add `http://localhost:5173/**` to **Redirect URLs**
4. Copy **Project URL** and **anon public** key → `apps/web/.env`
5. Copy **JWT Secret** (Project Settings → API) → `apps/api/.env` as `SUPABASE_JWT_SECRET`

```bash
cp apps/web/.env.example apps/web/.env
```

### 5. Push database schema

```bash
npm run db:generate
npm run db:push
```

#### Google OAuth (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 **Web application** client
2. Add authorized JavaScript origins: `http://localhost:5173` (and your production URL)
3. Add authorized redirect URI from Supabase: **Authentication → Providers → Google** shows the callback URL (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`)
4. Paste the Google **Client ID** and **Client Secret** into the Supabase Google provider settings and enable the provider

> **Migrating existing data:** adding `userId` to `DataRoom` requires a schema push. If you have rooms created before auth, delete them in Supabase SQL editor (`DELETE FROM "DataRoom";`) before running `db:push`, then create new rooms after signing in.

### 6. Start development

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## Scripts

| Command               | Description                |
| --------------------- | -------------------------- |
| `npm run dev`         | Start all apps in dev mode |
| `npm run build`       | Build all packages         |
| `npm run lint`        | Lint all packages          |
| `npm run test`        | Run tests                  |
| `npm run setup`       | Copy `.env.example` files  |
| `npm run db:generate` | Generate Prisma client     |
| `npm run db:push`     | Push schema to database    |

## Environment Variables

### `packages/db/.env` and `apps/api/.env`

| Variable              | Description                               |
| --------------------- | ----------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string (pooled)     |
| `DIRECT_URL`          | PostgreSQL direct connection (migrations) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for API auth          |
| `PORT`                | API server port (default: 3001)           |

### `apps/web/.env`

| Variable                 | Description              |
| ------------------------ | ------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

## Code Quality

- ESLint + TypeScript strict mode
- Prettier with Tailwind plugin
- Husky pre-commit hooks
- lint-staged
- commitlint (conventional commits)

## Testing

```bash
npm run test
```

Tests include:

- Zod schema validation
- Utility functions
- React component tests (RTL)

## Design Tokens

All colors are defined as CSS custom properties in `apps/web/src/index.css` and mapped in `tailwind.config.ts`:

- `brand` — primary accent (blue)
- `surface` — backgrounds
- `content` — text colors
- `border` — borders and focus rings
- `danger` / `success` — semantic colors

Dark mode toggles via `class` strategy on `<html>`.

## License

MIT
