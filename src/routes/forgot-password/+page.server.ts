import { createPasswordReset } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';

export const actions: Actions = {
	byUsername: async ({ request }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').toLowerCase().trim();
		const result = await createPasswordReset(username);
		// Don't reveal whether user exists
		return { success: 'If that username exists, a password reset email has been sent.' };
	},

	byEmail: async ({ request }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').toLowerCase().trim();
		const [user] = await db.select({ username: users.username }).from(users).where(eq(users.email, email)).limit(1);
		if (user) await createPasswordReset(user.username);
		return { success: 'If that email address is registered, you will receive an email with your username.' };
	},
};
