import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charactersForKey } from '#lib/server/access.ts';
import { listCharacters } from '#lib/server/characters.ts';

export const load: PageServerLoad = async (event) => {
	// signing in outranks a share password, and the owner sees everything
	if (event.locals.user) {
		const characters = await listCharacters();

		return {
			viewer: { kind: 'admin' as const, label: event.locals.user.email },
			characters: characters.map(({ id, slug, name, summary }) => ({ id, slug, name, summary }))
		};
	}

	if (event.locals.guest) {
		return {
			viewer: { kind: 'guest' as const, label: event.locals.guest.label },
			characters: await charactersForKey(event.locals.guest.keyId)
		};
	}

	redirect(302, '/');
};
