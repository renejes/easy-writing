import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { htmlLangOf, spellLangOf } from '$lib/project/lang';
import { appState } from '$lib/appState.svelte';
import { addSpellWord, checkWords, configureSpell, suggestWord } from './client';
import { openSpellMenu, spellMenu } from './menuState.svelte';
import { collectWords } from './words';

export const spellPluginKey = new PluginKey<DecorationSet>('spellcheck');

const DELAY_MS = 400;

let activeView: EditorView | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let requestId = 0;
let extraWords: string[] = [];
let forceCheck = false;

function documentLang(): ReturnType<typeof spellLangOf> {
	return spellLangOf(appState.manifest?.lang ?? 'de');
}

export async function applySpellContext(words: string[]): Promise<void> {
	extraWords = words;
	await configureSpell(documentLang(), extraWords);
	forceCheck = true;
	if (activeView) {
		activeView.dispatch(activeView.state.tr.setMeta(spellPluginKey, { refresh: true }));
	}
}

export function resetSpellContext(): void {
	extraWords = [];
	forceCheck = false;
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
}

export function rememberSpellWord(word: string): void {
	if (!extraWords.includes(word)) {
		extraWords = [...extraWords, word];
	}
	addSpellWord(word);
	forceCheck = true;
	if (activeView) {
		activeView.dispatch(activeView.state.tr.setMeta(spellPluginKey, { refresh: true }));
	}
}

function uniqueWords(hits: { word: string }[]): string[] {
	return [...new Set(hits.map((hit) => hit.word))];
}

function schedule(view: EditorView): void {
	if (timer) {
		clearTimeout(timer);
	}
	timer = setTimeout(() => {
		timer = null;
		void runCheck(view);
	}, DELAY_MS);
}

async function runCheck(view: EditorView): Promise<void> {
	if (view !== activeView) {
		return;
	}
	const id = (requestId += 1);
	const selection = view.state.selection;
	const hits = collectWords(view.state.doc).filter((hit) => {
		if (!selection.empty) {
			return true;
		}
		return selection.from < hit.from || selection.from > hit.to;
	});
	const misspelled = new Set(await checkWords(uniqueWords(hits)));
	if (id !== requestId || view !== activeView) {
		return;
	}
	const decorations = hits
		.filter((hit) => misspelled.has(hit.word))
		.map((hit) => Decoration.inline(hit.from, hit.to, { class: 'spell-error' }));
	view.dispatch(
		view.state.tr.setMeta(spellPluginKey, { set: DecorationSet.create(view.state.doc, decorations) }),
	);
}

function onContextMenu(view: EditorView, event: MouseEvent): boolean {
	const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
	if (!coords) {
		return false;
	}
	const decorations = spellPluginKey.getState(view.state);
	if (!decorations) {
		return false;
	}
	const found = decorations.find(coords.pos, coords.pos);
	const mark = found[0];
	if (!mark) {
		return false;
	}
	event.preventDefault();
	const word = view.state.doc.textBetween(mark.from, mark.to);
	openSpellMenu({
		x: event.clientX,
		y: event.clientY,
		word,
		from: mark.from,
		to: mark.to,
		suggestions: [],
	});
	void suggestWord(word).then((suggestions) => {
		if (spellMenu.open && spellMenu.word === word) {
			spellMenu.suggestions = suggestions;
		}
	});
	return true;
}

export const Spellcheck = Extension.create({
	name: 'spellcheck',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: spellPluginKey,
				state: {
					init() {
						return DecorationSet.empty;
					},
					apply(tr, old) {
						const meta = tr.getMeta(spellPluginKey) as { set?: DecorationSet; refresh?: boolean } | undefined;
						if (meta?.set) {
							return meta.set;
						}
						if (tr.docChanged) {
							return old.map(tr.mapping, tr.doc);
						}
						return old;
					},
				},
				props: {
					decorations(state) {
						return spellPluginKey.getState(state);
					},
					handleDOMEvents: {
						contextmenu(view, event) {
							return onContextMenu(view, event);
						},
					},
				},
				view(view) {
					activeView = view;
					view.dom.setAttribute('lang', htmlLangOf(appState.manifest?.lang ?? 'de'));
					view.dom.setAttribute('spellcheck', 'false');
					schedule(view);
					return {
						update(view, prevState) {
							activeView = view;
							view.dom.setAttribute('lang', htmlLangOf(appState.manifest?.lang ?? 'de'));
							if (forceCheck || !view.state.doc.eq(prevState.doc)) {
								forceCheck = false;
								schedule(view);
							}
						},
						destroy() {
							if (activeView === view) {
								activeView = null;
							}
							if (timer) {
								clearTimeout(timer);
								timer = null;
							}
						},
					};
				},
			}),
		];
	},
});
