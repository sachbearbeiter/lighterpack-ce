# lighterpack-ce Importer

Standalone CLI to migrate a legacy lighterpack MongoDB dump into a lighterpack-ce MariaDB database.

## Prerequisites

- Node.js 18+
- A running lighterpack-ce MariaDB instance (migrations already applied)
- A MongoDB dump of the legacy database

## Setup

```bash
cd tools/importer
npm install
```

## Commands

### 1. `inspect` — analyse the dump without touching the DB

```bash
npx tsx src/cli.ts inspect ./path/to/dump
```

Shows: user count, skipped users (missing email/username), total items/categories/lists, warnings.
**No database connection required.**

### 2. `dry-run` — simulate the full import

```bash
DB_HOST=localhost DB_USER=lighterpack DB_PASSWORD=lighterpack DB_NAME=lighterpack \
  npx tsx src/cli.ts dry-run ./path/to/dump
```

Runs every transformation and DB write inside a rolled-back transaction.
Shows what would be written. **Nothing is persisted.**

### 3. `run` — execute the import

```bash
DB_HOST=localhost DB_USER=lighterpack DB_PASSWORD=lighterpack DB_NAME=lighterpack \
  npx tsx src/cli.ts run ./path/to/dump
```

Imports all users. One transaction per user — atomic, no half-imports.

#### Import a single user only

```bash
npx tsx src/cli.ts run ./path/to/dump --only-user alice
```

## Accepted input formats

| Format | Description |
|---|---|
| `./dump/` | Directory from `mongodump` — must contain `users.bson` or `users.json` |
| `./users.bson` | Raw BSON file |
| `./users.json` | JSON array of user documents |

## Imported user state

All imported users receive `password_status = 'must_reset'`. They cannot log in until they
set a new password via the forgot-password flow. **No legacy passwords are imported.**

This is intentional — the new system uses argon2id, not bcrypt+SHA3.

## Idempotency

The importer uses `INSERT … ON DUPLICATE KEY UPDATE` on the `legacy_id` column.
Running it twice produces the same result. Safe to re-run after partial failures.

## Environment variables

Same as the main app:

```
DB_HOST      (default: localhost)
DB_PORT      (default: 3306)
DB_USER      (default: lighterpack)
DB_PASSWORD  (default: lighterpack)
DB_NAME      (default: lighterpack)
```
