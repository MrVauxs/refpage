<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '#lib/format.ts';

	let { data, form } = $props();
</script>

<svelte:head><title>Characters · refpage</title></svelte:head>

<h1 class="text-xl">Characters</h1>
<p class="mt-1 text-sm text-surface-600-400">
	{data.characters.length}
	{data.characters.length === 1 ? 'character' : 'characters'}. A character is only visible to
	someone with a password that names it.
</p>

<form
	class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
	method="post"
	action="?/create"
	use:enhance
>
	<label class="label sm:w-56">
		<span class="label-text text-xs text-surface-600-400">Name</span>
		<input class="input text-base" name="name" value={form?.name ?? ''} required />
	</label>

	<label class="label flex-1">
		<span class="label-text text-xs text-surface-600-400">Summary <span class="opacity-60">(optional)</span></span>
		<input class="input text-base" name="summary" value={form?.summary ?? ''} />
	</label>

	<button class="btn preset-filled shrink-0">Add character</button>
</form>

{#if form?.message}
	<p class="mt-3 text-sm text-error-600-400" role="alert">{form.message}</p>
{/if}

{#if data.characters.length}
	<div class="table-wrap mt-8">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Slug</th>
					<th class="text-right">Shared with</th>
					<th class="text-right">Updated</th>
				</tr>
			</thead>
			<tbody>
				{#each data.characters as row (row.id)}
					<tr>
						<td>
							<a href="/admin/characters/{row.id}" class="text-surface-950-50 no-underline hover:underline">
								{row.name}
							</a>
							{#if row.summary}
								<span class="block truncate text-xs text-surface-600-400">{row.summary}</span>
							{/if}
						</td>
						<td class="font-mono text-xs text-surface-600-400">{row.slug}</td>
						<td class="text-right tabular-nums">
							{row.shares}
							{row.shares === 1 ? 'password' : 'passwords'}
						</td>
						<td class="text-right text-surface-600-400">{formatDate(row.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p
		class="mt-8 rounded-container border border-dashed border-surface-200-800 p-8 text-center text-sm text-surface-600-400"
	>
		Nothing here yet. Add the first character above.
	</p>
{/if}
