import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { charactersForKey } from '#lib/server/access.ts';
import { listCharacters } from '#lib/server/characters.ts';
import { imageSummariesForCharacters } from '#lib/server/images.ts';

export const load: PageServerLoad = async (event) => {
	// signing in outranks a share password, and the owner sees everything
	if (event.locals.user) {
		const characters = await listCharacters();

		const summaries = await imageSummariesForCharacters(characters.map((row) => row.id));
		return {
			viewer: { kind: 'admin' as const, label: event.locals.user.email },
			characters: characters.map(({ id, slug, name }) => ({
				id,
				slug,
				name,
				...(summaries.get(id) ?? { count: 0, cover: null, tags: [] })
			}))
		};
	}

	if (event.locals.guest) {
		const characters = await charactersForKey(event.locals.guest.keyId);
		const summaries = await imageSummariesForCharacters(characters.map((row) => row.id));
		return {
			viewer: { kind: 'guest' as const, label: event.locals.guest.label },
			characters: characters.map(({ id, slug, name }) => ({
				id,
				slug,
				name,
				...(summaries.get(id) ?? { count: 0, cover: null, tags: [] })
			}))
		};
	}

	redirect(302, '/');
};
