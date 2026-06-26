<div align="center">

# 💬 NovaChat

**A production-ready, real-time messaging platform** — fast, secure, mobile-first and modern.

Inspired by the WhatsApp Web experience, built as an original project with a clean architecture.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-everywhere-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Features

- **Auth** — email/password, email OTP verification, Google OAuth, **two-factor authentication (TOTP + backup codes)**, JWT access + rotating refresh tokens, multi-device session management, forgot/reset password.
- **Messaging** — real-time one-to-one & group chat, replies, forwarding, edit
  (with edit history + optimistic locking), delete-for-me / delete-for-everyone,
  reactions, starred & **pinned**, **mentions** (`@username`), **polls**,
  **scheduled messages**, **drafts**, **link previews**, typing indicators,
  presence (online / last seen), delivery & read receipts, soft delete, and
  infinite history with cursor pagination.
- **Media** — images, video, audio, voice notes, PDFs, ZIPs and documents with drag-and-drop uploads, media gallery and downloads (Supabase Storage with local fallback).
- **Groups** — create groups, admins & owner roles, add/remove members, invite links, group avatar & description, permission controls.
- **Calls** — voice / video signaling over WebSocket (WebRTC relay), with mute & camera toggle hooks.
- **Search** — across messages, contacts, groups and media.
- **Settings** — light / dark / system theme, language selector, notification & privacy preferences.
- **Security** — bcrypt password hashing, Helmet, rate limiting, **origin-based CSRF
  protection**, **input sanitization**, **audit logging**, strict input validation,
  CORS, parameterised queries via Prisma.

### Frontend experience
- Mobile-first responsive UI, dark/light themes, glassmorphism surfaces, loading
  skeletons, empty & error states, toast notifications, keyboard shortcuts
  (`⌘/Ctrl+K`, `Esc`, `⌘/Ctrl+N`) and resilient realtime (auto-reconnect with
  offline sync).

## 🧱 Tech stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, React Query, Socket.IO client |
| **Backend**  | Node.js, NestJS 10, Socket.IO, REST, JWT, Passport                      |
| **Database** | PostgreSQL + Prisma ORM, Redis (presence, cache, fan-out)               |
| **Storage**  | Supabase Storage (local-disk fallback for dev)                          |
| **DevOps**   | Docker, Docker Compose, Nginx, GitHub Actions, Vercel, Render           |

## 📁 Repository layout

```
nova-chat/
├── backend/      # NestJS API + Socket.IO gateway + Prisma
├── frontend/     # Next.js app (App Router)
├── database/     # Data model docs & ERD
├── docker/       # Dockerfiles, docker-compose, Nginx config
├── docs/         # Architecture, installation, deployment, API, testing
└── .github/      # CI/CD workflows
```

## 🚀 Quick start

### Option A — Docker (everything at once)

```bash
cp .env.example .env          # adjust secrets
npm run docker:up             # postgres, redis, backend, frontend, nginx
```

Then open **http://localhost:8080** (via Nginx) or **http://localhost:3000** (frontend directly).

### Option B — Local development

```bash
# 1. Install dependencies
npm install            # root (workspaces)
npm --workspace backend install
npm --workspace frontend install

# 2. Configure env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start Postgres + Redis (via Docker or locally)
docker compose -f docker/docker-compose.yml up -d postgres redis

# 4. Set up the database
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:seed   # optional demo data

# 5. Run both apps
npm run dev
```

| Service        | URL                              |
| -------------- | -------------------------------- |
| Frontend       | http://localhost:3000            |
| Backend API    | http://localhost:4000/api        |
| API docs       | http://localhost:4000/api/docs   |

**Demo login** (after seeding): `alice@novachat.dev` / `Password123!`

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Installation guide](docs/INSTALLATION.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [API reference](docs/API.md)
- [Testing](docs/TESTING.md)
- [Database model](database/README.md)

## 🧪 Scripts

| Command                       | Description                         |
| ----------------------------- | ----------------------------------- |
| `npm run dev`                 | Run backend + frontend concurrently |
| `npm run build`               | Build both apps                     |
| `npm run lint`                | Lint both apps                      |
| `npm test`                    | Run backend tests                   |
| `npm run docker:up` / `:down` | Start / stop the full stack         |

## 📝 License

MIT — see the badge above. NovaChat is an original project and not affiliated with any
existing messaging product.
