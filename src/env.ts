import { defineEnvVars } from '@sveltejs/kit/env';
import { building } from '$app/env';

/**
 * Required when the app runs, but not when it is built — the Docker image is
 * built without a database, a volume or any secrets, and Coolify injects those
 * at runtime.
 */
function runtimeOnly(name: string) {
	return (value: string | undefined) => {
		if (!value && !building) throw new Error(`${name} is not set`);
		return value ?? '';
	};
}

function optional(fallback = '') {
	return (value: string | undefined) => value || fallback;
}

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Path to the SQLite database file, e.g. `/data/db/refpage.db`. Must be on a persistent volume in production.',
		schema: runtimeOnly('DATABASE_URL')
	},
	UPLOAD_DIR: {
		description: 'Directory that uploaded images are written to, e.g. `/data/uploads`. Must be on a persistent volume in production.',
		schema: optional('uploads')
	},
	ALLOWED_HOSTS: {
		description:
			'Comma-separated hostnames the app is served on, e.g. `refs.example.com` (wildcards like `*.example.com` work). Required for OAuth sign-in, which needs an absolute callback URL. Leave unset for email and password only.',
		schema: optional()
	},

	// note: `ORIGIN` is not declared here on purpose. adapter-node bakes it in at
	// build time, so setting it at runtime only half-applies — the server would
	// keep deriving request URLs from the proxy headers while app code saw a
	// different origin. The proxy headers are the single source of truth.
	BETTER_AUTH_SECRET: {
		description: 'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).',
		schema: runtimeOnly('BETTER_AUTH_SECRET')
	},
	GITHUB_CLIENT_ID: {
		description: 'Optional GitHub OAuth client ID. GitHub sign-in is only enabled when this and `GITHUB_CLIENT_SECRET` are both set. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github).',
		schema: optional()
	},
	GITHUB_CLIENT_SECRET: {
		description: 'Optional GitHub OAuth client secret. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github).',
		schema: optional()
	}
});
