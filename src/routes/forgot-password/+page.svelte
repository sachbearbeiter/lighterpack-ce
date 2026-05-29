<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<svelte:head><title>Forgot password – LighterPack</title></svelte:head>

<div class="lpBlackout"></div>
<div class="lpModal" id="forgotPassword" style="width:620px">
	<div class="lpModalHeader">
		<h2>Account recovery</h2>
		<a class="lpHref" href="/signin">← Return to sign in</a>
	</div>

	{#if form?.success}
		<p class="lpSuccess">{form.success}</p>
	{:else}
		<div class="columns">
			<div class="lpHalf">
				<h3>Forgot your password?</h3>
				<form method="POST" action="?/byUsername" use:enhance class="lpFields">
					<input type="text" name="username" placeholder="Username" autocomplete="username" required />
					<button type="submit" class="lpButton">Send reset email</button>
				</form>
			</div>
			<div class="lpHalf">
				<h3>Forgot your username?</h3>
				<form method="POST" action="?/byEmail" use:enhance class="lpFields">
					<input type="email" name="email" placeholder="Email address" autocomplete="email" required />
					<button type="submit" class="lpButton">Send username email</button>
				</form>
			</div>
		</div>
	{/if}
</div>
