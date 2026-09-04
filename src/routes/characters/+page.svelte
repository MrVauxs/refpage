<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let { data } = $props();

	let leaving = $state(false);
	let query = $state('');
	let filtered = $derived.by(() => {
		const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (!terms.length) return data.characters;
		return data.characters.filter((row) => {
			const haystack = `${row.name} ${row.tags.join(' ')}`.toLowerCase();
			return terms.every((term) => haystack.includes(term));
		});
	});

	async function leave() {
		leaving = true;

		// a guest has no Better Auth session to end — only the access cookie
		if (data.viewer.kind === 'admin') await authClient.signOut();
		else await fetch('/api/access', { method: 'DELETE' });

		await goto('/', { invalidateAll: true });
	}
</script>

<svelte:head><title>References · refpage</title></svelte:head>

<div class="min-h-dvh">
	<header class="border-b border-surface-200-800">
		<div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
			<span class="font-mono text-sm text-surface-950-50">refpage</span>

			<div class="ml-auto flex items-center gap-4">
				{#if data.viewer.kind === 'admin'}
					<a href="/admin" class="text-sm text-surface-600-400 no-underline hover:underline">Admin</a>
				{/if}
				<button class="btn btn-sm preset-tonal" onclick={leave} disabled={leaving}>
					{leaving ? 'Leaving…' : 'Leave'}
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-6 py-10">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<h1 class="text-xl">Characters</h1>
			<label class="label w-full sm:w-72">
				<span class="sr-only">Filter characters</span>
				<input class="input text-sm" type="search" placeholder="Filter names or tags" bind:value={query} />
			</label>
		</div>

		{#if filtered.length}
			<ul class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as row (row.id)}
					<li class="overflow-hidden rounded-container border border-surface-200-800">
						<a href="/characters/{row.slug}" class="block no-underline">
							{#if row.cover}
								<img class="aspect-[4/3] w-full bg-surface-100-900 object-cover" src="/uploads/{row.cover}" alt="" />
							{:else}
								<div class="grid aspect-[4/3] place-items-center bg-surface-100-900 text-xs text-surface-600-400">No images</div>
							{/if}
							<div class="flex items-center justify-between gap-3 p-4">
								<h2 class="truncate text-base text-surface-950-50">{row.name}</h2>
								<span class="shrink-0 text-xs text-surface-600-400">{row.count}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p
				class="mt-8 rounded-container border border-dashed border-surface-200-800 p-10 text-center text-sm text-surface-600-400"
			>
				{query ? 'No matches.' : 'No characters.'}
			</p>
		{/if}
	</main>
</div>
