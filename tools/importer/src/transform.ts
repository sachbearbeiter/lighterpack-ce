/**
 * Transforms a raw MongoUser document into the normalized entities
 * that map to the lighterpack-ce MariaDB schema.
 *
 * Weight conversion: original lighterpack stores weights in milligrams
 * (as floating point). We round to integer milligrams.
 */

import type { MongoUser, MongoLibrary, MongoItem, MongoCategory, MongoCategoryItem, MongoList } from './types.js';

export interface TransformedUser {
  legacyId: string;
  username: string;
  email: string;
  /** Always null — imported users must reset their password */
  passwordHash: null;
  passwordStatus: 'must_reset';
  library: TransformedLibrary;
  warnings: string[];
}

export interface TransformedLibrary {
  totalUnit: string;
  itemUnit: string;
  currencySymbol: string;
  optionalFields: Record<string, boolean>;
  items: TransformedItem[];
  categories: TransformedCategory[];
  lists: TransformedList[];
}

export interface TransformedItem {
  legacyId: string;
  name: string;
  description: string;
  weightMg: number;
  authorUnit: string;
  price: string;
  url: string;
  image: string;
  imageUrl: string;
}

export interface TransformedCategory {
  legacyId: string;
  name: string;
  color: unknown;
  sortOrder: number;
  categoryItems: TransformedCategoryItem[];
}

export interface TransformedCategoryItem {
  itemLegacyId: string;
  qty: number;
  worn: boolean;
  consumable: boolean;
  star: number;
  sortOrder: number;
}

export interface TransformedList {
  legacyId: string;
  name: string;
  externalId: string;
  description: string;
  categoryLegacyIds: string[];
}

export interface TransformResult {
  user: TransformedUser | null;
  /** Skipped — missing required fields */
  skipped: boolean;
  skipReason?: string;
}

export function transform(raw: MongoUser): TransformResult {
  const warnings: string[] = [];

  // --- Extract legacy ID ---
  const legacyId = extractOid(raw._id);
  if (!legacyId) return { user: null, skipped: true, skipReason: 'missing _id' };

  const username = (raw.username ?? '').toLowerCase().trim();
  const email    = (raw.email ?? '').toLowerCase().trim();

  if (!username) return { user: null, skipped: true, skipReason: `${legacyId}: missing username` };
  if (!email)    return { user: null, skipped: true, skipReason: `${legacyId}: missing email for user "${username}"` };

  // --- Transform library blob ---
  const lib = raw.library ?? {};
  const library = transformLibrary(lib, legacyId, warnings);

  return {
    user: {
      legacyId,
      username,
      email,
      passwordHash: null,
      passwordStatus: 'must_reset',
      library,
      warnings,
    },
    skipped: false,
  };
}

function transformLibrary(lib: MongoLibrary, userLegacyId: string, warnings: string[]): TransformedLibrary {
  const itemMap = new Map<string, TransformedItem>();

  // Items
  const items: TransformedItem[] = [];
  for (const raw of lib.items ?? []) {
    const legacyId = String(raw.id ?? '');
    if (!legacyId) { warnings.push('item with missing id skipped'); continue; }

    const item: TransformedItem = {
      legacyId: `${userLegacyId}:item:${legacyId}`,
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      weightMg: Math.round(Number(raw.weight ?? 0)),
      authorUnit: String(raw.authorUnit ?? 'oz'),
      price: formatDecimal(raw.price),
      url: String(raw.url ?? ''),
      image: String(raw.image ?? ''),
      imageUrl: String(raw.imageUrl ?? ''),
    };
    items.push(item);
    itemMap.set(legacyId, item);
  }

  // Categories
  const categories: TransformedCategory[] = [];
  for (const [idx, raw] of (lib.categories ?? []).entries()) {
    const legacyId = String(raw.id ?? '');
    if (!legacyId) { warnings.push('category with missing id skipped'); continue; }

    const categoryItems: TransformedCategoryItem[] = [];
    for (const ci of raw.categoryItems ?? []) {
      const itemLegacyId = String(ci.itemId ?? '');
      if (!itemLegacyId || !itemMap.has(itemLegacyId)) {
        warnings.push(`category "${raw.name}" references missing item id "${itemLegacyId}" — skipped`);
        continue;
      }
      categoryItems.push({
        itemLegacyId: `${userLegacyId}:item:${itemLegacyId}`,
        qty: Math.max(1, Number(ci.qty ?? 1)),
        worn: Boolean(ci.worn),
        consumable: Boolean(ci.consumable),
        star: Number(ci.star ?? 0),
        sortOrder: Number(ci.sortOrder ?? 0),
      });
    }

    categories.push({
      legacyId: `${userLegacyId}:cat:${legacyId}`,
      name: String(raw.name ?? ''),
      color: raw.color ?? null,
      sortOrder: idx,
      categoryItems,
    });
  }

  // Lists
  const categoryIdToLegacy = new Map<string, string>(
    (lib.categories ?? []).map((c) => [String(c.id ?? ''), `${userLegacyId}:cat:${String(c.id ?? '')}`])
  );

  const lists: TransformedList[] = [];
  for (const raw of lib.lists ?? []) {
    const legacyId = String(raw.id ?? '');
    if (!legacyId) { warnings.push('list with missing id skipped'); continue; }

    const categoryLegacyIds: string[] = [];
    for (const cid of raw.categoryIds ?? []) {
      const mapped = categoryIdToLegacy.get(String(cid));
      if (mapped) categoryLegacyIds.push(mapped);
      else warnings.push(`list "${raw.name}" references missing category id "${cid}" — skipped`);
    }

    lists.push({
      legacyId: `${userLegacyId}:list:${legacyId}`,
      name: String(raw.name ?? ''),
      externalId: String(raw.externalId ?? ''),
      description: String(raw.description ?? ''),
      categoryLegacyIds,
    });
  }

  return {
    totalUnit: String(lib.totalUnit ?? 'oz'),
    itemUnit: String(lib.itemUnit ?? 'oz'),
    currencySymbol: String(lib.currencySymbol ?? '$'),
    optionalFields: {
      worn: Boolean(lib.optionalFields?.worn ?? true),
      consumable: Boolean(lib.optionalFields?.consumable ?? true),
      price: Boolean(lib.optionalFields?.price ?? false),
      images: Boolean(lib.optionalFields?.images ?? false),
      listDescription: Boolean(lib.optionalFields?.listDescription ?? false),
    },
    items,
    categories,
    lists,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractOid(id: MongoUser['_id']): string | null {
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && '$oid' in id) return id.$oid;
  return null;
}

function formatDecimal(value: unknown): string {
  const n = parseFloat(String(value ?? '0'));
  if (isNaN(n)) return '0.00';
  return n.toFixed(2);
}
