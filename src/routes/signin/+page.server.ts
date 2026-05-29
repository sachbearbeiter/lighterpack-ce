import { redirect } from '@sveltejs/kit';
import { signin } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.userId) throw redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '');
		const password = String(data.get('password') ?? '');

		try {
			const result = await signin({ username, password });
			if ('errors' in result) return { error: result.errors[0].message };
			cookies.set('session', result.token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
		} catch (err) {
			console.error('[signin action]', err);
			return { error: 'An unexpected error occurred. Please try again.' };
		}
		throw redirect(302, '/');
	},
};

