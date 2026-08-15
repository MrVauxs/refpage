import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// The container health check calls this over the loopback address, so the
	// request carries no x-forwarded-host and Better Auth cannot match it against
	// ALLOWED_HOSTS. It needs no session either, so skip auth entirely.
	if (event.url.pathname === '/api/health') return resolve(event);

	// prerendering runs this hook too, and there is no session (or database) at
	// build time
	if (!building) {
		const session = await auth.api.getSession({ headers: event.request.headers });

		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
