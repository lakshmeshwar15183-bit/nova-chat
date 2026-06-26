# Installation guide

## Prerequisites

- **Node.js** ≥ 20 and npm ≥ 10
- **Docker** & Docker Compose (recommended for Postgres/Redis)
- A **PostgreSQL 14+** database and **Redis 6+** instance (local or managed)

## 1. Clone & install

```bash
git clone https://github.com/<owner>/nova-chat.git
cd nova-chat

npm install                       # root workspace tooling
npm --workspace backend install
npm --workspace frontend install
```

## 2. Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

| Variable                              | Required | Notes                                            |
| ------------------------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`                        | ✅       | PostgreSQL connection string                     |
| `REDIS_URL`                           | ✅       | Redis connection string                          |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅  | Long random strings                              |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ⛔  | Enables Google OAuth                             |
| `SMTP_*`                              | ⛔       | Without it, OTP codes are logged to the console  |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | ⛔     | Without it, uploads are stored under `./uploads` |

## 3. Database

Start infrastructure and apply the schema:

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
npm --workspace backend run prisma:migrate     # creates tables
npm --workspace backend run prisma:seed        # optional demo data
```

> Tip: `npm --workspace backend run prisma:studio` opens a visual DB browser.

## 4. Run

```bash
npm run dev          # backend (:4000) + frontend (:3000)
```

Open http://localhost:3000. If you seeded data, log in with
`alice@novachat.dev` / `Password123!`.

## 5. Verify

```bash
curl http://localhost:4000/api/health
# { "success": true, "data": { "status": "ok", "checks": { "database": "up", "redis": "up" } } }
```

## Troubleshooting

- **`Invalid environment configuration`** — a required variable is missing; check the boot log.
- **OTP email never arrives** — without SMTP configured the code is printed to the backend log
  (`[DEV MAIL] ...`).
- **WebSocket won't connect** — ensure `NEXT_PUBLIC_API_URL` points at the backend and that the
  access token is present (log in first).
