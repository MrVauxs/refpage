import {
	ALLOWED_HOSTS,
	BETTER_AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET
} from '$app/env/private';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';

function create() {
	// only register GitHub when it is actually configured — otherwise a
	// deployment without OAuth credentials fails to boot
	const socialProviders =
		GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
			? {
					github: {
						clientId: GITHUB_CLIENT_ID,
						clientSecret: GITHUB_CLIENT_SECRET
					}
				}
			: {};

	const allowedHosts = ALLOWED_HOSTS.split(',')
		.map((host) => host.trim())
		.filter(Boolean);

	return betterAuth({
		// A *static* baseURL has to byte-match the origin adapter-node derives
		// from the proxy headers, or `svelteKitHandler` stops recognising
		// `/api/auth/*` and every auth route 404s. So resolve it per request
		// instead, restricted to the hosts we actually serve — that also gives
		// OAuth providers an absolute `redirect_uri`.
		baseURL: allowedHosts.length
			? {
					allowedHosts,
					// used when a call can't see the request headers
					fallback: /[*?]/.test(allowedHosts[0]) ? undefined : `https://${allowedHosts[0]}`
				}
			: undefined,
		// the host and scheme come from the reverse proxy in front of us. Safe
		// here because the container is only reachable through that proxy.
		trustedProxyHeaders: true,
		secret: BETTER_AUTH_SECRET,
		database: drizzleAdapter(db, { provider: 'sqlite' }),
		emailAndPassword: { enabled: true },
		socialProviders,
		plugins: [
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		]
	});
}

type Auth = ReturnType<typeof create>;

let instance: Auth | undefined;

/**
 * Better Auth refuses to initialise without a secret, so it is created on first
 * use rather than on import — that keeps `bun run build` (which loads this
 * module while analysing routes) from needing production secrets.
 */
export const auth: Auth = new Proxy({} as Auth, {
	get(_target, property) {
		instance ??= create();
		const value = Reflect.get(instance, property);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
