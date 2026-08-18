<script lang="ts">
	import { t } from '$lib/i18n';
	import { createNewProject } from '$lib/session';
	import { newProjectUi } from '$lib/ui/newProject.svelte';

	function onKeydown(event: KeyboardEvent): void {
		if (!newProjectUi.open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		newProjectUi.hide();
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const title = newProjectUi.title.trim();
		if (title.length === 0) {
			return;
		}
		const type = newProjectUi.type;
		newProjectUi.hide();
		await createNewProject(title, type);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if newProjectUi.open}
	<div class="scrim">
		<form class="dialog" onsubmit={(event) => void submit(event)}>
			<h2>{t('newProject')}</h2>
			<label>
				{t('projectName')}
				<input bind:value={newProjectUi.title} required />
			</label>
			<fieldset>
				<legend>{t('projectType')}</legend>
				<button
					type="button"
					class={{ active: newProjectUi.type === 'blog' }}
					onclick={() => (newProjectUi.type = 'blog')}
				>
					{t('typeBlog')}
				</button>
				<button
					type="button"
					class={{ active: newProjectUi.type === 'paper' }}
					onclick={() => (newProjectUi.type = 'paper')}
				>
					{t('typePaper')}
				</button>
			</fieldset>
			<div class="actions">
				<button type="button" onclick={() => newProjectUi.hide()}>{t('cancel')}</button>
				<button type="submit">{t('createProject')}</button>
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
	}

	.dialog h2 {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.dialog label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	fieldset {
		border: 1px solid var(--line);
		margin: 0;
		padding: 0.7rem;
		display: flex;
		gap: 0.5rem;
	}

	legend {
		padding: 0 0.35rem;
		font-size: 0.8rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}
</style>
