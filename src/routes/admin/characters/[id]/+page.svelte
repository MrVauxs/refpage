<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { createToaster, Toast } from '@skeletonlabs/skeleton-svelte';

	let { data, form } = $props();
	const toaster = createToaster({ placement: 'bottom-end', duration: 2200, gap: 8 });

	const handleForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (
				result.type === 'success' &&
				result.data &&
				('saved' in result.data || 'imageSaved' in result.data || 'coverSaved' in result.data)
			) {
				toaster.success({ title: 'Saved' });
			}
		};
	};

	// `enhance` runs its own submit handling and ignores a prevented default, so
	// the confirmation sits on a plain form that posts the old-fashioned way
	function confirmDelete(event: SubmitEvent) {
		if (!confirm(`Delete ${data.character.name}? This cannot be undone.`)) {
			event.preventDefault();
		}
	}
</script>

<svelte:head><title>{data.character.name} · refpage</title></svelte:head>

<a href="/admin/characters" class="text-sm text-surface-600-400 no-underline hover:underline">
	← Characters
</a>

<h1 class="mt-4 text-xl">{data.character.name}</h1>
<p class="mt-1 font-mono text-xs text-surface-600-400">/{data.character.slug}</p>

<form
	class="mt-8 max-w-lg space-y-4"
	method="post"
	action="?/update"
	use:enhance={handleForm}
>
	<label class="label">
		<span class="label-text text-xs text-surface-600-400">Name</span>
		<input class="input text-base" name="name" value={data.character.name} required />
	</label>

	<label class="label">
		<span class="label-text text-xs text-surface-600-400">Summary</span>
		<textarea class="textarea text-base" name="summary" rows="3">{data.character.summary ?? ''}</textarea>
	</label>

	<div class="flex items-center gap-3">
		<button class="btn preset-filled">Save</button>
		{#if form?.message}
			<span class="text-sm text-error-600-400" role="alert">{form.message}</span>
		{/if}
	</div>
</form>

<section class="mt-12">
	<h2 class="text-sm text-surface-600-400">Images</h2>

	<form
		class="mt-3 grid gap-3 rounded-container border border-surface-200-800 p-4 sm:grid-cols-2"
		method="post"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={handleForm}
	>
		<label class="label sm:col-span-2">
			<span class="label-text text-xs text-surface-600-400">Images</span>
			<input class="input text-sm" type="file" name="images" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple required />
		</label>
		<label class="label sm:col-span-2">
			<span class="label-text text-xs text-surface-600-400">Description</span>
			<textarea class="textarea text-base" name="description" rows="4"></textarea>
		</label>
		<label class="label sm:col-span-2">
			<span class="label-text text-xs text-surface-600-400">Tags</span>
			<input class="input font-mono text-sm" name="tags" placeholder="front_view casual_outfit" />
		</label>
		<div class="flex items-center gap-3 sm:col-span-2">
			<button class="btn preset-filled">Upload images</button>
			{#if form?.uploadError}<span class="text-sm text-error-600-400" role="alert">{form.uploadError}</span>{/if}
		</div>
	</form>

	{#if data.images.length}
		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			{#each data.images as image (image.id)}
				{@const imageNumber = data.images.findIndex((candidate) => candidate.id === image.id) + 1}
				<article class="overflow-hidden rounded-container border border-surface-200-800">
					<div class="relative">
						<a href="/uploads/{image.fileKey}" target="_blank">
							<img class="aspect-square w-full bg-surface-100-900 object-contain" src="/uploads/{image.fileKey}" alt={image.description || data.character.name} />
						</a>
						{#if image.isCover}<span class="badge preset-filled absolute top-3 left-3 text-xs">Main</span>{/if}
					</div>
					<form
						class="space-y-3 p-4"
						method="post"
						action="?/updateImage"
						use:enhance={handleForm}
					>
						<input type="hidden" name="imageId" value={image.id} />
						<label class="label">
							<span class="label-text text-xs text-surface-600-400">Description</span>
							<textarea class="textarea text-sm" name="description" rows="4">{image.description ?? ''}</textarea>
						</label>
						<label class="label">
							<span class="label-text text-xs text-surface-600-400">Tags</span>
							<input class="input font-mono text-xs" name="tags" value={image.tags.join(' ')} />
						</label>
						<label class="label">
							<span class="label-text text-xs text-surface-600-400">Variant of</span>
							<select class="select text-sm" name="variantOfId" value={image.variantOfId ?? ''}>
								<option value="">None</option>
								{#each data.images.filter((candidate) => candidate.id !== image.id) as candidate (candidate.id)}
									{@const candidateNumber = data.images.findIndex((item) => item.id === candidate.id) + 1}
									<option value={candidate.id}>
										Image {candidateNumber}{candidate.description ? ` — ${candidate.description.slice(0, 48)}` : ''}
									</option>
								{/each}
							</select>
						</label>
						<div class="flex items-center justify-between gap-3">
							<div class="flex items-center gap-2">
								<button class="btn btn-sm preset-tonal">Save</button>
								<button
									class="btn btn-sm preset-tonal"
									formaction="?/setCover"
									disabled={image.isCover}
								>
									{image.isCover ? 'Main image' : 'Set as main'}
								</button>
								<span class="text-xs text-surface-600-400">Image {imageNumber}</span>
							</div>
							<button class="btn btn-sm preset-tonal-error" formaction="?/deleteImage" onclick={(event) => { if (!confirm('Delete this image?')) event.preventDefault(); }}>Delete</button>
						</div>
					</form>
				</article>
			{/each}
		</div>
	{:else}
		<p class="mt-4 text-sm text-surface-600-400">No images.</p>
	{/if}
</section>

<Toast.Group
	{toaster}
	class="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
>
	{#snippet children(toast)}
		<Toast
			{toast}
			class="card preset-filled-success flex items-center justify-between gap-4 px-4 py-3 shadow-xl"
		>
			<Toast.Message>
				<Toast.Title class="text-sm font-medium">{toast.title}</Toast.Title>
			</Toast.Message>
			<Toast.CloseTrigger class="btn btn-sm preset-tonal" aria-label="Dismiss" />
		</Toast>
	{/snippet}
</Toast.Group>

<section class="mt-12">
	<h2 class="text-sm text-surface-600-400">Passwords that unlock this character</h2>

	{#if data.keys.length}
		<ul class="mt-3 divide-y divide-surface-200-800 border-y border-surface-200-800">
			{#each data.keys as key (key.id)}
				<li class="flex items-center justify-between gap-4 py-3">
					<span class="truncate text-sm text-surface-950-50">{key.label}</span>
					{#if key.revokedAt}
						<span class="badge preset-tonal-error shrink-0 text-xs">revoked</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-3 text-sm text-surface-600-400">
			None yet — nobody outside your account can see this character.
			<a href="/admin/keys">Create a password</a>.
		</p>
	{/if}
</section>

<section class="mt-12 border-t border-surface-200-800 pt-6">
	<h2 class="text-sm text-surface-600-400">Danger zone</h2>
	<div class="mt-3 flex flex-wrap items-center gap-4">
		<form method="post" action="?/delete" onsubmit={confirmDelete}>
			<button class="btn btn-sm preset-tonal-error">Delete character</button>
		</form>
		<p class="text-xs text-surface-600-400">
			Removes it from every password that names it. Not recoverable.
		</p>
	</div>
</section>
