import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { requireUser } from '#lib/server/admin.ts';
import { MIN_PASSWORD_LENGTH, hasPassword } from '#lib/server/accounts.ts';
import { isAdminEmail } from '#lib/server/allowed-emails.ts';

export const load: PageServerLoad = async (event) => {
	const user = await requireUser(event);

	return {
		account: {
			name: user.name,
			email: user.email,
			hasPassword: await hasPassword(user.id),
			isAdmin: isAdminEmail(user.email)
		},
		minLength: MIN_PASSWORD_LENGTH
	};
};

export const actions: Actions = {
	password: async (event) => {
		const user = await requireUser(event);

		const form = await event.request.formData();
		const current = String(form.get('currentPassword') ?? '');
		const next = String(form.get('newPassword') ?? '');
		const confirmation = String(form.get('confirmPassword') ?? '');

		if (next.length < MIN_PASSWORD_LENGTH) {
			return fail(400, { message: `A password needs at least ${MIN_PASSWORD_LENGTH} characters.` });
		}
		if (next !== confirmation) {
			return fail(400, { message: 'The two new passwords are not the same.' });
		}

		// an account that only ever signed in with GitHub has no password to
		// prove, so it gets its first one instead of exchanging the old one
		const existing = await hasPassword(user.id);

		try {
			if (existing) {
				await auth.api.changePassword({
					body: {
						currentPassword: current,
						newPassword: next,
						// this password may be being changed *because* someone else
						// knows the old one, so every other device is signed out
						revokeOtherSessions: true
					},
					headers: event.request.headers
				});
			} else {
				await auth.api.setPassword({
					body: { newPassword: next },
					headers: event.request.headers
				});
			}
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					message: existing
						? 'That current password is not right.'
						: (error.body?.message ?? 'Could not set that password.')
				});
			}

			throw error;
		}

		return { saved: true };
	}
};
