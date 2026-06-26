# Deployment guide

NovaChat can be deployed as a single Docker stack, or with the frontend on Vercel and the
backend on Render/Railway.

## Option 1 — Docker Compose (single host)

```bash
cp .env.example .env     # set strong JWT secrets, DB creds, public URLs
npm run docker:up        # builds & starts postgres, redis, backend, frontend, nginx
```

- Nginx serves everything on **:8080** (`/`, `/api`, `/socket.io`, `/uploads`).
- The backend container runs `prisma migrate deploy` on boot.
- Persisted volumes: `pgdata`, `redisdata`.

Stop with `npm run docker:down`.

## Option 2 — Vercel (frontend) + Render (backend)

### Backend on Render

1. Push the repo to GitHub.
2. In Render: **New → Blueprint** and select the repo. [`render.yaml`](../render.yaml)
   provisions the web service, a managed Postgres and a Redis instance.
3. Set `CORS_ORIGINS` and `FRONTEND_URL` to your Vercel domain.
4. JWT secrets are generated automatically; `DATABASE_URL`/`REDIS_URL` are wired from the
   managed services.

> Railway alternative: create a service from `docker/Dockerfile.backend`, attach Postgres &
> Redis plugins, and copy their connection strings into the env vars.

### Frontend on Vercel

1. Import the repo, set the **root directory** to `frontend/`.
2. Add env var `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://api.novachat.app`).
3. Deploy. [`frontend/vercel.json`](../frontend/vercel.json) configures the build.

### Post-deploy checklist

- [ ] Backend `CORS_ORIGINS` includes the frontend origin.
- [ ] Google OAuth redirect URI registered: `https://<api>/api/auth/google/callback`.
- [ ] Supabase bucket created and `SUPABASE_*` set (otherwise uploads use ephemeral disk).
- [ ] SMTP credentials set for real OTP/welcome emails.
- [ ] `https://<api>/api/health/ready` returns `status: ready` (and `/api/health/live` returns `ok`).
- [ ] Strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars) — the app refuses to boot in production otherwise.
- [ ] `REDIS_URL` points at a managed Redis (required in production for cache, presence and WebSocket scaling).

## Production readiness

- **Horizontal scaling** — run multiple backend instances behind a load balancer.
  The Socket.IO Redis adapter shares realtime events across instances, and auth is
  stateless (JWT), so any instance can serve any socket/request. Use sticky sessions
  only if you enable long-polling transport; the default is pure WebSocket.
- **Startup validation** — `validateEnv` fails fast in production on missing/weak
  secrets, non-HTTPS origins, or an invalid `DATABASE_URL`/`REDIS_URL`.
- **Health probes** — point the platform's liveness check at `/api/health/live`
  (no deps) and the readiness/traffic gate at `/api/health/ready` (DB + Redis).
- **Graceful shutdown** — `enableShutdownHooks()` plus `OnModuleDestroy` close the
  Prisma and Redis connections cleanly on SIGTERM.
- **TLS / WSS** — terminate TLS at the proxy; `trust proxy` is enabled so secure
  cookies and client IPs are correct. The frontend derives `wss://` from the
  `https://` API origin automatically.

## CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push/PR to `main`:

1. **backend** — install, `prisma generate`, `prisma migrate deploy` (against ephemeral
   Postgres + Redis services), lint, build, test.
2. **frontend** — install, lint, typecheck, build.
3. **docker** — builds both production images.

Extend the `docker` job with `docker/login-action` + `push: true` to publish images to a
registry, or add a deploy step (Render deploy hook / Vercel CLI) once secrets are configured.
