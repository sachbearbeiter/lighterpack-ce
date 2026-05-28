/**
 * CSV import/export in the lighterpack.com format.
 *
 * Column order (header + data rows):
 *   Item Name, Category, desc, qty, weight, unit, url, price, worn, consumable
 *
 * This format is identical to what lighterpack.com exports, so files can be
 * round-tripped between the two services without modification.
 */

import { weightToMg, mgToWeight } from '$lib/domain/weight.js';
import type { WeightUnit } from '$lib/domain/weight.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvRow {
	name: string;
	category: string;
	description: string;
	qty: number;
	weightMg: number;
	authorUnit: WeightUnit;
	url: string;
	price: number;
	worn: boolean;
	consumable: boolean;
}

export interface ParseResult {
	rows: CsvRow[];
	/** Rows that were skipped (bad format, unrecognised unit, etc.) */
	skipped: number;
}

// ---------------------------------------------------------------------------
// Unit normalisation  (mirrors lighterpack import-csv.vue)
// ---------------------------------------------------------------------------

const UNIT_MAP: Record<string, WeightUnit> = {
	ounce: 'oz', ounces: 'oz', oz: 'oz',
	pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
	gram: 'g', grams: 'g', g: 'g',
	kilogram: 'kg', kilograms: 'kg', kg: 'kg', kgs: 'kg',
};

function normaliseUnit(raw: string): WeightUnit | null {
	return UNIT_MAP[raw.toLowerCase().trim()] ?? null;
}

// ---------------------------------------------------------------------------
// CSV parsing  (RFC 4180 compatible)
// ---------------------------------------------------------------------------

/**
 * Minimal RFC-4180-compatible CSV parser.
 * Returns a 2-D array; outer = rows, inner = fields.
 */
function parseCsv(input: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let i = 0;

	while (i < input.length) {
		const ch = input[i];
		const next = input[i + 1];

		if (inQuotes) {
			if (ch === '"' && next === '"') {
				field += '"';
				i += 2;
			} else if (ch === '"') {
				inQuotes = false;
				i++;
			} else {
				field += ch;
				i++;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
				i++;
			} else if (ch === ',') {
				row.push(field);
				field = '';
				i++;
			} else if (ch === '\r' && next === '\n') {
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
				i += 2;
			} else if (ch === '\n' || ch === '\r') {
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
				i++;
			} else {
				field += ch;
				i++;
			}
		}
	}

	// last field / row
	if (field || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

/** Parse a lighterpack CSV string into structured rows. */
export function parseImportCsv(input: string): ParseResult {
	const allRows = parseCsv(input.trim());
	const rows: CsvRow[] = [];
	let skipped = 0;

	for (const cols of allRows) {
		// need at least 6 columns: name, category, desc, qty, weight, unit
		if (cols.length < 6) { skipped++; continue; }

		// skip header row
		if (cols[0].toLowerCase().trim() === 'item name') continue;

		const qty    = parseFloat(cols[3]);
		const weight = parseFloat(cols[4]);
		const unit   = normaliseUnit(cols[5]);

		if (isNaN(qty) || isNaN(weight) || unit === null) { skipped++; continue; }

		const price = cols[7] !== undefined ? parseFloat(cols[7]) : 0;

		rows.push({
			name:        cols[0].trim(),
			category:    cols[1].trim() || 'General',
			description: cols[2]?.trim() ?? '',
			qty:         Math.max(1, Math.round(qty)),
			weightMg:    weightToMg(weight, unit),
			authorUnit:  unit,
			url:         cols[6]?.trim() ?? '',
			price:       isNaN(price) ? 0 : price,
			worn:        cols[8]?.toLowerCase().trim() === 'worn',
			consumable:  cols[9]?.toLowerCase().trim() === 'consumable',
		});
	}

	return { rows, skipped };
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

interface ExportItem {
	name: string;
	categoryName: string;
	description: string | null;
	qty: number;
	weightMg: number;
	authorUnit: string;
	url: string | null;
	price: string | number;
	worn: boolean;
	consumable: boolean;
}

/** Escape a single CSV field (wraps in quotes if it contains comma/quote/newline). */
function escapeField(value: string | number | null | undefined): string {
	const s = String(value ?? '');
	if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

/** Generate a lighterpack-compatible CSV string for one list. */
export function generateExportCsv(listName: string, items: ExportItem[]): string {
	const lines: string[] = ['Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable'];

	for (const item of items) {
		const unit = item.authorUnit as WeightUnit;
		const weight = mgToWeight(item.weightMg, unit);

		const cols = [
			item.name,
			item.categoryName,
			item.description ?? '',
			String(item.qty),
			String(weight),
			unit,
			item.url ?? '',
			String(item.price ?? 0),
			item.worn ? 'Worn' : '',
			item.consumable ? 'Consumable' : '',
		];

		lines.push(cols.map(escapeField).join(','));
	}

	return lines.join('\r\n') + '\r\n';
}
