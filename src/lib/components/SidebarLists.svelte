<script lang="ts">
	interface List {
		id: string;
		name: string;
		sortOrder: number;
	}

	interface Props {
		lists: List[];
		activeListId: string | null;
		onSelect: (id: string) => void;
		onNew: () => void;
	}

	let { lists, activeListId, onSelect, onNew }: Props = $props();
</script>

<section id="listContainer">
	<div class="listContainerHeader">
		<h2>Lists</h2>
		<button class="lpAdd" onclick={onNew}>+ Add new list</button>
	</div>

	<ul id="lists">
		{#each lists as list (list.id)}
			<li class="lpLibraryList" class:lpActive={list.id === activeListId}>
				<button class="lpListName" onclick={() => onSelect(list.id)}>{list.name || 'New list'}</button>
			</li>
		{/each}
	</ul>
</section>

<style>
	#listContainer {
		flex: 0 0 auto;
	}

	.listContainerHeader {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
	}

	.listContainerHeader h2 {
		margin: 0;
	}

	.lpAdd {
		color: var(--blue2);
		cursor: pointer;
		font-size: 12px;
	}

	.lpAdd:hover {
		text-decoration: underline;
	}

	#lists {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 25vh;
		overflow-y: auto;
	}

	.lpLibraryList {
		border-top: 1px dotted #999;
		cursor: pointer;
		display: flex;
		margin: 0 10px;
		padding: 6px 0;
		position: relative;
	}

	.lpLibraryList:first-child {
		border-top: none;
		padding-top: 10px;
	}

	.lpLibraryList.lpActive {
		color: var(--yellow1);
		font-weight: bold;
	}

	.lpLibraryList:hover:not(.lpActive) .lpListName {
		text-decoration: underline;
	}

	.lpListName {
		flex: 1 1 auto;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
