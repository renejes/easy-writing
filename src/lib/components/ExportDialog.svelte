<script lang="ts">
	import { appState } from '$lib/appState.svelte';
	import { t } from '$lib/i18n';
	import { exportDialog } from '$lib/ui/exportDialog.svelte';
	import type { ExportFormat, MdxMode } from '$lib/export/types';

	function onKeydown(event: KeyboardEvent): void {
		if (!exportDialog.open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		exportDialog.cancel();
	}

	function onSubmit(event: SubmitEvent): void {
		event.preventDefault();
		exportDialog.submit();
	}

	function setFormat(format: ExportFormat): void {
		exportDialog.format = format;
	}

	function setMdxMode(mode: MdxMode): void {
		exportDialog.mdxMode = mode;
	}

	const allPaths = $derived(appState.chapters.map((chapter) => chapter.relativePath));
</script>

<svelte:window onkeydown={onKeydown} />

{#if exportDialog.open}
	<div class="scrim">
		<form class="dialog" onsubmit={onSubmit}>
			<p>{t('export')}</p>
			<fieldset>
				<legend>{t('exportFormat')}</legend>
				<label>
					<input
						type="radio"
						name="format"
						checked={exportDialog.format === 'pdf'}
						onchange={() => setFormat('pdf')}
					/>
					{t('exportPdf')}
				</label>
				<label>
					<input
						type="radio"
						name="format"
						checked={exportDialog.format === 'docx'}
						onchange={() => setFormat('docx')}
					/>
					{t('exportDocx')}
				</label>
				<label>
					<input
						type="radio"
						name="format"
						checked={exportDialog.format === 'md'}
						onchange={() => setFormat('md')}
					/>
					{t('exportMd')}
				</label>
				<label>
					<input
						type="radio"
						name="format"
						checked={exportDialog.format === 'mdx'}
						onchange={() => setFormat('mdx')}
					/>
					{t('exportMdx')}
				</label>
			</fieldset>
			{#if exportDialog.format === 'mdx'}
				<fieldset>
					<legend>{t('exportMdxMode')}</legend>
					<label>
						<input
							type="radio"
							name="mdxMode"
							checked={exportDialog.mdxMode === 'copy'}
							onchange={() => setMdxMode('copy')}
						/>
						{t('exportCopyProject')}
					</label>
					<p class="hint">{t('exportCopyHint')}</p>
					<label>
						<input
							type="radio"
							name="mdxMode"
							checked={exportDialog.mdxMode === 'flatten'}
							onchange={() => setMdxMode('flatten')}
						/>
						{t('exportFlattenFile')}
					</label>
				</fieldset>
			{/if}
			<fieldset>
				<legend>{t('exportChapters')}</legend>
				<button type="button" class="tiny" onclick={() => exportDialog.selectAll(allPaths)}>
					{t('exportSelectAll')}
				</button>
				{#each appState.chapters as chapter (chapter.relativePath)}
					<label>
						<input
							type="checkbox"
							checked={exportDialog.selected.includes(chapter.relativePath)}
							onchange={() => exportDialog.toggleChapter(chapter.relativePath)}
						/>
						{chapter.title}
					</label>
				{/each}
			</fieldset>
			<div class="actions">
				<button type="button" onclick={() => exportDialog.cancel()}>{t('cancel')}</button>
				<button type="submit" disabled={exportDialog.selected.length === 0}>{t('ok')}</button>
			</div>
		</form>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(255 255 255 / 0.92);
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.dialog {
		width: min(28rem, 100%);
		border: 1px solid var(--line);
		background: var(--bg);
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: min(36rem, 90vh);
		overflow: auto;
	}

	.dialog p {
		margin: 0;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--muted);
		padding-left: 1.4rem;
	}

	fieldset {
		border: 1px solid var(--hairline);
		margin: 0;
		padding: 0.7rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	legend {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0 0.3rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.9rem;
	}

	.tiny {
		align-self: flex-start;
		padding: 0.2rem 0.4rem;
		font-size: 0.7rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}
</style>
