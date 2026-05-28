/**
 * Reads a MongoDB dump — either:
 *   - A JSON file containing an array of user documents
 *   - A BSON file produced by `mongodump`
 *   - A directory containing BSON + metadata files from `mongodump`
 *
 * Returns an async iterable of raw MongoUser objects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { BSON } from 'bson';
import type { MongoUser } from './types.js';

export async function* readSource(sourcePath: string): AsyncIterable<MongoUser> {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    // mongodump directory — look for users.bson
    const bsonPath = path.join(sourcePath, 'users.bson');
    const jsonPath = path.join(sourcePath, 'users.json');

    if (fs.existsSync(bsonPath)) {
      yield* readBsonFile(bsonPath);
    } else if (fs.existsSync(jsonPath)) {
      yield* readJsonFile(jsonPath);
    } else {
      throw new Error(`No users.bson or users.json found in directory: ${sourcePath}`);
    }
    return;
  }

  // Single file — detect by extension
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.bson') {
    yield* readBsonFile(sourcePath);
  } else if (ext === '.json') {
    yield* readJsonFile(sourcePath);
  } else {
    throw new Error(`Unknown file type: ${sourcePath}. Expected .bson or .json`);
  }
}

async function* readBsonFile(filePath: string): AsyncIterable<MongoUser> {
  const buf = fs.readFileSync(filePath);
  let offset = 0;
  while (offset < buf.length) {
    // Each BSON document starts with a 4-byte little-endian length
    const docSize = buf.readInt32LE(offset);
    const docBuf = buf.subarray(offset, offset + docSize);
    const doc = BSON.deserialize(docBuf);
    yield normalizeBsonDoc(doc) as unknown as MongoUser;
    offset += docSize;
  }
}

async function* readJsonFile(filePath: string): AsyncIterable<MongoUser> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const docs: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  for (const doc of docs) {
    yield doc as MongoUser;
  }
}

/**
 * BSON deserializes ObjectIds as objects — normalize to { $oid: string }.
 */
function normalizeBsonDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v && typeof v === 'object' && '_bsontype' in v && (v as { _bsontype: string })._bsontype === 'ObjectId') {
      out[k] = { $oid: v.toString() };
    } else {
      out[k] = v;
    }
  }
  return out;
}
