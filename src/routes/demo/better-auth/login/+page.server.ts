import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';

/** Origins the social sign-in action is permitted to redirect to. */
const OAUTH_ORIGINS = ['https://github.com'];

export const load: PageServerLoad = (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/better-auth');
	}
	return {};
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
				callbackURL
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
