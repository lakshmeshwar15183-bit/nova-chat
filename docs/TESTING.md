# Testing

## Backend (Jest)

```bash
npm --workspace backend test          # run unit tests
npm --workspace backend run test:watch
npm --workspace backend run test:cov  # coverage report → backend/coverage
```

Jest is configured in `backend/package.json` (ts-jest, `@/*` path alias, `node` environment).
Test files live next to the code they cover as `*.spec.ts`.

Included examples:

- `common/interceptors/transform.interceptor.spec.ts` — verifies the response envelope.
- `modules/auth/tokens.service.spec.ts` — token issuance & refresh rotation, using an
  in-memory fake of the Prisma session table (no database required).

### Writing service tests without a database

Services receive their dependencies via the constructor, so you can pass lightweight fakes
or `jest.fn()` mocks for `PrismaService` / `RedisService`. For tests that genuinely need a
database, point `DATABASE_URL` at a disposable Postgres (the CI workflow spins one up as a
service container) and run `prisma migrate deploy` first.

## End-to-end (optional)

A Nest e2e harness can be added under `backend/test/` and run with:

```bash
npm --workspace backend run test:e2e
```

Use `@nestjs/testing`'s `Test.createTestingModule({ imports: [AppModule] })` against the CI
Postgres + Redis services.

## Frontend

```bash
npm --workspace frontend run typecheck   # strict TypeScript checks
npm --workspace frontend run lint        # ESLint (next/core-web-vitals)
npm --workspace frontend run build       # production build (also type-checks)
```

Component/interaction tests can be added with React Testing Library + Vitest; mock the API
layer in `src/lib/services.ts` and the socket in `src/lib/socket.ts`.

## Continuous integration

Every push and PR to `main` runs lint, typecheck, build and tests for both apps plus a Docker
image build — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
