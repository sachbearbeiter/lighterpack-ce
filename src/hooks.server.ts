import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');
	if (token) {
		const session = await validateSession(token);
		if (session) {
			event.locals.userId = session.userId;
			event.locals.username = session.username;
		} else {
			// Expired or invalid — clear cookie
			event.cookies.delete('session', { path: '/' });
		}
	}
	return resolve(event);
};
