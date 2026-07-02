# Vaultly - Data Room MVP

A full-stack Data Room application (Google Drive analog) built with React, NestJS, tRPC, and Supabase.

## Tech Stack

### Frontend (`apps/web`)

- React 19 + TypeScript + Vite
- TanStack Router, Query, Table
- Tailwind CSS v4 + shadcn/ui (Radix)
- Zustand (UI state)
- Dexie (IndexedDB for PDF blobs)
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

- **Auth** — Supabase email/password login, per-user data rooms
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
- **PDF blobs** → IndexedDB via Dexie (persists across page reloads)
- **Auth** → Supabase Auth (JWT verified on API)

### Per-user isolation

- Each `DataRoom` belongs to a Supabase user (`userId`)
- All tRPC procedures require a valid JWT (`Authorization: Bearer <token>`)
- Users only see and modify their own data rooms and contents

### Auth flow

1. User signs in on `/login` via Supabase Auth (browser)
2. Web attaches JWT to every tRPC request
3. API verifies JWT with `SUPABASE_JWT_SECRET` and reads `sub` as `userId`
4. All queries filter by `userId` on the owning data room

### File Upload Flow

1. User selects/drops PDF → stored in IndexedDB (Dexie)
2. Metadata sent to API via tRPC `file.create`
3. TanStack Query invalidates file list

### Soft Delete + Undo

1. Delete sets `deletedAt` timestamp in DB
2. Toast shows 10-second undo button
3. On undo → `restore` tRPC call clears `deletedAt`
4. After 10s → PDF blob purged from IndexedDB

## Prerequisites

- Node.js >= 20
- npm >= 10
- Supabase project (or local PostgreSQL)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd vaultly
npm install
```

### 2. Configure database

Copy environment files and set your Supabase connection strings:

```bash
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
```

Update `DATABASE_URL` and `DIRECT_URL` in both files with your Supabase credentials.

### 3. Configure Supabase Auth

In the [Supabase Dashboard](https://supabase.com/dashboard):

1. Enable **Email** provider under Authentication → Providers
2. Copy **Project URL** and **anon public** key → `apps/web/.env`
3. Copy **JWT Secret** (Project Settings → API) → `apps/api/.env` as `SUPABASE_JWT_SECRET`

```bash
cp apps/web/.env.example apps/web/.env
```

Update `apps/api/.env` with `SUPABASE_JWT_SECRET`.

> **Migrating existing data:** adding `userId` to `DataRoom` requires a schema push. If you have rooms created before auth, delete them in Supabase SQL editor (`DELETE FROM "DataRoom";`) before running `db:push`, then create new rooms after signing in.

### 4. Push database schema

```bash
npm run db:generate
npm run db:push
```

### 5. Start development

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
