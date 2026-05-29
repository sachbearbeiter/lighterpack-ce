<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>LighterPack – {data.username}</title></svelte:head>

<div id="main">
	<div id="sidebar">
		<h1>LighterPack</h1>
		<p style="color:#ccc">Welcome, {data.username}!</p>
		<section>
			<h2>My Lists</h2>
			<p style="color:#aaa">Coming soon…</p>
		</section>
	</div>

	<div class="lpList">
		<div id="header" class="clearfix">
			<span class="headerItem" id="hamburger" title="Toggle sidebar">☰</span>
			<input id="lpListName" class="headerItem" type="text" placeholder="List name…" />
		</div>

		<p style="padding:20px;color:#888">Your gear lists will appear here.</p>

		<div id="lpFooter">
			<span>LighterPack Community Edition</span>
			<span>Copyleft ↄ</span>
		</div>
	</div>
</div>
