import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from 'better-auth';
import { isAllowedEmail } from '#lib/server/allowed-emails.ts';

/**
 * Every `/admin` route runs through this. Signing in is already gated on the
 * allowlist at account creation, so the second check only matters for an
 * address that was dropped from the list afterwards — it locks the account out
 * of the admin surface without deleting anything.
 */
export async function requireAdmin(event: RequestEvent): Promise<User> {
	const user = event.locals.user;

	if (!user) {
		redirect(302, `/?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	if (!(await isAllowedEmail(user.email))) {
		error(403, 'This account is no longer allowed to administer the site.');
	}

	return user;
}
