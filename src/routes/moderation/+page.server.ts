import { redirect, fail } from '@sveltejs/kit';
import { or, like, eq, desc } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { db } from '$lib/server/db/client.js';
import { users, sessions } from '$lib/server/db/schema.js';
import { deleteAllSessionsForUser, setModeratorStatus } from '$lib/server/auth.js';
import type { PageServerLoad, Actions } from './$types';

const ARGON2_OPTIONS = { memoryCost: 65536, timeCost: 3, parallelism: 1 };

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.userId) throw redirect(302, '/');
	if (!locals.isModerator) throw redirect(302, '/');

	// Letzte 20 registrierten User als Übersicht
	const recentUsers = await db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			passwordStatus: users.passwordStatus,
			isModerator: users.isModerator,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(desc(users.createdAt))
		.limit(20);

	const sessionCounts = await db
		.select({ userId: sessions.userId })
		.from(sessions);

	const sessionCountMap: Record<string, number> = {};
	for (const s of sessionCounts) {
		sessionCountMap[s.userId] = (sessionCountMap[s.userId] ?? 0) + 1;
	}

	return {
		username: locals.username,
		recentUsers: recentUsers.map(u => ({
			...u,
			createdAt: u.createdAt.toISOString(),
			sessionCount: sessionCountMap[u.id] ?? 0
		}))
	};
};

export const actions: Actions = {
	search: async ({ request, locals }) => {
		if (!locals.isModerator) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const q = String(data.get('q') ?? '').trim().toLowerCase();
		if (!q || q.length < 2) return fail(400, { error: 'Search query too short.' });

		const pattern = `%${q}%`;
		const results = await db
			.select({
				id: users.id,
				username: users.username,
				email: users.email,
				passwordStatus: users.passwordStatus,
				isModerator: users.isModerator,
				createdAt: users.createdAt
			})
			.from(users)
			.where(or(like(users.username, pattern), like(users.email, pattern)))
			.limit(50);

		const sessionCounts = await db.select({ userId: sessions.userId }).from(sessions);
		const sessionCountMap: Record<string, number> = {};
		for (const s of sessionCounts) {
			sessionCountMap[s.userId] = (sessionCountMap[s.userId] ?? 0) + 1;
		}

		return {
			searchResults: results.map(u => ({
				...u,
				createdAt: u.createdAt.toISOString(),
				sessionCount: sessionCountMap[u.id] ?? 0
			})),
			searchQuery: q
		};
	},

	clearSessions: async ({ request, locals }) => {
		if (!locals.isModerator) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const targetUsername = String(data.get('username') ?? '');
		if (!userId) return fail(400, { error: 'No userId provided.' });

		const count = await deleteAllSessionsForUser(userId);
		return { actionDone: `clearSessions`, targetUsername, count };
	},

	resetPassword: async ({ request, locals }) => {
		if (!locals.isModerator) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const targetUsername = String(data.get('username') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');

		if (!userId) return fail(400, { error: 'No userId provided.' });
		if (!newPassword || newPassword.length < 8)
			return fail(400, { error: 'New password must be at least 8 characters.' });

		const passwordHash = await hash(newPassword, ARGON2_OPTIONS);
		await db
			.update(users)
			.set({ passwordHash, passwordStatus: 'active' })
			.where(eq(users.id, userId));

		// Alle Sessions des Users löschen (zwangsweise neu einloggen)
		await deleteAllSessionsForUser(userId);

		return { actionDone: 'resetPassword', targetUsername };
	},

	setPasswordStatus: async ({ request, locals }) => {
		if (!locals.isModerator) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const targetUsername = String(data.get('username') ?? '');
		const status = String(data.get('status') ?? '') as 'active' | 'must_reset' | 'imported_no_password';

		if (!userId) return fail(400, { error: 'No userId provided.' });
		if (!['active', 'must_reset', 'imported_no_password'].includes(status))
			return fail(400, { error: 'Invalid status.' });

		await db.update(users).set({ passwordStatus: status }).where(eq(users.id, userId));
		return { actionDone: 'setPasswordStatus', targetUsername, status };
	},

	toggleModerator: async ({ request, locals }) => {
		if (!locals.isModerator) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const targetUsername = String(data.get('username') ?? '');
		const grant = String(data.get('grant') ?? 'false') === 'true';

		if (!userId) return fail(400, { error: 'No userId provided.' });
		if (!grant && userId === locals.userId)
			return fail(400, { error: 'You cannot remove your own moderator rights.' });

		await setModeratorStatus(userId, grant);
		return { actionDone: 'toggleModerator', targetUsername, grant };
	}
};
