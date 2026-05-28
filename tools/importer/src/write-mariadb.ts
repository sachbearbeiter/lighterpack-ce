/**
 * Writes one transformed user (and their entire library) into MariaDB.
 *
 * Each user is wrapped in a single transaction — either the full user
 * lands in the DB or nothing does. Idempotent via legacy_id UNIQUE index.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { TransformedUser } from './transform.js';

// Minimal inline schema for the importer — mirrors src/lib/server/db/schema.ts
// We duplicate it here so the importer has zero dependency on the SvelteKit app.
import {
  mysqlTable, varchar, binary, text, int, decimal,
  boolean, datetime, mysqlEnum, json,
} from 'drizzle-orm/mysql-core';

const users = mysqlTable('users', {
  id:             varchar('id', { length: 32 }).primaryKey(),
  username:       varchar('username', { length: 32 }).notNull(),
  email:          varchar('email', { length: 254 }).notNull(),
  passwordHash:   varchar('password_hash', { length: 255 }),
  passwordStatus: mysqlEnum('password_status', ['active', 'must_reset', 'imported_no_password']).notNull().default('active'),
  createdAt:      datetime('created_at').notNull(),
  legacyId:       varchar('legacy_id', { length: 64 }),
});

const libraries = mysqlTable('libraries', {
  id:             varchar('id', { length: 32 }).primaryKey(),
  userId:         varchar('user_id', { length: 32 }).notNull(),
  totalUnit:      varchar('total_unit', { length: 4 }).notNull().default('oz'),
  itemUnit:       varchar('item_unit', { length: 4 }).notNull().default('oz'),
  currencySymbol: varchar('currency_symbol', { length: 4 }).notNull().default('$'),
  optionalFields: json('optional_fields'),
  version:        int('version').notNull().default(0),
  updatedAt:      datetime('updated_at').notNull(),
  legacyId:       varchar('legacy_id', { length: 64 }),
});

const items = mysqlTable('items', {
  id:          varchar('id', { length: 32 }).primaryKey(),
  libraryId:   varchar('library_id', { length: 32 }).notNull(),
  name:        varchar('name', { length: 512 }).notNull().default(''),
  description: text('description'),
  weightMg:    int('weight_mg').notNull().default(0),
  authorUnit:  varchar('author_unit', { length: 4 }).notNull().default('oz'),
  price:       decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  url:         varchar('url', { length: 2048 }),
  image:       varchar('image', { length: 2048 }),
  imageUrl:    varchar('image_url', { length: 2048 }),
  legacyId:    varchar('legacy_id', { length: 64 }),
});

const categories = mysqlTable('categories', {
  id:        varchar('id', { length: 32 }).primaryKey(),
  libraryId: varchar('library_id', { length: 32 }).notNull(),
  name:      varchar('name', { length: 512 }).notNull().default(''),
  color:     json('color'),
  sortOrder: int('sort_order').notNull().default(0),
  legacyId:  varchar('legacy_id', { length: 64 }),
});

const categoryItems = mysqlTable('category_items', {
  id:         varchar('id', { length: 32 }).primaryKey(),
  categoryId: varchar('category_id', { length: 32 }).notNull(),
  itemId:     varchar('item_id', { length: 32 }).notNull(),
  qty:        int('qty').notNull().default(1),
  worn:       boolean('worn').notNull().default(false),
  consumable: boolean('consumable').notNull().default(false),
  star:       int('star').notNull().default(0),
  sortOrder:  int('sort_order').notNull().default(0),
});

const lists = mysqlTable('lists', {
  id:          varchar('id', { length: 32 }).primaryKey(),
  libraryId:   varchar('library_id', { length: 32 }).notNull(),
  name:        varchar('name', { length: 512 }).notNull().default(''),
  externalId:  varchar('external_id', { length: 32 }),
  description: text('description'),
  isPublic:    boolean('is_public').notNull().default(false),
  sortOrder:   int('sort_order').notNull().default(0),
  legacyId:    varchar('legacy_id', { length: 64 }),
});

const listCategories = mysqlTable('list_categories', {
  id:         varchar('id', { length: 32 }).primaryKey(),
  listId:     varchar('list_id', { length: 32 }).notNull(),
  categoryId: varchar('category_id', { length: 32 }).notNull(),
  sortOrder:  int('sort_order').notNull().default(0),
});

const importLog = mysqlTable('import_log', {
  id:               varchar('id', { length: 32 }).primaryKey(),
  sourceIdentifier: varchar('source_identifier', { length: 255 }).notNull(),
  startedAt:        datetime('started_at').notNull(),
  finishedAt:       datetime('finished_at'),
  status:           mysqlEnum('status', ['running', 'success', 'partial', 'failed']).notNull().default('running'),
  usersTotal:       int('users_total').notNull().default(0),
  usersOk:          int('users_ok').notNull().default(0),
  usersFailed:      int('users_failed').notNull().default(0),
  errorLog:         text('error_log'),
});

// ---------------------------------------------------------------------------
// DB connection factory
// ---------------------------------------------------------------------------
export function createDb(env: NodeJS.ProcessEnv) {
  const pool = mysql.createPool({
    host:     env.DB_HOST ?? 'localhost',
    port:     Number(env.DB_PORT ?? 3306),
    user:     env.DB_USER ?? 'lighterpack',
    password: env.DB_PASSWORD ?? 'lighterpack',
    database: env.DB_NAME ?? 'lighterpack',
    waitForConnections: true,
    connectionLimit: 5,
  });
  return drizzle(pool, { mode: 'default' });
}

type Db = ReturnType<typeof createDb>;
/** Minimal interface satisfied by both MySql2Database and MySqlTransaction */
type TxDb = { execute: (query: SQL) => Promise<unknown> };

