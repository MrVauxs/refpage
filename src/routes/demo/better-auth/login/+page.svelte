<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// the action reports its own failures, a rejected OAuth handshake comes back
	// as a redirect the load function reads
	let message = $derived(form?.message ?? data.message);
</script>

<h1>Login</h1>
{#if message}
	<p class="text-red-600">{message}</p>
{/if}
<form method="post" action="?/signInSocial" use:enhance>
	<input type="hidden" name="provider" value="github" />
	<input type="hidden" name="callbackURL" value="/demo/better-auth" />
	<button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Sign in with GitHub</button>
</form>
