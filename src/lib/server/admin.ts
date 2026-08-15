import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from 'better-auth';
import { isAdminEmail, isAllowedEmail } from '#lib/server/allowed-emails.ts';

/**
 * Every `/admin` route runs through this. Signing in is already gated on the
 * allowlist at account creation, so the second check only matters for an
 * address that was dropped from the list afterwards — it locks the account out
 * of the admin surface without deleting anything.
 */
export async function requireUser(event: RequestEvent): Promise<User> {
	const user = event.locals.user;

	if (!user) {
		redirect(302, `/?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	// an admin is checked first and separately: adding the very first database
	// entry turns the allowlist on, and without this the account that added it
	// would lock itself out on the next request
	if (!isAdminEmail(user.email) && !(await isAllowedEmail(user.email))) {
		error(403, 'This account is no longer allowed to administer the site.');
	}

	return user;
}

/**
 * The narrower gate, for the pages that hand out accounts and passwords. Only
 * an address written into `ALLOWED_EMAILS` passes; someone invited from inside
 * the app cannot invite anyone else.
 */
export async function requireAdmin(event: RequestEvent): Promise<User> {
	const user = await requireUser(event);

	if (!isAdminEmail(user.email)) {
		error(403, 'Only the site administrator can do that.');
	}

	return user;
}
