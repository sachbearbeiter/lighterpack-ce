<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	let showDebug = false;
</script>

<svelte:head><title>LighterPack – {data.username}</title></svelte:head>

<div id="main">
	<div id="sidebar">
		<h1>LighterPack</h1>
		<p style="color:#ccc; padding: 0 10px;">Welcome, <strong>{data.username}</strong>!</p>

		<section style="padding: 10px;">
			<h2 style="color:#aaa; font-size:11px; text-transform:uppercase; margin-bottom:6px;">My Lists</h2>
			{#if data.lists && data.lists.length > 0}
				<ul style="list-style:none; padding:0; margin:0;">
					{#each data.lists as list}
						<li style="padding:4px 0; color:#ddd; font-size:13px;">📋 {list.name || '(Unnamed list)'}</li>
					{/each}
				</ul>
			{:else}
				<p style="color:#777; font-size:12px;">No lists yet. Create your first list!</p>
			{/if}
		</section>

		{#if data.library}
			<section style="padding:10px; border-top: 1px solid #333; margin-top:10px;">
				<h2 style="color:#aaa; font-size:11px; text-transform:uppercase; margin-bottom:6px;">Library</h2>
				<p style="color:#888; font-size:12px;">
					{data.itemCount ?? 0} item{(data.itemCount ?? 0) !== 1 ? 's' : ''} ·
					{data.categories?.length ?? 0} categor{(data.categories?.length ?? 0) !== 1 ? 'ies' : 'y'}
				</p>
				<p style="color:#666; font-size:11px;">Unit: {data.library.totalUnit} · {data.library.currencySymbol}</p>
			</section>
		{/if}
	</div>

	<div class="lpList">
		<div id="header" class="clearfix">
			<span class="headerItem" id="hamburger" title="Toggle sidebar">☰</span>
			<input id="lpListName" class="headerItem" type="text" placeholder="New list name…" />
			<span class="headerItem" style="float:right; font-size:12px; color:#aaa; line-height:50px; margin-right:10px;">
				{data.username} · <a href="/" style="color:#aaa;">Sign out</a>
			</span>
		</div>

		<div style="padding:40px 20px; text-align:center; color:#aaa;">
			{#if !data.lists || data.lists.length === 0}
				<p style="font-size:18px; margin-bottom:10px;">Welcome to LighterPack! 🎒</p>
				<p style="font-size:14px;">Create your first list to start tracking your gear.</p>
			{:else}
				<p style="font-size:14px;">Select a list from the sidebar to start editing.</p>
			{/if}
		</div>

		<div id="lpFooter">
			<span>LighterPack Community Edition</span>
			<span>Copyleft ↄ</span>
			<span style="margin-left:auto;">
				<button
					on:click={() => showDebug = !showDebug}
					style="background:none; border:none; color:#666; cursor:pointer; font-size:11px; padding:0;"
				>🐛 debug</button>
			</span>
		</div>

		{#if showDebug}
			<div style="background:#111; border-top:1px solid #333; padding:12px 16px; font-size:11px; font-family:monospace; color:#0f0;">
				<strong style="color:#ff0;">🐛 Debug Info</strong>
				<pre style="margin:8px 0 0; white-space:pre-wrap; color:#8f8;">{JSON.stringify(data.debug, null, 2)}</pre>
				{#if data.library}
					<pre style="margin:4px 0 0; white-space:pre-wrap; color:#88f;">{JSON.stringify({ library: data.library }, null, 2)}</pre>
				{/if}
			</div>
		{/if}
	</div>
</div>
