# Architecture

NovaChat is a modular monorepo split into an API/realtime backend and a web frontend,
backed by PostgreSQL and Redis.

## High-level diagram

```
                     ┌──────────────────────────────┐
                     │           Nginx               │  (reverse proxy)
                     │  /  /api  /socket.io /uploads │
                     └───────────────┬───────────────┘
                 ┌───────────────────┴────────────────────┐
                 │                                          │
        ┌────────▼─────────┐                     ┌──────────▼──────────┐
        │  Next.js (web)   │  REST + WebSocket   │   NestJS (backend)  │
        │  React Query     │ ◄─────────────────► │   REST controllers  │
        │  Zustand stores  │                     │   Socket.IO gateway │
        └──────────────────┘                     └──────────┬──────────┘
                                                            │
                                       ┌────────────────────┼─────────────────────┐
                                       │                    │                     │
                                ┌──────▼──────┐      ┌───────▼──────┐      ┌───────▼──────┐
                                │ PostgreSQL  │      │    Redis     │      │  Supabase    │
                                │  (Prisma)   │      │ presence/    │      │  Storage     │
                                │             │      │ cache/pubsub │      │  (media)     │
                                └─────────────┘      └──────────────┘      └──────────────┘
```

## Backend (NestJS)

Organised by feature module, each owning its controller, service and DTOs.

```
backend/src/
├── common/            # cross-cutting: Prisma, Redis, Mail, filters, interceptors, decorators
├── config/            # typed configuration + env validation
├── modules/
│   ├── auth/          # register/login/OTP/OAuth, JWT + refresh, sessions
│   ├── users/         # profile, privacy, user search
│   ├── contacts/      # add / block / unblock
│   ├── conversations/ # direct + group conversation state
│   ├── messages/      # send/edit/delete/forward/react/star
│   ├── groups/        # roles, members, invite links
│   ├── uploads/       # Supabase / local storage
│   ├── search/        # cross-entity search
│   ├── notifications/ # in-app + device registration
│   ├── settings/      # preferences
│   ├── realtime/      # RealtimeService facade (decouples REST from sockets)
│   └── chat/          # Socket.IO gateway
└── main.ts
```

### Design principles

- **Clean architecture & SOLID** — controllers stay thin; business logic lives in services;
  persistence is isolated behind Prisma.
- **Decoupled realtime** — REST services never import the gateway. They emit through
  `RealtimeService`, which the gateway populates with the Socket.IO server at init. This
  removes circular dependencies and keeps the transport swappable.
- **Consistent contracts** — a global interceptor wraps every success response in
  `{ success, data, timestamp }`; a global filter normalises all errors.
- **Security in depth** — Helmet, throttling (global + per-route), `ValidationPipe` with
  whitelisting, bcrypt hashing, hashed & revocable refresh tokens.

## Frontend (Next.js App Router)

```
frontend/src/
├── app/               # routes (landing, auth, /chat, /settings, /profile, /groups, /search)
├── components/        # ui primitives + chat components
├── hooks/             # use-auth, use-socket, use-conversations, use-messages
├── lib/               # api client, services, socket, types, utils
└── store/             # Zustand stores (auth, chat)
```

- **State** — server state via React Query; ephemeral realtime state (messages, typing,
  presence) via Zustand, updated by the single `useSocket` hook.
- **Auth** — access token in memory/localStorage; the refresh token lives in an httpOnly
  cookie and is rotated transparently by an Axios response interceptor on `401`.
- **Responsive** — mobile-first master/detail layout; the conversation list and chat window
  swap on small screens.

## Realtime model

- On connect the gateway authenticates the JWT from the handshake, joins the socket to a
  per-user room and every conversation room the user belongs to.
- Presence is reference-counted in Redis (a user may have multiple tabs/devices). The last
  socket leaving flips the user offline and stamps `lastSeenAt`.
- Message lifecycle events (`message_received`, `message_updated`, `message_deleted`,
  `message_reaction`), typing, read receipts and WebRTC call signaling all flow through
  rooms. Media never traverses the gateway — only SDP/ICE signaling does.

## Data model

See [database/README.md](../database/README.md) for the full ERD and table-by-table notes.
