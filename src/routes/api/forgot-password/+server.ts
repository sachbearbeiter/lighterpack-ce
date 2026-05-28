import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createPasswordReset, consumePasswordReset } from '$lib/server/auth.js';

// POST /api/forgot-password  { username }  → triggers reset email
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) return json({ errors: [{ message: 'Invalid request.' }] }, { status: 400 });

	const result = await createPasswordReset(String(body.username ?? ''));

	// Always return 200 — don't leak whether an account exists
	if (result) {
		// TODO: send email with reset link: /reset-password?token=<result.token>
		// For now: log to console (dev only)
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[dev] Password reset token for ${result.email}: ${result.token}`);
		}
	}

	return json({ ok: true });
};

// PATCH /api/forgot-password  { token, password }  → consume reset token
export const PATCH: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) return json({ errors: [{ message: 'Invalid request.' }] }, { status: 400 });

	const result = await consumePasswordReset(
		String(body.token ?? ''),
		String(body.password ?? '')
	);

	if ('errors' in result) {
		return json(result, { status: 400 });
	}

	return json({ ok: true });
};
