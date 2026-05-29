<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ListHeader from '$lib/components/ListHeader.svelte';
	import List from '$lib/components/List.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Client-seitiger State (analog zu $store.state im Original) ──────────
	let showSidebar = $state(true);
	let activeListId = $state<string | null>(data.lists?.[0]?.id ?? null);
	let lists = $state(data.lists ?? []);

	// Aktive Liste aus dem Array
	const activeList = $derived(lists.find((l) => l.id === activeListId) ?? null);

	// Kategorien der aktiven Liste (TODO: per-Liste filtern wenn CategoryItems geladen)
	const activeCategories = $derived(data.categories ?? []);

	// ── Handlers ────────────────────────────────────────────────────────────
	function toggleSidebar() {
		showSidebar = !showSidebar;
	}

	function selectList(id: string) {
		activeListId = id;
		// TODO: URL updaten (Todo #2 — URL-Routing)
	}

	function handleNewList() {
		// TODO: CRUD — Todo #3
		console.log('newList');
	}

	function handleListNameChange(name: string) {
		if (!activeListId) return;
		lists = lists.map((l) => (l.id === activeListId ? { ...l, name } : l));
		// TODO: debounced API call
	}

	function handleNewCategory() {
		// TODO: CRUD — Todo #4
		console.log('newCategory');
	}
</script>

<svelte:head>
	<title>LighterPack – {data.username}</title>
</svelte:head>

<div id="main" class:lpHasSidebar={showSidebar}>
	<Sidebar
		{lists}
		{activeListId}
		onSelectList={selectList}
		onNewList={handleNewList}
	/>

	<div class="lpList lpTransition">
		<ListHeader
			listName={activeList?.name ?? ''}
			hasSidebar={showSidebar}
			username={data.username}
			onToggleSidebar={toggleSidebar}
			onListNameChange={handleListNameChange}
		/>

		<List
			list={activeList}
			categories={activeCategories}
			onNewCategory={handleNewCategory}
		/>

		<div id="lpFooter">
			<div class="lpSiteBy">
				Site by <a class="lpHref" href="https://galenmaly.com" target="_blank" rel="noopener noreferrer">Galen Maly</a>
				and <a class="lpHref" href="https://github.com/galenmaly/lighterpack/graphs/contributors" target="_blank" rel="noopener noreferrer">friends</a>.
			</div>
			<div class="lpContact">
				<a class="lpHref" href="https://github.com/sachbearbeiter/lighterpack-ce" target="_blank" rel="noopener noreferrer">Copyleft</a> LighterPack CE
			</div>
		</div>
	</div>
</div>
