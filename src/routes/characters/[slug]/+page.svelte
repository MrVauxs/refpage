<script lang="ts">
	let { data } = $props();
	let selected = $state<string[]>([]);
	let showVariants = $state(false);
	let hovered = $state<Record<string, string>>({});

	function groupFor(image: (typeof data.images)[number]) {
		const rootId = image.variantOfId ?? image.id;
		const root = data.images.find((item) => item.id === rootId);
		const variants = data.images.filter((item) => item.variantOfId === rootId);
		return root ? [root, ...variants] : [image];
	}

	function searchTags(image: (typeof data.images)[number]) {
		return showVariants ? image.tags : [...new Set(groupFor(image).flatMap((item) => item.tags))];
	}

	function previewFor(image: (typeof data.images)[number]) {
		return data.images.find((item) => item.id === hovered[image.id]) ?? image;
	}

	let galleryImages = $derived(
		showVariants ? data.images : data.images.filter((image) => !image.variantOfId)
	);
	let allTags = $derived(
		[...new Set(galleryImages.flatMap((image) => searchTags(image)))]
			.sort()
			.map((tag) => ({
				tag,
				count: galleryImages.filter((image) => searchTags(image).includes(tag)).length
			}))
	);
	let images = $derived(
		selected.length
			? galleryImages.filter((image) => selected.every((tag) => searchTags(image).includes(tag)))
			: galleryImages
	);

	function toggle(tag: string) {
		selected = selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag];
	}
</script>

<svelte:head><title>{data.character.name} · refpage</title></svelte:head>

<main class="mx-auto min-h-dvh max-w-7xl px-6 py-8">
	<a href="/characters" class="text-sm text-surface-600-400 no-underline hover:underline">← Characters</a>
	<h1 class="mt-4 text-xl">{data.character.name}</h1>

	<div class="mt-8 grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] gap-5 lg:gap-8">
		<aside aria-label="Filter by tag">
			<div class="sticky top-4">
				<label class="mb-5 flex items-center gap-2 text-xs text-surface-600-400">
					<input class="checkbox checkbox-sm" type="checkbox" bind:checked={showVariants} />
					Show variants
				</label>
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-xs font-medium uppercase tracking-wide text-surface-600-400">Tags</h2>
					{#if selected.length}<button class="text-xs text-surface-600-400 hover:underline" onclick={() => (selected = [])}>Clear</button>{/if}
				</div>
				<ul class="mt-3 space-y-1">
					{#each allTags as option (option.tag)}
						<li>
							<button
								class="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left font-mono text-xs {selected.includes(option.tag) ? 'bg-primary-500 text-primary-contrast-500' : 'text-primary-300 hover:bg-surface-100-900'}"
								onclick={() => toggle(option.tag)}
								aria-pressed={selected.includes(option.tag)}
							>
								<span class="truncate">{option.tag}</span>
								<span class="tabular-nums opacity-70">{option.count}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</aside>

		<div class="min-w-0">
			{#if images.length}
				<div class="columns-1 gap-4 md:columns-2 xl:columns-3">
					{#each images as image (image.id)}
						{@const variants = groupFor(image)}
						{@const preview = previewFor(image)}
						<figure
							class="group mb-4 break-inside-avoid overflow-hidden rounded-container border border-surface-200-800"
							onmouseleave={() => (hovered[image.id] = '')}
						>
							<div class="relative">
								<a href="/uploads/{preview.fileKey}" target="_blank">
									<img class="w-full bg-surface-100-900" src="/uploads/{preview.fileKey}" alt={preview.description || data.character.name} />
								</a>
								{#if variants.length > 1}
									<div class="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-surface-950/85 p-2 opacity-100 backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
										{#each variants as variant, index (variant.id)}
											<a
												href="/uploads/{variant.fileKey}"
												target="_blank"
												class="block size-10 shrink-0 overflow-hidden rounded border-2 {preview.id === variant.id ? 'border-primary-400' : 'border-surface-600'}"
												onmouseenter={() => (hovered[image.id] = variant.id)}
												onfocus={() => (hovered[image.id] = variant.id)}
												aria-label="Open {index === 0 ? 'main image' : `variant ${index}`}"
											>
												<img class="size-full object-cover" src="/uploads/{variant.fileKey}" alt="" />
											</a>
										{/each}
									</div>
								{/if}
							</div>
							{#if preview.description}<figcaption class="whitespace-pre-wrap p-3 text-sm text-surface-600-400">{preview.description}</figcaption>{/if}
						</figure>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-surface-600-400">{selected.length ? 'No matches.' : 'No images.'}</p>
			{/if}
		</div>
	</div>
</main>
