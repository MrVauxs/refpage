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
	ORIGIN: {
		description: 'Optional public base URL, e.g. `https://refs.example.com`. Behind a reverse proxy (Coolify) leave it unset — the origin is taken from the `x-forwarded-proto` / `x-forwarded-host` headers instead.',
		schema: optional()
	},
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
