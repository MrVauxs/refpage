import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { EMAIL_NOT_ALLOWED, auth } from '#lib/server/auth.ts';

/** Origins the social sign-in action is permitted to redirect to. */
const OAUTH_ORIGINS = ['https://github.com'];

/** Where a failed OAuth handshake comes back to, as `?error=CODE`. */
const ERROR_CALLBACK_URL = '/demo/better-auth/login';

const ERROR_MESSAGES: Record<string, string> = {
	[EMAIL_NOT_ALLOWED]: 'That account’s email address is not allowed to sign up here.'
};

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/better-auth');
	}

	const error = event.url.searchParams.get('error');

	return {
		// the provider and Better Auth both report failures as a redirect back
		// here, so the page has to read them off the URL rather than from `form`
		message: error ? (ERROR_MESSAGES[error] ?? 'Sign-in failed.') : undefined
	};
};

export const actions: Actions = {
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'github';
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/demo/better-auth';

		const result = await auth.api.signInSocial({
			// the headers are what let Better Auth resolve the public origin, and
			// therefore build an absolute OAuth `redirect_uri`
			headers: event.request.headers,
			body: {
				provider: provider as "github",
				callbackURL,
				errorCallbackURL: ERROR_CALLBACK_URL
			}
		});

		if (result.url) {
			// SvelteKit blocks external redirects by default; the OAuth handshake
			// needs one, so allow exactly the providers we configure
			return redirect(302, result.url, { external: OAUTH_ORIGINS });
		}
		return fail(400, { message: 'Social sign-in failed' });
	},
};
