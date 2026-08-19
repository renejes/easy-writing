<script lang="ts">
	import { flip } from 'svelte/animate';
	import { t } from '$lib/i18n';
	import type { ChapterRef } from '$lib/project/types';

	let {
		chapters,
		activePath,
		label,
		onselect,
		onadd,
		onrename,
		ondelete,
		onreorder,
	}: {
		chapters: ChapterRef[];
		activePath: string | null;
		label: string;
		onselect: (path: string) => void;
		onadd: () => void;
		onrename: (path: string) => void;
		ondelete: (path: string) => void;
		onreorder: (fromIndex: number, toIndex: number) => void;
	} = $props();

	let draggingIndex = $state<number | null>(null);
	let hoverIndex = $state<number | null>(null);

	function rowIndexAt(clientX: number, clientY: number): number | null {
		const node = document.elementFromPoint(clientX, clientY);
		const row = node instanceof Element ? node.closest('[data-chapter-row]') : null;
		if (!row) {
			return null;
		}
		const parsed = Number(row.getAttribute('data-chapter-row'));
		return Number.isInteger(parsed) ? parsed : null;
	}

	function startReorder(index: number, event: PointerEvent): void {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		draggingIndex = index;
		hoverIndex = index;
	}

	function moveReorder(event: PointerEvent): void {
		if (draggingIndex === null) {
			return;
		}
		const next = rowIndexAt(event.clientX, event.clientY);
		if (next !== null) {
			hoverIndex = next;
		}
	}

	function endReorder(event: PointerEvent): void {
		if (draggingIndex === null) {
			return;
		}
		const from = draggingIndex;
		const to = rowIndexAt(event.clientX, event.clientY) ?? hoverIndex;
		draggingIndex = null;
		hoverIndex = null;
		const handle = event.currentTarget as HTMLElement;
		if (handle.hasPointerCapture(event.pointerId)) {
			handle.releasePointerCapture(event.pointerId);
		}
		if (to !== null) {
			onreorder(from, to);
		}
	}

	function cancelReorder(event: PointerEvent): void {
		const handle = event.currentTarget as HTMLElement;
		if (handle.hasPointerCapture(event.pointerId)) {
			handle.releasePointerCapture(event.pointerId);
		}
		draggingIndex = null;
		hoverIndex = null;
	}
</script>

<aside class={['sidebar', draggingIndex !== null && 'is-reordering']}>
	<div class="head">
		<h2>{label}</h2>
		<button type="button" class="add" onclick={onadd}>{t('addChapter')}</button>
	</div>
	<ul>
		{#each chapters as chapter, index (chapter.absolutePath)}
			<li
				data-chapter-row={index}
				animate:flip={{ duration: 160 }}
				class={{
					active: chapter.absolutePath === activePath,
					dragging: draggingIndex === index,
					target: hoverIndex === index && draggingIndex !== null && draggingIndex !== index,
				}}
			>
				<button
					type="button"
					class="handle"
					aria-label={t('dragHandle')}
					onpointerdown={(event) => startReorder(index, event)}
					onpointermove={moveReorder}
					onpointerup={endReorder}
					onpointercancel={cancelReorder}
				>
					::
				</button>
				<button type="button" class="title" onclick={() => onselect(chapter.absolutePath)}>
					{chapter.title}
				</button>
				<div class="row-actions">
					<button type="button" class="tiny" onclick={() => onrename(chapter.absolutePath)}>
						{t('renameChapter')}
					</button>
					<button type="button" class="tiny" onclick={() => ondelete(chapter.absolutePath)}>
						{t('deleteChapter')}
					</button>
				</div>
			</li>
		{/each}
	</ul>
</aside>

<style>
	.sidebar {
		height: 100%;
		overflow: auto;
		padding: 0.8rem 0.7rem 1.2rem;
		min-height: 0;
	}

	.sidebar.is-reordering {
		user-select: none;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	h2 {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.add,
	.tiny,
	.handle {
		padding: 0.2rem 0.4rem;
		font-size: 0.7rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-rows: auto auto;
		gap: 0.25rem 0.3rem;
		align-items: center;
		padding: 0.35rem;
		border: 1px solid var(--hairline);
	}

	li.active {
		border-color: var(--line);
		background: var(--fg);
		color: var(--bg);
	}

	li.active button {
		background: transparent;
		color: inherit;
		border-color: currentColor;
	}

	li.dragging {
		opacity: 0.45;
	}

	li.target {
		border-style: dashed;
		border-color: var(--line);
	}

	.handle {
		grid-row: 1 / 3;
		cursor: grab;
		align-self: stretch;
		touch-action: none;
	}

	.handle:active {
		cursor: grabbing;
	}

	.title {
		text-align: left;
		border: 0;
		padding: 0.15rem 0.2rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-actions {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	@media (pointer: coarse) {
		.handle {
			min-width: 44px;
		}

		.title,
		.tiny,
		.add {
			min-height: 44px;
		}
	}
</style>
