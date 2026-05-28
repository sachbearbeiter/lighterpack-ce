/**
 * Library service — business logic for list/item/category operations.
 *
 * Route handlers stay thin (validate request → call service → return response).
 * All DB access and transaction management lives here.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db/client.js';
import { newId } from '$lib/server/id.js';
import {
	libraries, items, categories, categoryItems,
	lists, listCategories
} from '$lib/server/db/schema.js';
import { generateExportCsv, type CsvRow } from '$lib/csv.js';

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportResult {
	listId: string;
	itemCount: number;
}

/**
 * Persist a parsed CSV as a new list inside the user's library.
 * Wrapped in a single transaction — either everything lands or nothing does.
 */
export async function importCsvToLibrary(
	userId: string,
	listName: string,
	rows: CsvRow[]
): Promise<ImportResult> {
	const [library] = await db
		.select({ id: libraries.id })
		.from(libraries)
		.where(eq(libraries.userId, userId))
		.limit(1);

	if (!library) throw new Error('Library not found for user');

	const listId = newId();

	await db.transaction(async (tx) => {
		await tx.insert(lists).values({
			id: listId,
			libraryId: library.id,
			name: listName,
			isPublic: false,
			sortOrder: 0,
		});

		// Group rows by category name, preserving first-occurrence order
		const categoryOrder: string[] = [];
		const rowsByCategory = new Map<string, CsvRow[]>();

		for (const row of rows) {
			if (!rowsByCategory.has(row.category)) {
				categoryOrder.push(row.category);
				rowsByCategory.set(row.category, []);
			}
			rowsByCategory.get(row.category)!.push(row);
		}

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

			for (const [rowIdx, row] of rowsByCategory.get(catName)!.entries()) {
				const itemId = newId();

				await tx.insert(items).values({
					id: itemId,
					libraryId: library.id,
					name: row.name,
					description: row.description || null,
					weightMg: Math.round(row.weightMg),
					authorUnit: row.authorUnit,
					price: row.price.toFixed(2),
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
	});

	return { listId, itemCount: rows.length };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportResult {
	csv: string;
	filename: string;
}

/**
 * Generate a lighterpack-compatible CSV for one list.
 * Returns null when the list does not exist or belongs to another user.
 */
export async function exportListAsCsv(
	listId: string,
	userId: string
): Promise<ExportResult | null> {
	// Verify ownership: list → library → user
	const [list] = await db
		.select({ id: lists.id, name: lists.name, libraryId: lists.libraryId })
		.from(lists)
		.innerJoin(libraries, eq(lists.libraryId, libraries.id))
		.where(and(eq(lists.id, listId), eq(libraries.userId, userId)))
		.limit(1);

	if (!list) return null;

	// Load ordered categories for this list
	const listCats = await db
		.select({ categoryId: listCategories.categoryId })
		.from(listCategories)
		.where(eq(listCategories.listId, listId))
		.orderBy(listCategories.sortOrder);

	// Load category names
	const cats = await db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.where(eq(categories.libraryId, list.libraryId));

	const catNames = new Map(cats.map((c) => [c.id as string, c.name]));

	// Load items per category, in sort order
	const exportRows: Parameters<typeof generateExportCsv>[1] = [];

	for (const { categoryId } of listCats) {
		const rows = await db
			.select({
				name: items.name,
				description: items.description,
				weightMg: items.weightMg,
				authorUnit: items.authorUnit,
				url: items.url,
				price: items.price,
				qty: categoryItems.qty,
				worn: categoryItems.worn,
				consumable: categoryItems.consumable,
			})
			.from(categoryItems)
			.innerJoin(items, eq(categoryItems.itemId, items.id))
			.where(eq(categoryItems.categoryId, categoryId))
			.orderBy(categoryItems.sortOrder);

		for (const row of rows) {
			exportRows.push({ ...row, categoryName: catNames.get(categoryId as string) ?? '' });
		}
	}

	const csv = generateExportCsv(list.name, exportRows);
	const filename = (list.name || 'export').replace(/[^a-z0-9\-]/gi, '_');

	return { csv, filename };
}
