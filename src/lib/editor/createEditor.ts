import { Editor } from '@tiptap/core';
import { appState } from '$lib/appState.svelte';
import { htmlLangOf } from '$lib/project/lang';
import { firstImageFile, imageFilesFrom, insertImageFromFile } from './insertImage';
import { editFootnote, editLocator } from './insertCite';
import { markdownExtensions } from './markdownExtensions';
import { prepareEditorMarkdown } from './markdownRoundtrip';

export interface CreateMarkdownEditorOptions {
	element: HTMLElement;
	content: string;
	placeholder: string;
	onUpdate: (editor: Editor) => void;
	onTransaction: () => void;
	spellcheck?: boolean;
}

export function createMarkdownEditor(options: CreateMarkdownEditorOptions): Editor {
	let editor: Editor;
	editor = new Editor({
		element: options.element,
		extensions: markdownExtensions({
			placeholder: options.placeholder,
			spellcheck: options.spellcheck,
		}),
		content: prepareEditorMarkdown(options.content),
		contentType: 'markdown',
		autofocus: 'end',
		editorProps: {
			attributes: {
				spellcheck: 'false',
				lang: htmlLangOf(appState.manifest?.lang ?? 'de'),
				class: 'editor-content',
			},
			handlePaste(_view, event) {
				const file = firstImageFile(event.clipboardData);
				if (!file) {
					return false;
				}
				event.preventDefault();
				void insertImageFromFile(editor, file, 'image');
				return true;
			},
			handleDrop(_view, event, _slice, moved) {
				if (moved) {
					return false;
				}
				const files = imageFilesFrom(event.dataTransfer);
				if (files.length === 0) {
					return false;
				}
				event.preventDefault();
				void (async () => {
					for (const file of files) {
						await insertImageFromFile(editor, file, 'image');
					}
				})();
				return true;
			},
			handleClickOn(_view, _pos, node, nodePos, event, direct) {
				if (!direct) {
					return false;
				}
				if (node.type.name === 'citation') {
					event.preventDefault();
					void editLocator(editor, nodePos);
					return true;
				}
				if (node.type.name === 'footnote') {
					event.preventDefault();
					void editFootnote(editor, nodePos);
					return true;
				}
				return false;
			},
			handleDOMEvents: {
				dragover(_view, event) {
					if (imageFilesFrom(event.dataTransfer).length === 0) {
						return false;
					}
					event.preventDefault();
					return true;
				},
			},
		},
		onUpdate: ({ editor: next }) => {
			options.onUpdate(next);
		},
		onTransaction: options.onTransaction,
	});
	return editor;
}
