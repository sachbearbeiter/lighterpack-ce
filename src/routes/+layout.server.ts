import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	userId: locals.userId ?? null,
	username: locals.username ?? null,
});
