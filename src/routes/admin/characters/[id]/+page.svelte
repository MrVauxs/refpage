<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

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

<form class="mt-8 max-w-lg space-y-4" method="post" action="?/update" use:enhance>
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
		{:else if form?.saved}
			<span class="text-sm text-surface-600-400">Saved.</span>
		{/if}
	</div>
</form>

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
