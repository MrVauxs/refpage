import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '#lib/server/admin.ts';
import { createCharacter, listCharacters, shareCounts } from '#lib/server/characters.ts';

export const load: PageServerLoad = async () => {
	const characters = await listCharacters();
	const shares = await shareCounts(characters.map((row) => row.id));

	return {
		characters: characters.map((row) => ({ ...row, shares: shares.get(row.id) ?? 0 }))
	};
};

export const actions: Actions = {
	// the layout guard only covers loads — an action reaches the server first
	create: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const summary = String(form.get('summary') ?? '').trim();

		if (!name) return fail(400, { message: 'Give the character a name.', name, summary });

		const row = await createCharacter({ name, summary });

		redirect(303, `/admin/characters/${row.id}`);
	}
};
