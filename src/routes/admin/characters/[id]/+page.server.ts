import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '#lib/server/admin.ts';
import {
	deleteCharacter,
	getCharacter,
	keysForCharacter,
	updateCharacter
} from '#lib/server/characters.ts';
import {
	createImage,
	imagesForCharacter,
	removeImage,
	setCharacterCover,
	updateImage
} from '#lib/server/images.ts';
import { deleteUpload, saveUpload, UploadError } from '#lib/server/uploads.ts';

export const load: PageServerLoad = async (event) => {
	const row = await getCharacter(event.params.id);

	if (!row) error(404, 'No such character.');

	return {
		character: row,
		keys: await keysForCharacter(row.id),
		images: await imagesForCharacter(row.id)
	};
};

export const actions: Actions = {
	update: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const summary = String(form.get('summary') ?? '').trim();

		if (!name) return fail(400, { message: 'Give the character a name.' });

		await updateCharacter(event.params.id, { name, summary });

		return { saved: true };
	},

	upload: async (event) => {
		await requireUser(event);
		if (!(await getCharacter(event.params.id))) return fail(404, { uploadError: 'Character not found.' });

		const form = await event.request.formData();
		const files = form
			.getAll('images')
			.filter((value): value is File => value instanceof File && value.size > 0);
		const description = String(form.get('description') ?? '').trim().slice(0, 2000);
		const tags = String(form.get('tags') ?? '');

		if (!files.length) return fail(400, { uploadError: 'Choose at least one image.' });

		const savedKeys: string[] = [];
		const createdIds: string[] = [];
		try {
			for (const file of files) {
				const fileKey = await saveUpload(file);
				savedKeys.push(fileKey);
				const image = await createImage({
					characterId: event.params.id,
					fileKey,
					description,
					tags
				});
				createdIds.push(image.id);
			}
		} catch (error) {
			await Promise.all(createdIds.map((id) => removeImage(id, event.params.id)));
			await Promise.all(savedKeys.map(deleteUpload));
			if (error instanceof UploadError) return fail(400, { uploadError: error.message });
			throw error;
		}

		return { uploaded: files.length };
	},

	updateImage: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const imageId = String(form.get('imageId') ?? '');
		const description = String(form.get('description') ?? '').trim().slice(0, 2000);
		const tags = String(form.get('tags') ?? '');
		const variantOfId = String(form.get('variantOfId') ?? '') || null;
		if (!imageId) return fail(400, { imageError: 'Image not found.' });

		if (!(await updateImage(imageId, event.params.id, { description, tags, variantOfId }))) {
			return fail(404, { imageError: 'Image not found.' });
		}

		return { imageSaved: imageId };
	},

	setCover: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const imageId = String(form.get('imageId') ?? '');
		if (!(await setCharacterCover(imageId, event.params.id))) {
			return fail(404, { imageError: 'Image not found.' });
		}

		return { coverSaved: imageId };
	},

	deleteImage: async (event) => {
		await requireUser(event);

		const form = await event.request.formData();
		const imageId = String(form.get('imageId') ?? '');
		const fileKey = await removeImage(imageId, event.params.id);
		if (!fileKey) return fail(404, { imageError: 'Image not found.' });
		await deleteUpload(fileKey);

		return { imageDeleted: true };
	},

	delete: async (event) => {
		await requireUser(event);

		// the join rows go with it, so any password that only named this
		// character stops unlocking anything
		await deleteCharacter(event.params.id);

		redirect(303, '/admin/characters');
	}
};
