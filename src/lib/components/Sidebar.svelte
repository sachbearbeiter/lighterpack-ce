<script lang="ts">
	import SidebarLists from './SidebarLists.svelte';

	interface List {
		id: string;
		name: string;
		sortOrder: number;
	}

	interface Props {
		lists: List[];
		activeListId: string | null;
		onSelectList: (id: string) => void;
		onNewList: () => void;
	}

	let { lists, activeListId, onSelectList, onNewList }: Props = $props();
</script>

<div id="sidebar">
	<div id="scrollable">
		<h1>LighterPack <span>(beta)</span></h1>

		<SidebarLists
			{lists}
			{activeListId}
			onSelect={onSelectList}
			onNew={onNewList}
		/>
	</div>
</div>
