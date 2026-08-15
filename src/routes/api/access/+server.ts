import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	accessAttemptsExhausted,
	endGuestSession,
	findAccessKeyByPassword,
	recordFailedAccessAttempt,
	startGuestSession
} from '#lib/server/access.ts';

/**
 * The share-password door. The front page is prerendered and so has no form
 * actions of its own; it posts here instead.
 */
export const POST: RequestHandler = async (event) => {
	if (accessAttemptsExhausted(event)) {
		return json({ message: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
	}

	const body = await event.request.json().catch(() => null);
	const password = typeof body?.password === 'string' ? body.password.trim() : '';

	if (!password) {
		return json({ message: 'Enter the password you were given.' }, { status: 400 });
	}

	const key = await findAccessKeyByPassword(password);

	if (!key) {
		recordFailedAccessAttempt(event);
		return json({ message: 'That password did not work.' }, { status: 401 });
	}

	startGuestSession(event.cookies, key.id);

	return json({ ok: true });
};

/** Guest sign-out. Accounts sign out through Better Auth instead. */
export const DELETE: RequestHandler = (event) => {
	endGuestSession(event.cookies);
	return json({ ok: true });
};
