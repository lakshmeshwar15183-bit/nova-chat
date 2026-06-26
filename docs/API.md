# API reference

Base URL: `http://localhost:4000/api` · Interactive docs (Swagger): `/api/docs`

All successful responses are wrapped:

```json
{ "success": true, "data": { /* ... */ }, "timestamp": "2025-01-01T00:00:00.000Z" }
```

Errors:

```json
{ "success": false, "statusCode": 400, "error": "BadRequest", "message": "…", "path": "/api/…" }
```

Authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Authentication — `/auth`

| Method | Path                    | Body                                   | Notes                          |
| ------ | ----------------------- | -------------------------------------- | ------------------------------ |
| POST   | `/auth/register`        | email, username, displayName, password | Sends OTP                      |
| POST   | `/auth/login`           | identifier, password                   | Sets refresh cookie            |
| POST   | `/auth/verify-email`    | email, code                            | Returns tokens                 |
| POST   | `/auth/resend-otp`      | email                                  |                                |
| POST   | `/auth/forgot-password` | email                                  |                                |
| POST   | `/auth/reset-password`  | email, code, newPassword               |                                |
| POST   | `/auth/refresh`         | (cookie or refreshToken)               | Rotates tokens                 |
| POST   | `/auth/logout`          | —                                      | 🔒                             |
| GET    | `/auth/sessions`        | —                                      | 🔒 list active sessions        |
| DELETE | `/auth/sessions/:id`    | —                                      | 🔒 revoke a session            |
| GET    | `/auth/google`          | —                                      | OAuth redirect                 |

## Users — `/users`

| Method | Path                  | Notes                          |
| ------ | --------------------- | ------------------------------ |
| GET    | `/users/me`           | Current user + settings        |
| GET    | `/users/search?q=`    | Search users                   |
| GET    | `/users/:id`          | Public profile (privacy-aware) |
| PATCH  | `/users/me/profile`   | displayName, bio, avatarUrl    |
| PATCH  | `/users/me/privacy`   | privacy levels, read receipts  |

## Contacts — `/contacts`

`GET /` · `GET /blocked` · `POST /` · `POST /block` · `POST /unblock` · `DELETE /:targetId`

## Conversations — `/conversations`

`GET /?archived=` · `POST /direct` · `GET /:id` · `PATCH /:id/state` (pin/archive/mute) ·
`POST /:id/read`

## Messages

| Method | Path                                       | Notes                |
| ------ | ------------------------------------------ | -------------------- |
| GET    | `/conversations/:id/messages?cursor=&limit=` | Paginated history  |
| POST   | `/conversations/:id/messages`              | content, attachments, replyToId |
| PATCH  | `/messages/:id`                            | Edit                 |
| DELETE | `/messages/:id/me`                         | Delete for me        |
| DELETE | `/messages/:id/everyone`                   | Delete for everyone  |
| POST   | `/messages/:id/forward`                    | conversationIds[]    |
| POST   | `/messages/:id/react`                      | emoji                |
| POST   | `/messages/:id/star`                       | Toggle star          |
| POST   | `/messages/:id/pin`                        | Toggle pin           |
| GET    | `/conversations/:id/pinned`                | Pinned messages      |
| GET    | `/messages/:id/history`                    | Edit history         |
| GET    | `/messages/starred`                        | Starred messages     |

### Editing with optimistic locking

`PATCH /messages/:id` accepts an optional `version`. If supplied and it does not
match the server's current version, the API responds `409 Conflict` so the client
can refetch and retry — preventing lost updates.

## Drafts

| Method | Path                                  | Notes                    |
| ------ | ------------------------------------- | ------------------------ |
| GET    | `/drafts`                             | All of the user's drafts |
| GET    | `/conversations/:id/draft`            | Draft for a conversation |
| PUT    | `/conversations/:id/draft`            | Save (empty clears it)   |
| DELETE | `/conversations/:id/draft`            | Delete                   |

## Scheduled messages

| Method | Path                                          | Notes                          |
| ------ | --------------------------------------------- | ------------------------------ |
| GET    | `/scheduled-messages`                         | Pending scheduled messages     |
| POST   | `/conversations/:id/scheduled-messages`       | `content`, `scheduledFor` (ISO)|
| DELETE | `/scheduled-messages/:id`                     | Cancel a pending message       |

A 30-second cron dispatcher sends due messages through the normal realtime pipeline.

## Polls

| Method | Path                              | Notes                                  |
| ------ | --------------------------------- | -------------------------------------- |
| POST   | `/conversations/:id/polls`        | `question`, `options[]`, `allowMultiple`, `closesInSeconds` |
| GET    | `/polls/:id`                      | Results with per-option counts/percent |
| POST   | `/polls/:id/vote`                 | `optionIds[]`                          |
| POST   | `/polls/:id/close`                | Close (creator only)                   |

## Link previews

`GET /link-preview?url=` — fetches Open Graph metadata (title/description/image/
siteName) with Redis caching, request timeout and byte limits.

## Audit

`GET /audit/me` — the authenticated user's own activity log (paginated).

## Groups — `/groups`

`POST /` · `GET /:id` · `PATCH /:id` · `POST /:id/members` · `DELETE /:id/members/:memberId` ·
`PATCH /:id/members/:memberId/role` · `POST /:id/leave` · `POST /:id/invites` ·
`DELETE /:id/invites/:inviteId` · `POST /join/:code`

## Uploads — `/uploads`

`POST /avatar` · `POST /media` · `POST /media/batch` (multipart `file` / `files`)

## Search — `/search`

`GET /?q=` (all) · `GET /messages?q=` · `GET /media/:conversationId`

## Notifications — `/notifications`

`GET /` · `GET /count` · `POST /:id/read` · `POST /read-all` · `POST /devices`

## Settings — `/settings`

`GET /` · `PATCH /` (theme, language, notification & chat preferences)

---

## WebSocket events (Socket.IO)

Connect to the backend origin with `auth: { token: <accessToken> }`.

| Direction        | Event                | Payload                                  |
| ---------------- | -------------------- | ---------------------------------------- |
| server → client  | `message_received`   | Message                                  |
| server → client  | `message_updated`    | Message                                  |
| server → client  | `message_deleted`    | `{ conversationId, messageId }`          |
| server → client  | `message_reaction`   | `{ messageId, reactions }`               |
| server → client  | `message_pinned` / `message_unpinned` | `{ messageId }`         |
| server → client  | `poll_updated`       | `{ messageId, poll }`                    |
| client → server  | `typing` / `stop_typing` | `{ conversationId }`                 |
| client → server  | `mark_read`          | `{ conversationId }`                     |
| server → client  | `read_receipt`       | `{ conversationId, userId, readAt }`     |
| server → client  | `user_online` / `user_offline` | `{ userId, lastSeenAt? }`      |
| client → server  | `join_conversation`  | `{ conversationId }`                     |
| both             | `call_started` / `call_signal` / `call_ended` | WebRTC signaling        |
| server → client  | `notification`       | Notification                             |
