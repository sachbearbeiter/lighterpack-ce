<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<svelte:head><title>Sign in – LighterPack</title></svelte:head>

<div class="lpBlackout"></div>
<div class="lpModal" id="signin">
	<div class="lpModalHeader">
		<h2>Sign in</h2>
		<a class="lpHref" href="/">Need to register?</a>
	</div>
	<form class="lpFields" method="POST" use:enhance>
		<input type="text" name="username" placeholder="Username" autocomplete="username" required />
		<input type="password" name="password" placeholder="Password" autocomplete="current-password" required />
		{#if form?.error}
			<ul class="lpError"><li>{form.error}</li></ul>
		{/if}
		<div class="lpButtons">
			<button type="submit" class="lpButton">Sign in</button>
			<a class="lpHref" href="/forgot-password">Forgot username or password?</a>
		</div>
	</form>
</div>
