<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { insertImageFromPicker } from '$lib/editor/insertImage';
	import { insertCitation, insertFootnote } from '$lib/editor/insertCite';
	import { t } from '$lib/i18n';
	import { appDialog } from '$lib/ui/dialog.svelte';

	let { editor, tick }: { editor: Editor | null; tick: number } = $props();

	async function setLink(): Promise<void> {
		if (!editor) {
			return;
		}
		const previous = String(editor.getAttributes('link').href ?? '');
		const url = await appDialog.ask(t('linkPrompt'), previous || 'https://');
		if (url === null) {
			return;
		}
		if (url === '') {
			editor.chain().focus().unsetLink().run();
			return;
		}
		editor.chain().focus().setLink({ href: url }).run();
	}
</script>

<div class="toolbar" role="toolbar" aria-label={t('appName')}>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('heading', { level: 1 }) }}
		onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
	>
		{t('h1')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('heading', { level: 2 }) }}
		onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
	>
		{t('h2')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('heading', { level: 3 }) }}
		onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
	>
		{t('h3')}
	</button>
	<span class="rule"></span>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('bold') }}
		onclick={() => editor?.chain().focus().toggleBold().run()}
	>
		{t('bold')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('italic') }}
		onclick={() => editor?.chain().focus().toggleItalic().run()}
	>
		{t('italic')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('code') }}
		onclick={() => editor?.chain().focus().toggleCode().run()}
	>
		{t('code')}
	</button>
	<button type="button" class={{ active: tick >= 0 && editor?.isActive('link') }} onclick={() => void setLink()}>
		{t('link')}
	</button>
	<span class="rule"></span>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('bulletList') }}
		onclick={() => editor?.chain().focus().toggleBulletList().run()}
	>
		{t('bulletList')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('orderedList') }}
		onclick={() => editor?.chain().focus().toggleOrderedList().run()}
	>
		{t('orderedList')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('blockquote') }}
		onclick={() => editor?.chain().focus().toggleBlockquote().run()}
	>
		{t('quote')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('table') }}
		onclick={() => {
			if (!editor || editor.isActive('table')) {
				return;
			}
			editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
		}}
	>
		{t('table')}
	</button>
	{#if tick >= 0 && editor?.isActive('table')}
		<button type="button" onclick={() => editor?.chain().focus().addRowAfter().run()}>{t('tableAddRow')}</button>
		<button type="button" onclick={() => editor?.chain().focus().addColumnAfter().run()}>{t('tableAddCol')}</button>
		<button type="button" onclick={() => editor?.chain().focus().deleteRow().run()}>{t('tableDelRow')}</button>
		<button type="button" onclick={() => editor?.chain().focus().deleteColumn().run()}>{t('tableDelCol')}</button>
	{/if}
	<span class="rule"></span>
	<button type="button" onclick={() => editor && void insertImageFromPicker(editor, 'image')}>
		{t('image')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('figure') }}
		onclick={() => editor && void insertImageFromPicker(editor, 'figure')}
	>
		{t('figure')}
	</button>
	<span class="rule"></span>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('citation') }}
		onclick={() => editor && void insertCitation(editor)}
	>
		{t('cite')}
	</button>
	<button
		type="button"
		class={{ active: tick >= 0 && editor?.isActive('footnote') }}
		onclick={() => editor && void insertFootnote(editor)}
	>
		{t('footnote')}
	</button>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
		padding: 0.7rem 1.5rem;
		border-bottom: 1px solid var(--line);
	}

	.rule {
		width: 1px;
		height: 1.2rem;
		background: var(--line);
		margin: 0 0.25rem;
	}

	button {
		padding: 0.3rem 0.55rem;
		font-size: 0.8rem;
	}
</style>
