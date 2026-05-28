# Claude AI Instructions — lighterpack-ce

This file contains standing instructions for AI assistants (Claude, GitHub Copilot, etc.)
working on this repository. Read this file before making any changes.

---

## Project Overview

**lighterpack-ce** is a clean-room rewrite of [galenmaly/lighterpack](https://github.com/galenmaly/lighterpack)
as a self-hostable community edition.

**Stack:**
- **Frontend + Backend:** SvelteKit 2 (Node adapter), TypeScript, Svelte 5
- **Database:** MariaDB 11 via Drizzle ORM (mysql2 driver)
- **Auth:** argon2id via `@node-rs/argon2`, sessions as SHA-256 token hashes
- **IDs:** UUIDv7 hex strings (stored as `BINARY(16)`, represented as hex in TS)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Styling:** open-props + @fontsource-variable/inter, hand-crafted Svelte components

**Reference repo:** `upstream` remote points to `galenmaly/lighterpack` (read-only reference).

---

## Non-Negotiable Rules

1. **All code comments in English.** No German in source files.
2. **All commit messages in English**, using Conventional Commits format:
   `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`
3. **No `eval()` anywhere.** No exceptions.
4. **No legacy auth code.** No SHA3, no `crypto-js`, no bcrypt. argon2id only.
5. **No `mongojs`, `request`, `mailgun-js`, `formidable@1`.** Use modern equivalents.
6. **`npm run check` must pass (0 errors) before every commit.**
7. **`npm test -- --run` must pass (all green) before every commit.**

---

## Architecture Decisions (Already Made — Do Not Revisit)

| Decision | Choice | Reason |
|---|---|---|
| Framework | SvelteKit + TypeScript | Modern, fullstack, SSR for share pages |
| Database | MariaDB 11 + Drizzle ORM | Relational schema, easy self-hosting |
| Password hashing | argon2id (`@node-rs/argon2`) | OWASP best practice, no native build tools needed |
| Primary keys | UUIDv7 hex strings | Time-sortable, compact, no binary/Buffer confusion |
| Session storage | Token hash in `sessions` table | Token only in HttpOnly cookie, never in DB |
| Password reset | Token link (30 days TTL, single-use) | No plaintext passwords in emails |
| Imported users | `password_status = 'must_reset'` | Clean code, no legacy hash path in production |
| Styling base | open-props + Inter font | Lightweight, no framework lock-in |
| Build tool | Vite (via SvelteKit) | Fast dev server, no Webpack |
| Charts | Hand-crafted SVG/Canvas component | No heavy chart library dependency |

---

## Project Structure

```
src/
  app.css              Global styles (open-props, Inter font)
  app.html             HTML shell
  app.d.ts             SvelteKit type augmentation (Locals)
  hooks.server.ts      Session validation on every request
  lib/
    validation.ts      Shared input validation helpers
    domain/            Pure TypeScript business logic (no I/O, no framework)
      weight.ts        Weight unit conversions (mg as internal unit)
      weight.test.ts
      color.ts         Color utilities
      color.test.ts
    server/
      auth.ts          Auth service (register, signin, session, password-reset)
      db/
        client.ts      Drizzle DB connection pool
        schema.ts      Full Drizzle schema (all tables)
  routes/
    api/               JSON REST endpoints (+server.ts files)
    app/               Authenticated app routes (dashboard, list editor)
    r/[externalId]/    Public share pages (SSR, SEO-friendly)
    (auth)/            Sign-in / register / forgot-password pages
tools/
  importer/            Standalone CLI — MongoDB dump → MariaDB migration
drizzle/               Drizzle migration files (auto-generated, do not edit)
tests/                 Playwright e2e tests
docker/                Dockerfile
docker-compose.yml     MariaDB 11 + app service
```

---

## Database Conventions

- All IDs: `BINARY(16)` in MariaDB, `string` (32-char hex) in TypeScript. Use `uuidv7().replace(/-/g, '')`.
- Weights: stored as `INT` milligrams (`weight_mg`). Display conversion via `src/lib/domain/weight.ts`.
- Prices: `DECIMAL(10,2)` — never use floats for money.
- Timestamps: `DATETIME` columns, always `new Date()` in TS (UTC).
- `legacy_id VARCHAR(64)`: present on all imported tables. Stores the original MongoDB ObjectId.
  Used for import idempotency only. Do not reference in app code.
- Concurrency: `libraries.version INT` — optimistic locking.
  `UPDATE … SET version = version + 1 WHERE id = ? AND version = ?`
  If `rowsAffected === 0`, raise a conflict error.

---

## Auth Flow

```
Register  →  hash password (argon2id)  →  insert user + library  →  createSession  →  set cookie
Signin    →  find user  →  verify hash  →  createSession  →  set cookie
Request   →  hooks.server.ts reads cookie  →  validateSession  →  locals.userId / locals.username
Signout   →  deleteSession  →  clear cookie
Reset     →  createPasswordReset (token in DB)  →  send email with /reset-password?token=…
           →  consumePasswordReset  →  re-hash with argon2id  →  set password_status='active'
```

---

## Importer (tools/importer/)

The importer is a **standalone CLI** tool. It is never imported by the app server.

- Input: MongoDB dump (BSON directory from `mongodump` OR JSON array export)
- Three commands: `inspect`, `dry-run`, `run`
- One DB transaction per user — atomic, no half-imports
- Idempotent via `INSERT … ON DUPLICATE KEY UPDATE` on `legacy_id`
- Imported users get `password_status = 'must_reset'`, no password hash
- See `docs/plan-svelte-community-edition.md` Phase 3 for full spec

---

## Coding Style

- **TypeScript strict mode.** No implicit `any`. No `as any` except documented edge cases.
- **No default exports** for utilities and services. Named exports only.
- **Svelte components:** use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
- **Server-side code** lives in `src/lib/server/` or `+page.server.ts` / `+server.ts`.
  Never import server code in client-side files.
- **Domain logic** (`src/lib/domain/`) must have zero framework dependencies and zero I/O.
  It must be importable in Node (Vitest) and browser (Svelte components) alike.
- Error responses: always `{ errors: Array<{ field?: string; message: string }> }`.
- Success responses: always `{ ok: true, ...data }` or the data object directly.

---

## What NOT to Do

- Do not add Vuex, Redux, or any global state manager. Use Svelte stores or SvelteKit load functions.
- Do not add Prisma. Drizzle is the ORM — do not add a second one.
- Do not add `axios` on the server side. Use native `fetch` (Node 18+ built-in).
- Do not store session tokens in plain text in the database.
- Do not send plaintext passwords in emails.
- Do not use `Buffer` for IDs — use hex strings.
- Do not write migrations by hand — use `npm run db:generate` then review the output.
- Do not commit `.env` files.

---

## Running Locally

```bash
# 1. Start MariaDB
docker compose up -d db

# 2. Copy and fill in env
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Run migrations
npm run db:migrate

# 5. Start dev server
npm run dev

# Run unit tests
npm test -- --run

# Type check
npm run check
```
