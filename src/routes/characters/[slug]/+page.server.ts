import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { characterForKey } from '#lib/server/access.ts';
import { getCharacterBySlug } from '#lib/server/characters.ts';
import { imagesForCharacter } from '#lib/server/images.ts';

export const load: PageServerLoad = async (event) => {
	let character;

	if (event.locals.user) character = await getCharacterBySlug(event.params.slug);
	else if (event.locals.guest) {
		character = await characterForKey(event.locals.guest.keyId, event.params.slug);
	} else redirect(302, '/');

	if (!character) error(404, 'No such character.');
	return { character, images: await imagesForCharacter(character.id) };
};
