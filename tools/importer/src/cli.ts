#!/usr/bin/env node
/**
 * lighterpack-import CLI
 *
 * Commands:
 *   inspect  <source>          Show stats about the source dump (no DB needed)
 *   dry-run  <source>          Transform + write inside a rolled-back transaction
 *   run      <source>          Full import into MariaDB
 *
 * Environment variables (same as the main app):
 *   DB_HOST  DB_PORT  DB_USER  DB_PASSWORD  DB_NAME
 *
 * Usage:
 *   npx tsx src/cli.ts inspect  ./dump
 *   npx tsx src/cli.ts dry-run  ./dump
 *   npx tsx src/cli.ts run      ./dump
 *   npx tsx src/cli.ts run      ./dump --only-user alice
 */

import { readSource } from './read-source.js';
import { transform } from './transform.js';
import { createDb, writeUser, startImportLog, finishImportLog } from './write-mariadb.js';

const [,, command, sourcePath, ...flags] = process.argv;

if (!command || !sourcePath || !['inspect', 'dry-run', 'run'].includes(command)) {
  console.error('Usage: lighterpack-import <inspect|dry-run|run> <source-path> [--only-user <username>]');
  process.exit(1);
}

const onlyUser = (() => {
  const idx = flags.indexOf('--only-user');
  return idx !== -1 ? flags[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// inspect
// ---------------------------------------------------------------------------
async function inspect(source: string): Promise<void> {
  console.log(`\n📦 Inspecting source: ${source}\n`);

  let total = 0, skipped = 0, noLibrary = 0, noEmail = 0, noUsername = 0;
  let totalItems = 0, totalCategories = 0, totalLists = 0;
  const warnings: string[] = [];

  for await (const raw of readSource(source)) {
    total++;
    const result = transform(raw);

    if (result.skipped) {
      skipped++;
      if (result.skipReason?.includes('email'))     noEmail++;
      if (result.skipReason?.includes('username'))  noUsername++;
      console.warn(`  ⚠ Skipped: ${result.skipReason}`);
      continue;
    }

    const user = result.user!;
    if (!user.library.items.length && !user.library.lists.length) noLibrary++;

    totalItems      += user.library.items.length;
    totalCategories += user.library.categories.length;
    totalLists      += user.library.lists.length;

    if (user.warnings.length) {
      warnings.push(...user.warnings.map((w) => `  [${user.username}] ${w}`));
    }
  }

  console.log('─'.repeat(50));
  console.log(`  Users total:       ${total}`);
  console.log(`  Skipped:           ${skipped}  (no email: ${noEmail}, no username: ${noUsername})`);
  console.log(`  Empty libraries:   ${noLibrary}`);
  console.log(`  Items total:       ${totalItems}`);
  console.log(`  Categories total:  ${totalCategories}`);
  console.log(`  Lists total:       ${totalLists}`);
  if (warnings.length) {
    console.log(`\n  ⚠  Warnings (${warnings.length}):`);
    for (const w of warnings.slice(0, 50)) console.log(w);
    if (warnings.length > 50) console.log(`  … and ${warnings.length - 50} more`);
  }
  console.log('─'.repeat(50));
  console.log(`\n✅ Inspect complete. Run "dry-run" to simulate the full import.\n`);
}

// ---------------------------------------------------------------------------
// dry-run / run
// ---------------------------------------------------------------------------
async function runImport(source: string, dryRun: boolean): Promise<void> {
  const label = dryRun ? '🧪 DRY-RUN' : '🚀 IMPORT';
  console.log(`\n${label}: ${source}${onlyUser ? ` (only user: ${onlyUser})` : ''}\n`);

  const db = createDb(process.env);
  const logId = dryRun ? null : await startImportLog(db, source);

  let total = 0, ok = 0, failed = 0;
  const errors: string[] = [];

  for await (const raw of readSource(source)) {
    const result = transform(raw);

    if (result.skipped) {
      console.warn(`  ⚠ Skipped: ${result.skipReason}`);
      continue;
    }

    const user = result.user!;
    if (onlyUser && user.username !== onlyUser.toLowerCase()) continue;

    total++;

    if (user.warnings.length) {
      for (const w of user.warnings) console.warn(`  [${user.username}] ⚠ ${w}`);
    }

    const writeResult = await writeUser(db, user, dryRun);

    if (writeResult.ok) {
      ok++;
      const marker = dryRun ? '(not committed)' : `${writeResult.rowsWritten} rows`;
      console.log(`  ✓ ${user.username.padEnd(32)} ${marker}`);
    } else {
      failed++;
      const msg = `  ✗ ${user.username}: ${writeResult.error}`;
      console.error(msg);
      errors.push(`${user.username}: ${writeResult.error}`);
    }

    if (total % 1000 === 0) {
      console.log(`  … ${total} processed, ${ok} ok, ${failed} failed`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`  Total processed: ${total}`);
  console.log(`  OK:              ${ok}`);
  console.log(`  Failed:          ${failed}`);
  console.log('─'.repeat(50));

  if (!dryRun && logId) {
    await finishImportLog(db, logId, { total, ok, failed }, errors);
  }

  if (dryRun) {
    console.log(`\n✅ Dry-run complete. No data was written. Run "run" to execute.\n`);
  } else {
    const status = failed === 0 ? '✅ Import complete.' : `⚠ Import finished with ${failed} failures.`;
    console.log(`\n${status}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
switch (command) {
  case 'inspect':
    await inspect(sourcePath);
    break;
  case 'dry-run':
    await runImport(sourcePath, true);
    break;
  case 'run':
    await runImport(sourcePath, false);
    break;
}
