import {
	ORIGIN,
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

	return betterAuth({
		baseURL: ORIGIN,
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
