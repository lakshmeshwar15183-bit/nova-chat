# Changelog

All notable changes to NovaChat are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
semantic versioning.

## [Unreleased]

### Added
- **Data hardening** — `Message.version` (optimistic locking), `Message.deletedAt`
  (soft delete) and `Message.expiresAt` (disappearing messages); new indexes for
  hot read paths.
- **Audit logs** — immutable `AuditLog` model, `AuditService`, an automatic
  `AuditInterceptor` that records every successful state-changing request, and a
  `GET /api/audit/me` endpoint for per-user activity transparency.
- **Pinned messages** — `POST /api/messages/:id/pin` (toggle) and
  `GET /api/conversations/:id/pinned`.
- **Message edit history + optimistic locking** — every edit snapshots the previous
  content (`GET /api/messages/:id/history`) and updates are version-guarded to
  prevent lost updates.
- **Mentions** — `@username` parsing on send, persisted `Mention` rows and
  notifications to mentioned conversation participants.
- **Drafts** — auto-saved per-conversation drafts
  (`PUT/GET/DELETE /api/conversations/:id/draft`, `GET /api/drafts`).
- **Scheduled messages** — schedule a message for future delivery
  (`POST /api/conversations/:id/scheduled-messages`) with a 30s cron dispatcher
  that sends through the normal realtime pipeline; list and cancel supported.
- **Polls** — create polls (`POST /api/conversations/:id/polls`), vote
  (single/multiple), live results with percentages, and close
  (`/api/polls/:id`, `/vote`, `/close`).
- **Link previews** — `GET /api/link-preview?url=` fetches Open Graph metadata with
  Redis caching, byte limits and timeouts.
- **New schema entities** — `Draft`, `ScheduledMessage`, `Poll` / `PollOption` /
  `PollVote`, `Mention` and `MessageEditHistory`; `POLL` message type.
- **Security hardening** — response `compression`, an origin-based `CsrfGuard`
  applied globally, and an input-sanitization (`@Sanitize()`) transform for stored
  message content (defence-in-depth against stored XSS).

### Changed
- Registered `CsrfGuard` as a global guard alongside the existing rate limiter.

### Frontend
- **Loading skeletons** — shimmering placeholders for the conversation list and
  message view; **empty states** and **error states** as reusable components.
- **Glassmorphism** — `glass` / `glass-strong` utilities and a blurred modal
  backdrop.
- **Realtime resilience** — exponential-backoff reconnection, token re-auth on
  reconnect, browser online/offline detection, an unobtrusive connection banner,
  and offline sync (conversations refetch + room re-join on reconnect).
- **Keyboard shortcuts** — `⌘/Ctrl+K` to search, `Esc` to deselect a chat,
  `⌘/Ctrl+N` for a new chat.
- **Drafts UI** — the composer auto-saves a per-conversation draft (debounced) and
  restores it when you reopen the chat; cleared on send.
- **Pinned messages UI** — a "Pin/Unpin" action in the message menu and a live
  pinned-messages banner at the top of the conversation (cycles through pins).
- **Interactive polls UI** — create polls from the composer, vote (single or
  multiple choice), and see live results with percentage bars that update in real
  time via `poll_updated`.

### Internal
- Extracted a shared `messagePreview()` helper (used by the conversation list,
  pinned banner and notifications) to remove duplicated preview logic.
- Backend message payloads now include `pollId` so poll messages can resolve their
  results; `no-unused-vars` lint rule tuned (`ignoreRestSiblings`) — backend lint is
  warning-free.

## [1.0.0] - Initial release

### Added
- Full real-time messaging platform: NestJS backend, Next.js frontend,
  PostgreSQL + Prisma, Redis, Socket.IO.
- Auth (email/password, OTP verification, Google OAuth, JWT + rotating refresh
  tokens, multi-device sessions), conversations, group chat, media uploads,
  search, notifications, settings.
- Docker/Compose/Nginx, GitHub Actions CI, and full documentation.
