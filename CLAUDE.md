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

## ⚠️ CRITICAL — Svelte 5 Event Syntax

This project uses **Svelte 5** (`"svelte": "^5.0.0"`). Event directives were removed.

```svelte
<!-- ✅ CORRECT — Svelte 5 -->
<button onclick={() => doSomething()}>Click</button>
<form onsubmit={(e) => { e.preventDefault(); handle(); }}>
<input oninput={(e) => value = e.currentTarget.value} />
<select onchange={(e) => selected = e.currentTarget.value} />

<!-- ❌ WRONG — Svelte 4 syntax, silently broken in Svelte 5 -->
<button on:click={() => doSomething()}>Click</button>
<form on:submit={...}>
<input on:input={...} />
```

**Rule:** Before writing any Svelte markup, grep for `on:` — if found, replace immediately.
`use:enhance` from `$app/forms` is still valid and must NOT be changed.

---

## ⚠️ CRITICAL — Test Locally Before Deploying

**Mandatory sequence — no exceptions:**

```
1. Write code change
2. Test locally: npm run dev → open http://localhost:5173
3. Verify the specific feature works
4. Fix any errors
5. Only then: git commit + push + VPS deploy
```

**Never deploy without local verification.**

### Local DB setup

`.env` must point to a reachable MariaDB instance.
Default `.env` points to VPS (`DB_HOST=46.224.134.35`) — port 3306 must be accessible.
If not accessible locally, create `.env.local` overriding with a local Docker DB:

```bash
docker compose up -d db   # starts local mariadb on port 3306
npm run db:migrate
npm run dev
```

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
8. **Never use `on:event` Svelte 4 syntax.** Always use `onevent` Svelte 5 syntax.
9. **Never deploy without local test.** Verify in browser first.

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
- **Svelte components:** use `onclick`/`onsubmit` etc. (Svelte 5 event syntax). Props still use `export let` (legacy mode — do NOT migrate to runes `$props()` without explicit instruction).
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

No local Docker needed. The VPS MariaDB is used via SSH tunnel.

### Start SSH tunnel (run once per session, keep open)

```powershell
ssh -N -L 3307:localhost:3306 vps1
# Tunnels local port 3307 → VPS MariaDB port 3306
# Keep this terminal open while developing
```

### Start dev server (separate terminal)

```powershell
cd "d:\KI Agenten Spielplatz\lighterpack-ce"
npm run dev
# → http://localhost:5173  (or 5174 if 5173 is taken)
```

### .env (already configured, do not change)

```
DB_HOST=127.0.0.1
DB_PORT=3307        ← SSH tunnel port
DB_USER=lighterpack
DB_PASSWORD=lighterpack
DB_NAME=lighterpack
ORIGIN=http://localhost:5173
```

**The SSH tunnel must be running before starting `npm run dev`**, otherwise DB calls throw 500.

```bash
# Run unit tests
npm test -- --run

# Type check
npm run check
```
