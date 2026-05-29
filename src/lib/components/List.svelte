<script lang="ts">
	interface Category {
		id: string;
		name: string;
		color: string | null;
		sortOrder: number;
	}

	interface ListData {
		id: string;
		name: string;
		isPublic: boolean;
	}

	interface Props {
		list: ListData | null;
		categories: Category[];
		onNewCategory: () => void;
	}

	let { list, categories, onNewCategory }: Props = $props();

	/** Noch keine Kategorien / Gewichte → "Get Started"-Box anzeigen */
	const isListNew = $derived(!categories || categories.length === 0);
</script>

{#if !list}
	<div class="lpGetStartedEmpty">
		<p>Select a list from the sidebar to start editing.</p>
	</div>
{:else}
	<div class="lpListBody">
		{#if isListNew}
			<div id="getStarted">
				<h2>Welcome to LighterPack!</h2>
				<p>Here's what you need to get started:</p>
				<ol>
					<li>Click on things to edit them. Give your list and category a name.</li>
					<li>Add new categories and give items weights to start the visualization.</li>
					<li>When you're done, share your list with others!</li>
				</ol>
			</div>
		{/if}

		<ul class="lpCategories">
			<!-- Category-Komponenten kommen hier rein (TODO) -->
			{#each categories as category (category.id)}
				<li class="lpCategory">
					<strong style="color:#888; font-size:12px;">{category.name || 'Unnamed category'}</strong>
				</li>
			{/each}
		</ul>

		<hr />
		<button class="lpAdd addCategory" onclick={onNewCategory}>
			+ Add new category
		</button>
	</div>
{/if}

<style>
	.lpGetStartedEmpty {
		color: #aaa;
		padding: 40px 20px;
		text-align: center;
	}

	#getStarted {
		background: #efefef;
		display: flex;
		flex-direction: column;
		height: 220px;
		justify-content: center;
		line-height: 1.6;
		padding: 30px;
	}

	#getStarted h2 {
		font-size: 24px;
		line-height: 1;
		margin: 0 0 15px;
	}

	#getStarted p,
	#getStarted ol {
		margin: 0 0 15px;
	}

	#getStarted ol {
		padding-left: 20px;
	}

	.lpAdd {
		color: var(--blue1);
		cursor: pointer;
	}

	.lpAdd:hover {
		text-decoration: underline;
	}
</style>
