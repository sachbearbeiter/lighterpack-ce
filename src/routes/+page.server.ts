import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client.js';
import { libraries, lists, categories, items, listCategories } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Nicht eingeloggt → Welcome-Seite
	if (!locals.userId) throw redirect(302, '/welcome');

	// Library laden
	const [library] = await db
		.select()
		.from(libraries)
		.where(eq(libraries.userId, locals.userId))
		.limit(1);

	if (!library) {
		return { username: locals.username, library: null, lists: [], categories: [], itemCount: 0, debug: { userId: locals.userId, libraryFound: false } };
	}

	const userLists = await db
		.select()
		.from(lists)
		.where(eq(lists.libraryId, library.id))
		.orderBy(lists.sortOrder);

	const userCategories = await db
		.select()
		.from(categories)
		.where(eq(categories.libraryId, library.id))
		.orderBy(categories.sortOrder);

	const userItems = await db
		.select()
		.from(items)
		.where(eq(items.libraryId, library.id));

	const listCategoryLinks = userLists.length
		? await db
				.select()
				.from(listCategories)
				.where(eq(listCategories.listId, userLists[0].id))
		: [];

	return {
		username: locals.username,
		library: {
			id: library.id,
			totalUnit: library.totalUnit,
			itemUnit: library.itemUnit,
			currencySymbol: library.currencySymbol,
			optionalFields: library.optionalFields,
			updatedAt: library.updatedAt.toISOString()
		},
		lists: userLists.map(l => ({
			id: l.id,
			name: l.name,
			isPublic: l.isPublic,
			sortOrder: l.sortOrder
		})),
		categories: userCategories.map(c => ({
			id: c.id,
			name: c.name,
			color: c.color,
			sortOrder: c.sortOrder
		})),
		itemCount: userItems.length,
		debug: {
			userId: locals.userId,
			libraryId: library.id,
			listCount: userLists.length,
			categoryCount: userCategories.length,
			itemCount: userItems.length,
			listCategoryLinkCount: listCategoryLinks.length
		}
	};
};

