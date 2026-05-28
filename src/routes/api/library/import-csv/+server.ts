/**
 * POST /api/library/import-csv
 *
 * Accepts a multipart form with a `file` field containing a lighterpack CSV.
 * Creates a new list in the authenticated user's library.
 *
 * Returns: { listId: string, itemCount: number, skipped: number }
 */

import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db/client.js';
import { libraries, items, categories, categoryItems, lists, listCategories } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { parseImportCsv } from '$lib/server/csv.js';
import type { RequestHandler } from './$types.js';

function newId(): string {
	return uuidv7().replace(/-/g, '');
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) {
		error(401, 'Not authenticated');
	}

	// Parse multipart form
	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		error(400, 'Missing file field');
	}
	if (!file.name.toLowerCase().endsWith('.csv')) {
		error(400, 'Only CSV files are accepted');
	}
	if (file.size > 5_000_000) {
		error(400, 'File too large (max 5 MB)');
	}

	const text = await file.text();
	const { rows, skipped } = parseImportCsv(text);

	if (rows.length === 0) {
		error(422, 'No valid rows found in CSV');
	}

	// Resolve the user's library
	const [library] = await db
		.select({ id: libraries.id })
		.from(libraries)
		.where(eq(libraries.userId, locals.userId))
		.limit(1);

	if (!library) {
		error(500, 'Library not found for user');
	}

	// Derive list name from filename (strip extension, underscores → spaces)
	const listName = file.name.replace(/\.csv$/i, '').replace(/_/g, ' ') || 'Imported list';

	// All inserts wrapped in a single transaction
	await db.transaction(async (tx) => {
		// 1. Create the list
		const listId = newId();
		await tx.insert(lists).values({
			id: listId,
			libraryId: library.id,
			name: listName,
			isPublic: false,
			sortOrder: 0,
		});

		// 2. Group rows by category name, preserving first occurrence order
		const categoryOrder: string[] = [];
		const rowsByCategory = new Map<string, typeof rows>();

		for (const row of rows) {
			if (!rowsByCategory.has(row.category)) {
				categoryOrder.push(row.category);
				rowsByCategory.set(row.category, []);
			}
			rowsByCategory.get(row.category)!.push(row);
		}

		// 3. Create categories, items, category_items, list_categories
		for (const [catIdx, catName] of categoryOrder.entries()) {
			const catId = newId();

			await tx.insert(categories).values({
				id: catId,
				libraryId: library.id,
				name: catName,
				sortOrder: catIdx,
			});

			await tx.insert(listCategories).values({
				id: newId(),
				listId,
				categoryId: catId,
				sortOrder: catIdx,
			});

			const catRows = rowsByCategory.get(catName)!;
			for (const [rowIdx, row] of catRows.entries()) {
				const itemId = newId();

				await tx.insert(items).values({
					id: itemId,
					libraryId: library.id,
					name: row.name,
					description: row.description || null,
					weightMg: Math.round(row.weightMg),
					authorUnit: row.authorUnit,
					price: String(row.price.toFixed(2)),
					url: row.url || null,
				});

				await tx.insert(categoryItems).values({
					id: newId(),
					categoryId: catId,
					itemId,
					qty: row.qty,
					worn: row.worn,
					consumable: row.consumable,
					sortOrder: rowIdx,
				});
			}
		}

		return listId;
	});

	return json({ itemCount: rows.length, skipped }, { status: 201 });
};
