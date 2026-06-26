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
- **New schema entities** — `Draft`, `ScheduledMessage`, `Poll` / `PollOption` /
  `PollVote`, `Mention` and `MessageEditHistory`.
- **Security hardening** — response `compression`, an origin-based `CsrfGuard`
  applied globally, and an input-sanitization (`@Sanitize()`) transform for stored
  message content (defence-in-depth against stored XSS).

### Changed
- Registered `CsrfGuard` as a global guard alongside the existing rate limiter.

## [1.0.0] - Initial release

### Added
- Full real-time messaging platform: NestJS backend, Next.js frontend,
  PostgreSQL + Prisma, Redis, Socket.IO.
- Auth (email/password, OTP verification, Google OAuth, JWT + rotating refresh
  tokens, multi-device sessions), conversations, group chat, media uploads,
  search, notifications, settings.
- Docker/Compose/Nginx, GitHub Actions CI, and full documentation.
