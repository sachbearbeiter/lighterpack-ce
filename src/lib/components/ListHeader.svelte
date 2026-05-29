<script lang="ts">
	interface Props {
		listName: string;
		hasSidebar: boolean;
		username: string;
		onToggleSidebar: () => void;
		onListNameChange: (name: string) => void;
	}

	let { listName, hasSidebar, username, onToggleSidebar, onListNameChange }: Props = $props();
</script>

<div id="header" class="clearfix">
	<span class="headerItem">
		<!-- Hamburger: 90° wenn Sidebar offen — analog zum Original -->
		<a
			id="hamburger"
			class="lpTransition"
			class:lpHasSidebar={hasSidebar}
			onclick={onToggleSidebar}
			role="button"
			tabindex="0"
			aria-label="Toggle sidebar"
		>
			<!-- Sprite würde hier lpSprite lpHamburger sein; wir nutzen Unicode als Fallback -->
			☰
		</a>
	</span>

	<input
		id="lpListName"
		class="headerItem lpSilent"
		type="text"
		placeholder="List Name"
		autocomplete="off"
		value={listName}
		oninput={(e) => onListNameChange((e.currentTarget as HTMLInputElement).value)}
	/>

	<span class="headerItem signInRegisterButtons" style="margin-left:auto;">
		<span style="color:#aaa; font-size:12px;">
			{username} · <a class="lpHref" href="/api/signout">Sign out</a>
		</span>
	</span>
</div>

<style>
	#hamburger.lpHasSidebar {
		transform: rotate(90deg);
	}
</style>
