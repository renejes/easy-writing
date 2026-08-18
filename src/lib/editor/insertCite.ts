import type { Editor } from '@tiptap/core';
import { t } from '$lib/i18n';
import { appDialog } from '$lib/ui/dialog.svelte';
import { nextFootnoteId } from './markdownRoundtrip';

export async function insertCitation(editor: Editor, key?: string): Promise<void> {
	const chosen = key ?? (await appDialog.ask(t('citeKeyPrompt')));
	if (chosen === null) {
		return;
	}
	const trimmed = chosen.trim();
	if (trimmed.length === 0) {
		return;
	}
	const locator = await appDialog.ask(t('locatorPrompt'));
	if (locator === null) {
		return;
	}
	editor.chain().focus().setCitation({ key: trimmed, locator: locator.trim() }).run();
}

export function insertCitationKey(editor: Editor, key: string): void {
	editor.chain().focus().setCitation({ key, locator: '' }).run();
}

export async function insertFootnote(editor: Editor): Promise<void> {
	const text = await appDialog.ask(t('footnotePrompt'));
	if (text === null || text.trim().length === 0) {
		return;
	}
	editor.chain().focus().setFootnote({ id: nextFootnoteId(editor), text: text.trim() }).run();
}

export async function editLocator(editor: Editor, pos: number): Promise<void> {
	const node = editor.state.doc.nodeAt(pos);
	if (!node || node.type.name !== 'citation') {
		return;
	}
	const locator = await appDialog.ask(t('locatorPrompt'), String(node.attrs.locator ?? ''));
	if (locator === null) {
		return;
	}
	editor
		.chain()
		.focus()
		.command(({ tr }) => {
			tr.setNodeMarkup(pos, undefined, { ...node.attrs, locator: locator.trim() });
			return true;
		})
		.run();
}

export async function editFootnote(editor: Editor, pos: number): Promise<void> {
	const node = editor.state.doc.nodeAt(pos);
	if (!node || node.type.name !== 'footnote') {
		return;
	}
	const text = await appDialog.ask(t('footnotePrompt'), String(node.attrs.text ?? ''));
	if (text === null) {
		return;
	}
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return;
	}
	editor
		.chain()
		.focus()
		.command(({ tr }) => {
			tr.setNodeMarkup(pos, undefined, { ...node.attrs, text: trimmed });
			return true;
		})
		.run();
}
