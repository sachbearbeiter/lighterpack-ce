<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head>
	<title>LighterPack – Track your gear, lighten your load</title>
</svelte:head>

<div id="lpWelcomeContainer">
	<div id="lpWelcome" class="lpContainer">
		<h1>
			<strong>LighterPack</strong> helps you track and share your gear list and pack weight.
		</h1>

		<div class="lpWelcomeContent">
			<div class="lpWelcomeRegisterContainer">
				<div class="lpWelcomeRegister">
					<h3 class="lpWelcomeContainerHeader">Register an account</h3>
					<form method="POST" action="?/register" use:enhance>
						<div class="lpFields">
							<input type="text" name="username" placeholder="Username" autocomplete="username" required />
							<input type="email" name="email" placeholder="Email address" autocomplete="email" required />
							<input type="password" name="password" placeholder="Password" autocomplete="new-password" required />
							<input type="password" name="passwordConfirm" placeholder="Confirm password" autocomplete="new-password" required />
						</div>
						{#if form?.registerError}
							<ul class="lpError"><li>{form.registerError}</li></ul>
						{/if}
						<div class="lpButtons">
							<button type="submit" class="lpButton">Register</button>
							<a href="/signin" class="lpHref">Already registered? Sign in →</a>
						</div>
					</form>
				</div>

				<div class="lpValuePropContainer">
					<ul id="lpValueProp">
						<li>
							<h3><strong>Enter</strong> your gear</h3>
							<p>Add every item from your next adventure. Track weight, price, and quantity.</p>
						</li>
						<li>
							<h3><strong>Visualize</strong> your kit</h3>
							<p>See weight broken down by category with interactive charts.</p>
						</li>
						<li>
							<h3><strong>Share</strong> your list</h3>
							<p>Get a public link. Anyone can view your list without an account.</p>
						</li>
					</ul>
				</div>
			</div>

			<div class="lpWelcomeSigninContainer">
				<h3 class="lpWelcomeContainerHeader">Sign in</h3>
				<form method="POST" action="?/signin" use:enhance>
					<div class="lpFields">
						<input type="text" name="username" placeholder="Username" autocomplete="username" required />
						<input type="password" name="password" placeholder="Password" autocomplete="current-password" required />
					</div>
					{#if form?.signinError}
						<ul class="lpError"><li>{form.signinError}</li></ul>
					{/if}
					<div class="lpButtons">
						<button type="submit" class="lpButton">Sign in</button>
						<a href="/forgot-password" class="lpHref">Forgot username or password?</a>
					</div>
				</form>
			</div>
		</div>
	</div>

	<div id="lpWelcomeFooter">
		<span>Site by <a class="lpHref" href="https://galenmaly.com">Galen Maly</a> · Community Edition</span>
		<span>Copyleft ↄ</span>
	</div>
</div>

<style>
	main {
		padding: var(--size-8);
		max-width: 960px;
		margin: 0 auto;
	}
</style>
