import { Node } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { citeChipLabel, citeHoverText } from '$lib/cite/label';
import { findBibEntry } from '$lib/cite/lookup';
import { filterEntries, type BibEntry } from '$lib/cite/parseBib';
import { appState } from '$lib/appState.svelte';
import { t } from '$lib/i18n';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		citation: {
			setCitation: (options: { key: string; locator?: string }) => ReturnType;
		};
	}
}

export function parseCitationBody(body: string): { key: string; locator: string } {
	const trimmed = body.trim().replace(/^-/, '');
	const comma = trimmed.search(/,\s*/);
	if (comma < 0) {
		return { key: trimmed, locator: '' };
	}
	return {
		key: trimmed.slice(0, comma).trim(),
		locator: trimmed.slice(comma + 1).trim(),
	};
}

function citationMarkdown(key: string, locator: string): string {
	return locator.length > 0 ? `[@${key}, ${locator}]` : `[@${key}]`;
}

function paintCitation(dom: HTMLElement, key: string, locator: string): void {
	const entry = findBibEntry(key);
	dom.className = entry ? 'cite-chip' : 'cite-chip is-unknown';
	dom.textContent = citeChipLabel(entry, key, locator);
	dom.title = entry ? citeHoverText(entry) : t('citeUnknown');
	dom.setAttribute('data-citation', '');
	dom.setAttribute('data-key', key);
}

function renderSuggestList(items: BibEntry[], selected: number): HTMLElement {
	const root = document.createElement('div');
	root.className = 'cite-suggest';
	if (items.length === 0) {
		const empty = document.createElement('p');
		empty.textContent = t('citeNoMatches');
		root.append(empty);
		return root;
	}
	const list = document.createElement('ul');
	items.forEach((entry, index) => {
		const item = document.createElement('li');
		item.className = index === selected ? 'is-selected' : '';
		const key = document.createElement('strong');
		key.textContent = citeChipLabel(entry, entry.key, '');
		const meta = document.createElement('span');
		meta.textContent = `${entry.key}${entry.fields.title ? ` — ${entry.fields.title}` : ''}`;
		item.append(key, meta);
		item.dataset.index = String(index);
		list.append(item);
	});
	root.append(list);
	return root;
}

function citeSuggestion(): Omit<SuggestionOptions<BibEntry, { key: string }>, 'editor'> {
	let selected = 0;
	let unmount: (() => void) | null = null;
	let element: HTMLElement | null = null;
	let currentItems: BibEntry[] = [];
	let runCommand: ((props: { key: string }) => void) | null = null;

	return {
		pluginKey: new PluginKey('citeSuggest'),
		char: '@',
		allowSpaces: false,
		items: ({ query }) => filterEntries(appState.bibEntries, query),
		command: ({ editor, range, props }) => {
			const key = props.key;
			if (key.length === 0) {
				return;
			}
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent([
					{ type: 'citation', attrs: { key, locator: '' } },
					{ type: 'text', text: ' ' },
				])
				.run();
		},
		allow: ({ state, range }) => {
			const $from = state.doc.resolve(range.from);
			if ($from.parent.type.spec.code) {
				return false;
			}
			return !$from.marks().some((mark) => mark.type.name === 'code');
		},
		render: () => ({
			onStart(props) {
				selected = 0;
				currentItems = props.items;
				runCommand = props.command;
				element = document.createElement('div');
				element.className = 'cite-suggest';
				element.addEventListener('mousedown', (event) => {
					const row = (event.target as HTMLElement | null)?.closest('li');
					const index = Number(row?.dataset.index ?? -1);
					const entry = currentItems[index];
					if (!entry) {
						return;
					}
					event.preventDefault();
					runCommand?.({ key: entry.key });
				});
				const filled = renderSuggestList(currentItems, selected);
				element.replaceChildren(...Array.from(filled.childNodes));
				unmount = props.mount(element);
			},
			onUpdate(props) {
				currentItems = props.items;
				runCommand = props.command;
				if (selected >= currentItems.length) {
					selected = Math.max(0, currentItems.length - 1);
				}
				if (!element) {
					return;
				}
				const filled = renderSuggestList(currentItems, selected);
				element.replaceChildren(...Array.from(filled.childNodes));
			},
			onKeyDown({ event }) {
				if (event.key === 'ArrowDown') {
					event.preventDefault();
					selected = Math.min(selected + 1, Math.max(0, currentItems.length - 1));
					if (element) {
						const filled = renderSuggestList(currentItems, selected);
						element.replaceChildren(...Array.from(filled.childNodes));
					}
					return true;
				}
				if (event.key === 'ArrowUp') {
					event.preventDefault();
					selected = Math.max(selected - 1, 0);
					if (element) {
						const filled = renderSuggestList(currentItems, selected);
						element.replaceChildren(...Array.from(filled.childNodes));
					}
					return true;
				}
				if (event.key === 'Enter') {
					const entry = currentItems[selected];
					if (!entry) {
						return false;
					}
					event.preventDefault();
					runCommand?.({ key: entry.key });
					return true;
				}
				return false;
			},
			onExit() {
				unmount?.();
				unmount = null;
				element = null;
				runCommand = null;
			},
		}),
	};
}

export const Citation = Node.create({
	name: 'citation',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,
	addAttributes() {
		return {
			key: { default: '' },
			locator: { default: '' },
		};
	},
	parseHTML() {
		return [
			{
				tag: 'span[data-citation]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) {
						return false;
					}
					return {
						key: element.getAttribute('data-key') ?? '',
						locator: element.getAttribute('data-locator') ?? '',
					};
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		const key = String(HTMLAttributes.key ?? '');
		const locator = String(HTMLAttributes.locator ?? '');
		const entry = findBibEntry(key);
		return [
			'span',
			{
				'data-citation': '',
				'data-key': key,
				'data-locator': locator,
				class: entry ? 'cite-chip' : 'cite-chip is-unknown',
				title: entry ? citeHoverText(entry) : t('citeUnknown'),
			},
			citeChipLabel(entry, key, locator),
		];
	},
	parseMarkdown(token, helpers) {
		const parsed = parseCitationBody(String(token.body ?? ''));
		return helpers.createNode('citation', parsed);
	},
	renderMarkdown(node) {
		return citationMarkdown(String(node.attrs?.key ?? ''), String(node.attrs?.locator ?? ''));
	},
	markdownTokenizer: {
		name: 'citation',
		level: 'inline',
		start(src) {
			const match = src.match(/\[@/);
			return match?.index ?? -1;
		},
		tokenize(src) {
			const match = src.match(/^\[@([^\]]+)\]/);
			if (!match) {
				return undefined;
			}
			return {
				type: 'citation',
				raw: match[0],
				body: match[1],
			};
		},
	},
	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('span');
			paintCitation(dom, String(node.attrs.key ?? ''), String(node.attrs.locator ?? ''));
			return {
				dom,
				update(updated) {
					if (updated.type.name !== 'citation') {
						return false;
					}
					paintCitation(dom, String(updated.attrs.key ?? ''), String(updated.attrs.locator ?? ''));
					return true;
				},
			};
		};
	},
	addCommands() {
		return {
			setCitation:
				(options) =>
				({ commands }) => {
					return commands.insertContent([
						{
							type: this.name,
							attrs: { key: options.key, locator: options.locator ?? '' },
						},
						{ type: 'text', text: ' ' },
					]);
				},
		};
	},
	addProseMirrorPlugins() {
		return [Suggestion({ editor: this.editor, ...citeSuggestion() })];
	},
});
