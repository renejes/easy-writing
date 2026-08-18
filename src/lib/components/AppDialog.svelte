<script lang="ts">
	import { t } from '$lib/i18n';
	import { appDialog } from '$lib/ui/dialog.svelte';

	function focusField(element: HTMLElement): void {
		element.focus();
		if (element instanceof HTMLInputElement) {
			element.select();
		}
	}

	function onKeydown(event: KeyboardEvent): void {
		if (!appDialog.current || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		appDialog.cancel();
	}

	function onSubmit(event: SubmitEvent): void {
		event.preventDefault();
		appDialog.submit();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if appDialog.current}
	<div class="scrim">
		<form class="dialog" onsubmit={onSubmit}>
			<p>{appDialog.current.message}</p>
			{#if appDialog.current.kind === 'prompt'}
				{#key appDialog.generation}
					<input bind:value={appDialog.inputValue} {@attach focusField} />
				{/key}
			{/if}
			<div class="actions">
				<button type="button" onclick={() => appDialog.cancel()}>{t('cancel')}</button>
				<button type="submit">{t('ok')}</button>
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

	.dialog p {
		margin: 0;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}
</style>
