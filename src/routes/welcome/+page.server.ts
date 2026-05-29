import { redirect } from '@sveltejs/kit';
import { register, signin } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Bereits eingeloggt → direkt zum Dashboard
	if (locals.userId) throw redirect(302, '/');
	return {};
};

export const actions: Actions = {
	register: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '');
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');
		const passwordConfirm = String(data.get('passwordConfirm') ?? '');

		if (password !== passwordConfirm) {
			return { registerError: 'Passwords do not match.' };
		}

		try {
			const result = await register({ username, email, password });
			if ('errors' in result) return { registerError: result.errors[0].message };
			cookies.set('session', result.token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
		} catch (err) {
			console.error('[register action]', err);
			return { registerError: 'An unexpected error occurred. Please try again.' };
		}
		throw redirect(302, '/');
	},

	signin: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '');
		const password = String(data.get('password') ?? '');

		try {
			const result = await signin({ username, password });
			if ('errors' in result) return { signinError: result.errors[0].message };
			cookies.set('session', result.token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
		} catch (err) {
			console.error('[signin action]', err);
			return { signinError: 'An unexpected error occurred. Please try again.' };
		}
		throw redirect(302, '/');
	},
};
