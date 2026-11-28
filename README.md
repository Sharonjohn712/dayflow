# Dayflow — Full-Stack AI Daily Planner

React + Vite · Hono · PostgreSQL (Supabase) · Clerk Auth · Groq

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Hono, Zod validation, Prisma ORM |
| Database | PostgreSQL via Supabase |
| Auth | Clerk (OAuth + session management) |
| AI | Groq — `llama-3.3-70b-versatile` with streaming day reviews (server-side only) |
| Deploy | Vercel (frontend) + Render (backend) |

## Local Development

### 1. Clone & install

```bash
# Install both workspaces
cd frontend && npm install
cd ../backend && npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string** — copy the URI
3. Note it for `DATABASE_URL` below

### 3. Set up Clerk

1. Create an app at [clerk.com](https://clerk.com)
2. Copy your **Publishable Key** and **Secret Key**
3. In Clerk dashboard → **JWT Templates** → create a template named `supabase` (optional, for RLS)

### 4. Environment variables

**backend/.env**
```env
DATABASE_URL="postgresql://..."   # Supabase connection string
CLERK_SECRET_KEY="sk_..."
CLERK_JWT_KEY="..."               # JWKS public key for token verification
GROQ_API_KEY="gsk_..."            # from console.groq.com
ALLOWED_ORIGIN="http://localhost:5173"   # comma-separated list allowed
# ALLOWED_ORIGIN_PATTERN=""             # staging only: regex for Vercel preview URLs
PORT=3001
```

**frontend/.env**
```env
VITE_CLERK_PUBLISHABLE_KEY="pk_..."
VITE_API_URL="http://localhost:3001"
```

### 5. Run migrations

```bash
cd backend
npx prisma migrate dev --name init
```

### 6. Start dev servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Visit http://localhost:5173

## Deployment

Deploys are driven by GitHub Actions (`.github/workflows/ci.yml`), not by Vercel/Render
pulling from Git. Nothing deploys unless the tests pass.

| Event | Tests | Frontend (Vercel) | Backend (Render) |
|---|---|---|---|
| Pull request | ✅ | **Preview** deploy, URL commented on the PR | — (previews use the staging backend) |
| Push / merge to `main` | ✅ | **Production** deploy | Production deploy hook (+ staging hook if set) |
| Manual (Actions → CI/CD → Run workflow on `main`) | ✅ | Production | Production |

### One-time setup

**Vercel** (frontend — the project's **Root Directory** is `frontend`; the workflow runs the CLI
from the repo root and Vercel builds that subfolder):
1. Run `npx vercel link` at the repo root → note `orgId` and `projectId` in `.vercel/project.json`.
2. Create a token: Vercel → Account Settings → Tokens.
3. Environment variables (Project → Settings → Environment Variables):
   - **Production:** `VITE_CLERK_PUBLISHABLE_KEY` (Clerk production key), `VITE_API_URL` (production Render URL)
   - **Preview:** `VITE_CLERK_PUBLISHABLE_KEY` (Clerk *development* key), `VITE_API_URL` (staging Render URL)
4. Git auto-deploys are disabled in `frontend/vercel.json` (`git.deploymentEnabled: false`).

**Render** (backend):
1. Production service → Settings → **Auto-Deploy: Off**, then copy its **Deploy Hook** URL.
2. *(Staging, for PR previews)* Create a second service `dayflow-staging` from the same repo with its own
   database, Clerk development keys, Auto-Deploy Off, and
   `ALLOWED_ORIGIN_PATTERN=https://<vercel-project>-[a-z0-9-]+-<vercel-team-slug>\.vercel\.app`.
   Copy its Deploy Hook URL too.

**GitHub** → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel token |
| `VERCEL_ORG_ID` | `orgId` from `project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `project.json` |
| `RENDER_DEPLOY_HOOK_URL` | Production deploy hook |
| `RENDER_STAGING_DEPLOY_HOOK_URL` | Staging deploy hook (optional) |

Optional: GitHub → Settings → Environments → `production` → **Required reviewers** to approve each
production deploy, and a branch protection rule on `main` requiring the `backend` and `frontend` checks.

## Project Structure

```
dayflow/
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components by feature
│   │   ├── hooks/          # React Query hooks
│   │   ├── lib/            # API client, utils
│   │   ├── store/          # Zustand stores
│   │   └── types/          # Shared TypeScript types
│   └── ...
└── backend/
    ├── src/
    │   ├── routes/         # Hono route handlers
    │   ├── middleware/      # Auth, error handling
    │   └── lib/            # Prisma client, AI helpers
    ├── prisma/
    │   └── schema.prisma
    └── ...
```
