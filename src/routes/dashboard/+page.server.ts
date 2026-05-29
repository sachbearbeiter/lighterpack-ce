import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /dashboard existiert nicht mehr als eigenständige Route.
// Das Dashboard liegt jetzt unter /  (wie im Original-Lighterpack).
export const load: PageServerLoad = async () => {
	throw redirect(301, '/');
};


export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.userId) throw redirect(302, '/');

	// Library des Users laden
	const [library] = await db
		.select()
		.from(libraries)
		.where(eq(libraries.userId, locals.userId))
		.limit(1);

	if (!library) {
		return { username: locals.username, library: null, lists: [], debug: { userId: locals.userId, libraryFound: false } };
	}

	// Listen laden
	const userLists = await db
		.select()
		.from(lists)
		.where(eq(lists.libraryId, library.id))
		.orderBy(lists.sortOrder);

	// Alle Kategorien dieser Library laden
	const userCategories = await db
		.select()
		.from(categories)
		.where(eq(categories.libraryId, library.id))
		.orderBy(categories.sortOrder);

	// Alle Items dieser Library laden
	const userItems = await db
		.select()
		.from(items)
		.where(eq(items.libraryId, library.id));

	// list_categories Verknüpfungen
	const listCategoryLinks = userLists.length
		? await db
				.select()
				.from(listCategories)
				.where(eq(listCategories.listId, userLists[0].id)) // nur erste Liste vorerst
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
