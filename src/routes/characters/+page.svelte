<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let { data } = $props();

	let leaving = $state(false);

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
		<h1 class="text-xl">References</h1>
		<p class="mt-1 text-sm text-surface-600-400">
			{#if data.viewer.kind === 'guest'}
				Shared with you as <span class="text-surface-950-50">{data.viewer.label}</span>.
			{:else}
				Every character on the site.
			{/if}
		</p>

		{#if data.characters.length}
			<ul class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.characters as row (row.id)}
					<li class="card preset-outlined-surface-200-800 p-5">
						<h2 class="text-base text-surface-950-50">{row.name}</h2>
						{#if row.summary}
							<p class="mt-1 text-sm text-pretty text-surface-600-400">{row.summary}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p
				class="mt-8 rounded-container border border-dashed border-surface-200-800 p-10 text-center text-sm text-surface-600-400"
			>
				This password does not unlock anything yet.
			</p>
		{/if}
	</main>
</div>