function newId(): string {
  return uuidv7().replace(/-/g, '');
}

// ---------------------------------------------------------------------------
// Write one user — full transaction
// ---------------------------------------------------------------------------
export interface WriteResult {
  ok: boolean;
  error?: string;
  rowsWritten: number;
}

export async function writeUser(db: Db, user: TransformedUser, dryRun: boolean): Promise<WriteResult> {
  try {
    let rowsWritten = 0;

    const run = async (tx: TxDb) => {
      const now = new Date();
      const userId    = newId();
      const libraryId = newId();

      // --- User ---
      await tx.execute(sql`
        INSERT INTO users (id, username, email, password_hash, password_status, created_at, legacy_id)
        VALUES (${userId}, ${user.username}, ${user.email}, NULL, 'must_reset', ${now}, ${user.legacyId})
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          email    = VALUES(email)
      `);
      rowsWritten++;

      // --- Library ---
      await tx.execute(sql`
        INSERT INTO libraries (id, user_id, total_unit, item_unit, currency_symbol, optional_fields, version, updated_at, legacy_id)
        VALUES (
          ${libraryId}, ${userId},
          ${user.library.totalUnit}, ${user.library.itemUnit}, ${user.library.currencySymbol},
          ${JSON.stringify(user.library.optionalFields)},
          0, ${now}, ${user.legacyId + ':lib'}
        )
        ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
      `);
      rowsWritten++;

      // Track item legacy_id → new DB id for category_items resolution
      const itemLegacyToId = new Map<string, string>();

      // --- Items ---
      for (const item of user.library.items) {
        const itemId = newId();
        await tx.execute(sql`
          INSERT INTO items (id, library_id, name, description, weight_mg, author_unit, price, url, image, image_url, legacy_id)
          VALUES (
            ${itemId}, ${libraryId},
            ${item.name}, ${item.description || null}, ${item.weightMg},
            ${item.authorUnit}, ${item.price},
            ${item.url || null}, ${item.image || null}, ${item.imageUrl || null},
            ${item.legacyId}
          )
          ON DUPLICATE KEY UPDATE
            name       = VALUES(name),
            weight_mg  = VALUES(weight_mg),
            author_unit= VALUES(author_unit)
        `);
        itemLegacyToId.set(item.legacyId, itemId);
        rowsWritten++;
      }

      // --- Categories + category_items ---
      const catLegacyToId = new Map<string, string>();
      for (const cat of user.library.categories) {
        const catId = newId();
        await tx.execute(sql`
          INSERT INTO categories (id, library_id, name, color, sort_order, legacy_id)
          VALUES (${catId}, ${libraryId}, ${cat.name}, ${JSON.stringify(cat.color)}, ${cat.sortOrder}, ${cat.legacyId})
          ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)
        `);
        catLegacyToId.set(cat.legacyId, catId);
        rowsWritten++;

        for (const [ciIdx, ci] of cat.categoryItems.entries()) {
          const resolvedItemId = itemLegacyToId.get(ci.itemLegacyId);
          if (!resolvedItemId) continue; // already warned in transform step
          await tx.execute(sql`
            INSERT INTO category_items (id, category_id, item_id, qty, worn, consumable, star, sort_order)
            VALUES (${newId()}, ${catId}, ${resolvedItemId}, ${ci.qty}, ${ci.worn}, ${ci.consumable}, ${ci.star}, ${ciIdx})
            ON DUPLICATE KEY UPDATE qty = VALUES(qty)
          `);
          rowsWritten++;
        }
      }

      // --- Lists + list_categories ---
      for (const [listIdx, list] of user.library.lists.entries()) {
        const listId = newId();
        await tx.execute(sql`
          INSERT INTO lists (id, library_id, name, external_id, description, is_public, sort_order, legacy_id)
          VALUES (
            ${listId}, ${libraryId},
            ${list.name}, ${list.externalId || null}, ${list.description || null},
            FALSE, ${listIdx}, ${list.legacyId}
          )
          ON DUPLICATE KEY UPDATE name = VALUES(name), external_id = VALUES(external_id)
        `);
        rowsWritten++;

        for (const [lcIdx, catLegacyId] of list.categoryLegacyIds.entries()) {
          const catId = catLegacyToId.get(catLegacyId);
          if (!catId) continue;
          await tx.execute(sql`
            INSERT INTO list_categories (id, list_id, category_id, sort_order)
            VALUES (${newId()}, ${listId}, ${catId}, ${lcIdx})
            ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
          `);
          rowsWritten++;
        }
      }
    };

    if (dryRun) {
      // Simulate the transaction without committing — rollback by throwing after run()
      await db.transaction(async (tx) => { await run(tx); throw new Error('DRY_RUN_ROLLBACK'); });
    } else {
      await db.transaction(run);
    }

    return { ok: true, rowsWritten };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'DRY_RUN_ROLLBACK') {
      return { ok: true, rowsWritten: 0 };
    }
    return { ok: false, error: String(err), rowsWritten: 0 };
  }
}

// ---------------------------------------------------------------------------
// Import log helpers
// ---------------------------------------------------------------------------
export async function startImportLog(db: Db, source: string): Promise<string> {
  const id = newId();
  await db.insert(importLog).values({
    id, sourceIdentifier: source, startedAt: new Date(),
    status: 'running', usersTotal: 0, usersOk: 0, usersFailed: 0,
  });
  return id;
}

export async function finishImportLog(
  db: Db,
  logId: string,
  counts: { total: number; ok: number; failed: number },
  errors: string[]
): Promise<void> {
  await db.execute(sql`
    UPDATE import_log SET
      finished_at  = ${new Date()},
      status       = ${counts.failed === 0 ? 'success' : counts.ok === 0 ? 'failed' : 'partial'},
      users_total  = ${counts.total},
      users_ok     = ${counts.ok},
      users_failed = ${counts.failed},
      error_log    = ${errors.length ? errors.slice(0, 500).join('\n') : null}
    WHERE id = ${logId}
  `);
}
