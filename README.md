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
| Deploy | Vercel (frontend) + Railway (backend) |

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
ALLOWED_ORIGIN="http://localhost:5173"
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

### Backend → Railway

```bash
# In Railway dashboard: New Project → Deploy from GitHub
# Set environment variables from backend/.env
# Railway auto-detects Node.js and runs npm start
```

### Frontend → Vercel

```bash
npx vercel --cwd frontend
# Set VITE_CLERK_PUBLISHABLE_KEY and VITE_API_URL in Vercel dashboard
# VITE_API_URL = your Railway backend URL
```

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
