import { hash, verify } from '@node-rs/argon2';
import { uuidv7 } from 'uuidv7';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '$lib/server/db/client.js';
import { users, sessions, passwordResets, libraries } from '$lib/server/db/schema.js';
import { isValidEmail, isValidUsername } from '$lib/validation.js';

// ---------------------------------------------------------------------------
// Argon2id parameters (OWASP recommended minimums)
// ---------------------------------------------------------------------------
const ARGON2_OPTIONS = {
	memoryCost: 65536, // 64 MB
	timeCost: 3,
	parallelism: 1
};

const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS   = 30  * 24 * 60 * 60 * 1000;

// Drizzle mysql binary() columns expect hex strings, not Buffers.
function newId(): string {
	return uuidv7().replace(/-/g, '');
}

function now(): Date {
	return new Date();
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
export interface AuthError {
	field?: string;
	message: string;
}

export async function register(input: {
	username: string;
	email: string;
	password: string;
}): Promise<{ errors: AuthError[] } | { token: string; username: string }> {
	const username = input.username.toLowerCase().trim();
	const email    = input.email.toLowerCase().trim();
	const { password } = input;

	const errors: AuthError[] = [];

	if (!username || username.length < 3 || username.length > 32)
		errors.push({ field: 'username', message: 'Username must be 3–32 characters.' });
	if (username && !isValidUsername(username))
		errors.push({ field: 'username', message: 'Username may only contain letters, numbers, hyphens and underscores.' });
	if (!email || !isValidEmail(email))
		errors.push({ field: 'email', message: 'Please enter a valid email address.' });
	if (!password || password.length < 8 || password.length > 72)
		errors.push({ field: 'password', message: 'Password must be 8–72 characters.' });
	if (errors.length) return { errors };

	const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
	if (existingUser) return { errors: [{ field: 'username', message: 'That username is already taken.' }] };

	const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
	if (existingEmail) return { errors: [{ field: 'email', message: 'An account with that email already exists.' }] };

	const passwordHash = await hash(password, ARGON2_OPTIONS);
	const userId    = newId();
	const createdAt = now();

	await db.transaction(async (tx) => {
		await tx.insert(users).values({ id: userId, username, email, passwordHash, passwordStatus: 'active', createdAt });
		await tx.insert(libraries).values({
			id: newId(), userId, totalUnit: 'oz', itemUnit: 'oz', currencySymbol: '$',
			optionalFields: { worn: true, consumable: true, price: false, images: false, listDescription: false },
			version: 0, updatedAt: createdAt
		});
	});

	const { token } = await createSession(userId);
	return { token, username };
}

// ---------------------------------------------------------------------------
// signin
// ---------------------------------------------------------------------------
export async function signin(input: {
	username: string;
	password: string;
}): Promise<{ errors: AuthError[] } | { token: string; username: string }> {
	const username = input.username.toLowerCase().trim();

	const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

	if (!user)
		return { errors: [{ field: 'username', message: 'Invalid username or password.' }] };
	if (user.passwordStatus === 'must_reset' || user.passwordStatus === 'imported_no_password')
		return { errors: [{ field: 'password', message: 'Please reset your password using the link below.' }] };
	if (!user.passwordHash)
		return { errors: [{ field: 'password', message: 'Invalid username or password.' }] };

	const valid = await verify(user.passwordHash, input.password, ARGON2_OPTIONS);
	if (!valid)
		return { errors: [{ field: 'password', message: 'Invalid username or password.' }] };

	const { token } = await createSession(user.id);
	return { token, username: user.username };
}

// ---------------------------------------------------------------------------
// session management
// ---------------------------------------------------------------------------
export async function createSession(userId: string): Promise<{ token: string }> {
	const token     = uuidv7().replace(/-/g, '') + uuidv7().replace(/-/g, '');
	const tokenHash = hashToken(token);
	const createdAt = now();
	const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);

	await db.insert(sessions).values({ id: newId(), userId, tokenHash, createdAt, expiresAt });
	return { token };
}

export async function validateSession(token: string): Promise<{ userId: string; username: string } | null> {
	const tokenHash = hashToken(token);

	const rows = await db
		.select({ userId: sessions.userId, expiresAt: sessions.expiresAt, username: users.username })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.tokenHash, tokenHash))
		.limit(1);

	if (!rows.length) return null;
	const row = rows[0];
	if (row.expiresAt < now()) { await deleteSession(token); return null; }

	return { userId: row.userId, username: row.username };
}

export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

// ---------------------------------------------------------------------------
// password reset
// ---------------------------------------------------------------------------
export async function createPasswordReset(usernameOrEmail: string): Promise<{ token: string; email: string } | null> {
	const val = usernameOrEmail.toLowerCase().trim();

	let found = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.username, val)).limit(1);
	if (!found.length)
		found = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, val)).limit(1);
	if (!found.length) return null;

	const user      = found[0];
	const token     = uuidv7().replace(/-/g, '') + uuidv7().replace(/-/g, '');
	const tokenHash = hashToken(token);
	const createdAt = now();
	const expiresAt = new Date(createdAt.getTime() + RESET_TTL_MS);

	await db.insert(passwordResets).values({ id: newId(), userId: user.id, tokenHash, createdAt, expiresAt });
	return { token, email: user.email };
}

export async function consumePasswordReset(
	token: string,
	newPassword: string
): Promise<{ errors: AuthError[] } | { ok: true }> {
	if (!newPassword || newPassword.length < 8 || newPassword.length > 72)
		return { errors: [{ field: 'password', message: 'Password must be 8–72 characters.' }] };

	const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, hashToken(token))).limit(1);
	if (!reset || reset.usedAt || reset.expiresAt < now())
		return { errors: [{ message: 'This reset link is invalid or has expired.' }] };

	const passwordHash = await hash(newPassword, ARGON2_OPTIONS);
	await db.transaction(async (tx) => {
		await tx.update(users).set({ passwordHash, passwordStatus: 'active' }).where(eq(users.id, reset.userId));
		await tx.update(passwordResets).set({ usedAt: now() }).where(eq(passwordResets.id, reset.id));
	});

	return { ok: true };
}
