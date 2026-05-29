import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { deleteSession } from '$lib/server/auth.js';

async function signout(cookies: Parameters<RequestHandler>[0]['cookies']) {
	const token = cookies.get('session');
	if (token) {
		await deleteSession(token);
		cookies.delete('session', { path: '/' });
	}
}

export const GET: RequestHandler = async ({ cookies }) => {
	await signout(cookies);
	throw redirect(302, '/welcome');
};

export const POST: RequestHandler = async ({ cookies }) => {
	await signout(cookies);
	return json({ ok: true });
};
