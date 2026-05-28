/**
 * GET /api/library/export-csv/[listId]
 *
 * Exports one list as a lighterpack-compatible CSV file.
 * The file can be re-imported into lighterpack.com without modification.
 *
 * Only the list owner may export (session required).
 */

import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client.js';
import {
	libraries, items, categories, categoryItems,
	lists, listCategories
} from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { generateExportCsv } from '$lib/server/csv.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.userId) {
		error(401, 'Not authenticated');
	}

	const { listId } = params;

	// Verify ownership: list → library → user
	const [list] = await db
		.select({ id: lists.id, name: lists.name, libraryId: lists.libraryId })
		.from(lists)
		.innerJoin(libraries, eq(lists.libraryId, libraries.id))
		.where(and(eq(lists.id, listId), eq(libraries.userId, locals.userId)))
		.limit(1);

	if (!list) {
		error(404, 'List not found');
	}

	// Load all categories for this list (ordered)
	const listCats = await db
		.select({ categoryId: listCategories.categoryId, sortOrder: listCategories.sortOrder })
		.from(listCategories)
		.where(eq(listCategories.listId, listId))
		.orderBy(listCategories.sortOrder);

	if (listCats.length === 0) {
		// Empty list — return minimal valid CSV
		const csv = generateExportCsv(list.name, []);
		return csvResponse(csv, list.name);
	}

	const categoryIds = listCats.map((lc) => lc.categoryId);

	// Load categories
	const cats = await db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.where(eq(categories.libraryId, list.libraryId));

	const catMap = new Map(cats.map((c) => [c.id as string, c.name]));

	// Load category_items joined with items, for all categories in this list
	// We query per category to preserve sort order
	const exportRows: Array<{
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
	}> = [];

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
				sortOrder: categoryItems.sortOrder,
			})
			.from(categoryItems)
			.innerJoin(items, eq(categoryItems.itemId, items.id))
			.where(eq(categoryItems.categoryId, categoryId))
			.orderBy(categoryItems.sortOrder);

		for (const row of rows) {
			exportRows.push({
				...row,
				categoryName: catMap.get(categoryId as string) ?? '',
			});
		}
	}

	const csv = generateExportCsv(list.name, exportRows);
	return csvResponse(csv, list.name);
};

function csvResponse(csv: string, listName: string): Response {
	const filename = listName.replace(/[^a-z0-9\-]/gi, '_') || 'export';
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}.csv"`,
		},
	});
}
