import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '#lib/server/admin.ts';
import { MIN_PASSWORD_LENGTH, listAccounts, setAccountPassword } from '#lib/server/accounts.ts';
import { generateAccessPassword } from '#lib/server/access-keys.ts';
import {
	addAllowedEmail,
	entryProblem,
	listAllowedEmails,
	removeAllowedEmail,
	rootAllowedEmails
} from '#lib/server/allowed-emails.ts';

export const load: PageServerLoad = async (event) => {
	const admin = await requireAdmin(event);

	const [entries, accounts] = await Promise.all([listAllowedEmails(), listAccounts()]);

	return {
		entries,
		accounts,
		// shown as read-only rows: these come from the environment, so the only
		// way to take one away is a redeploy
		root: rootAllowedEmails(),
		self: admin.id,
		minLength: MIN_PASSWORD_LENGTH
	};
};

export const actions: Actions = {
	invite: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		const entry = String(form.get('entry') ?? '');
		const note = String(form.get('note') ?? '');

		const problem = entryProblem(entry);
		if (problem) return fail(400, { message: problem, entry, note });

		if (!(await addAllowedEmail({ entry, note }))) {
			return fail(400, { message: 'That one is already on the list.', entry, note });
		}

		return { invited: entry.trim().toLowerCase() };
	},

	uninvite: async (event) => {
		await requireAdmin(event);

		const form = await event.request.formData();
		// an account that already exists keeps working — this only closes the
		// door on new sign-ups from that address
		await removeAllowedEmail(String(form.get('id') ?? ''));

		return { ok: true };
	},

	setPassword: async (event) => {
		const admin = await requireAdmin(event);

		const form = await event.request.formData();
		const userId = String(form.get('userId') ?? '');
		const custom = String(form.get('password') ?? '').trim();

		if (!userId) return fail(400, { message: 'Missing account.' });
		if (userId === admin.id) {
			return fail(400, { message: 'Change your own password on the Your account page.' });
		}
		if (custom && custom.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				message: `A password needs at least ${MIN_PASSWORD_LENGTH} characters.`
			});
		}

		const accounts = await listAccounts();
		const target = accounts.find((row) => row.id === userId);
		if (!target) return fail(400, { message: 'Unknown account.' });

		const password = custom || generateAccessPassword();

		await setAccountPassword(userId, password);

		// the only time it is readable — pass it on out of band, there is no
		// mail server to send it from
		return { reset: { email: target.email, password } };
	}
};
