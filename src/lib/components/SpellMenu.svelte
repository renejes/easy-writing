<script lang="ts">
	import { t } from '$lib/i18n';
	import { addWordToProjectDictionary } from '$lib/session';
	import { closeSpellMenu, getSpellEditor, spellMenu } from '$lib/spell/menuState.svelte';

	function onWindowMouseDown(event: MouseEvent): void {
		if (!spellMenu.open) {
			return;
		}
		const target = event.target;
		if (target instanceof HTMLElement && target.closest('.spell-menu')) {
			return;
		}
		closeSpellMenu();
	}

	function onKeydown(event: KeyboardEvent): void {
		if (!spellMenu.open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		closeSpellMenu();
	}

	function applySuggestion(suggestion: string): void {
		const editor = getSpellEditor();
		if (!editor) {
			return;
		}
		const { from, to } = spellMenu;
		const marks = editor.state.doc.resolve(from).marks();
		editor.view.dispatch(
			editor.state.tr.replaceWith(from, to, editor.schema.text(suggestion, marks)),
		);
		closeSpellMenu();
	}

	function addWord(): void {
		void addWordToProjectDictionary(spellMenu.word);
		closeSpellMenu();
	}
</script>

<svelte:window onmousedown={onWindowMouseDown} onkeydown={onKeydown} />

{#if spellMenu.open}
	<div class="spell-menu" style:left="{spellMenu.x}px" style:top="{spellMenu.y}px">
		{#if spellMenu.suggestions.length === 0}
			<p>{t('spellNoSuggestions')}</p>
		{:else}
			<ul>
				{#each spellMenu.suggestions as suggestion (suggestion)}
					<li>
						<button type="button" onclick={() => applySuggestion(suggestion)}>{suggestion}</button>
					</li>
				{/each}
			</ul>
		{/if}
		<button type="button" class="add" onclick={addWord}>{t('spellAdd')}</button>
	</div>
{/if}
