# Saifit

Fast workout tracking PWA + LINE OA bot for Bangkok gym-goers.

Log a set in 3 seconds. See your progress. Stay consistent. Built for Thai-speaking users at commercial gyms and home setups. Bilingual Thai/English, installable PWA, offline-first.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Local Development                                               │
│                                                                  │
│  Browser (PWA)                LINE App                          │
│       │                           │                             │
│       ▼                           ▼                             │
│  Next.js :3000            Wrangler (CF Workers) :8787           │
│  App Router + API               Hono + LINE SDK                 │
│       │                           │                             │
│       └──────────┬────────────────┘                             │
│                  ▼                                               │
│           Docker Postgres :5435                                  │
│           Docker Redis    :6385                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Production                                                      │
│                                                                  │
│  Browser (PWA)                LINE App                          │
│       │                           │                             │
│       ▼                           ▼                             │
│  Vercel (Next.js)       Cloudflare Workers                      │
│       │                           │                             │
│       └──────────┬────────────────┘                             │
│                  ▼                                               │
│           Neon Postgres (serverless)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/your-org/saifit.git && cd saifit
cp .env.example .env
pnpm docker:up && pnpm dev
```

App: http://localhost:3000 · LINE bot: http://localhost:8787

---

## Detailed Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bun | 1.1.38 | `curl -fsSL https://bun.sh/install \| bash` |
| pnpm | 9.15.0 | `npm i -g pnpm@9.15.0` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Node.js | ≥20 | via mise/nvm |

Recommended: install [mise](https://mise.jdx.dev/) and run `mise install` — it reads `.tool-versions` and pins Bun + Node automatically.

### Steps

```bash
# 1. Clone and install
git clone https://github.com/your-org/saifit.git
cd saifit
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — see "Environment Variables" section below

# 3. Start Docker services (Postgres + Redis)
pnpm docker:up
# Wait until postgres shows "healthy":
docker compose ps

# 4. Run migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Start dev servers
pnpm dev
# → Next.js on :3000
# → Wrangler (LINE bot) on :8787
```

### Environment Variables

Edit `.env` before running:

```bash
# Required for local dev
DATABASE_URL=postgresql://saifit:saifit@localhost:5435/saifit
BETTER_AUTH_SECRET=any-string-32-chars-minimum
BETTER_AUTH_URL=http://localhost:3000

# Optional for local dev (LINE login won't work without these)
LINE_LOGIN_CHANNEL_ID=
LINE_LOGIN_CHANNEL_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LINE bot (Cloudflare Workers)
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
WEB_APP_URL=http://localhost:3000
```

---

## Docker Cheatsheet

```bash
pnpm docker:up       # Start Postgres + Redis (detached)
pnpm docker:down     # Stop containers (data preserved)
pnpm docker:reset    # Destroy volumes + restart (clean slate)
pnpm docker:logs     # Tail all container logs
```

Tools profile (pgAdmin :5050 + Mailhog :8025):

```bash
docker compose --profile tools up -d
```

---

## Database Commands

```bash
pnpm db:generate     # Generate migration from schema changes
pnpm db:migrate      # Apply pending migrations to local DB
pnpm db:seed         # Seed exercises, templates, dev user
pnpm db:reset        # Drop all tables + re-migrate + re-seed
pnpm db:studio       # Open Drizzle Studio (browser DB GUI)
pnpm db:push         # Push schema directly (dev only, no migration file)
```

---

## Dev Workflow

### Running the web app

```bash
pnpm dev
# or just the web app:
pnpm --filter @saifit/web dev
```

### Running the LINE bot locally

```bash
pnpm --filter @saifit/line-bot dev
# → Wrangler dev server on :8787
```

To test webhooks locally, use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
npx ngrok http 8787
# Set temporary webhook URL in LINE Developers Console
```

### Testing auth locally

Email/password auth works against local Postgres without any OAuth setup.

**Dev seed user:**

| Field | Value |
|-------|-------|
| Email | `dev@saifit.local` |
| Password | `devpassword123` |
| Status | Pre-onboarded, active program, 2 weeks of seed workouts |

LINE Login and Google OAuth require real channel credentials (see DEPLOYMENT.md).

### Running tests

```bash
pnpm --filter @saifit/shared test    # Unit tests (Vitest)
pnpm check                           # Biome lint + format check
pnpm build                           # Full production build
```

### Multi-agent orchestration

For phases with domain-isolated parallel work (web + line-bot + db + qa together), the repo ships a tmux-based multi-agent setup. See **[docs/multiagent-guide.md](docs/multiagent-guide.md)** for the full workflow. Quick start:

```bash
./scripts/multiagent.sh web line-bot db qa     # spawn agents in tmux
source scripts/multiagent.sh && agent_status   # check who's idle
./scripts/send-task.sh <agent> "<task>"        # dispatch (use absolute paths!)
```

When to reach for it: ≥2 tasks across ≥2 domains with no file overlap. For everything smaller, plain `/harness-work` is faster.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web** | Next.js 15 (App Router), React 19, TypeScript strict |
| **Styling** | Tailwind CSS v4, shadcn/ui, Lucide React |
| **State / Data** | TanStack Query v5, TanStack Form, Zustand |
| **Validation** | Valibot |
| **Auth** | Better Auth (LINE OAuth, Google OAuth, email/password) |
| **Bot** | Cloudflare Workers, Hono, @line/bot-sdk |
| **Database** | Neon (prod) / Docker Postgres (dev), Drizzle ORM |
| **i18n** | next-intl (Thai default, English secondary) |
| **PWA** | serwist (service worker, install prompt) |
| **Lint / Format** | Biome |
| **Tests** | Vitest |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## Placeholder Content (needs real values before go-live)

These items exist as stubs in the codebase and must be replaced before production:

| Item | Where | What's needed |
|------|-------|---------------|
| LINE Login credentials | `.env` → `LINE_LOGIN_CHANNEL_ID/SECRET` | LINE Developers Console → Login channel |
| LINE Messaging API credentials | `.env` → `LINE_CHANNEL_ACCESS_TOKEN/SECRET` | LINE Developers Console → Messaging API channel |
| Neon connection string | `.env` → `DATABASE_URL` | Neon project → Connection string (replace `localhost:5435`) |
| Google OAuth credentials | `.env` → `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console → OAuth 2.0 client |
| Exercise demo GIFs | `exercises` table → `gifUrl` column | Currently shows "วิดีโอสาธิต (coming soon)" placeholder |
| Real app URL | `.env` → `WEB_APP_URL`, `BETTER_AUTH_URL` | Your Vercel deployment URL |
| LINE OA friend link | Deep-linked in bot messages | Your LINE OA ID (`@your-oa-id`) |
| Apple touch icon | `/public/icons/icon-192.png` | Currently placeholder PNG (69 bytes) — replace with real icon |
