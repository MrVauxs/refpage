import type { User, Session } from 'better-auth';
import type { Guest } from '#lib/server/access.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			/** Set only when there is no `user` — a share password, not an account. */
			guest?: Guest;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
