import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { signin } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	if (!body) return json({ errors: [{ message: 'Invalid request.' }] }, { status: 400 });

	const result = await signin({
		username: String(body.username ?? ''),
		password: String(body.password ?? '')
	});

	if ('errors' in result) {
		return json(result, { status: 400 });
	}

	cookies.set('session', result.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 365 * 24 * 60 * 60
	});

	return json({ ok: true, username: result.username });
};
