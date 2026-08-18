import type { Editor } from '@tiptap/core';

export type SpellMenuModel = {
	open: boolean;
	x: number;
	y: number;
	word: string;
	from: number;
	to: number;
	suggestions: string[];
};

export const spellMenu: SpellMenuModel = $state({
	open: false,
	x: 0,
	y: 0,
	word: '',
	from: 0,
	to: 0,
	suggestions: [],
});

let activeEditor: Editor | null = null;

export function setSpellEditor(editor: Editor | null): void {
	activeEditor = editor;
	if (!editor) {
		spellMenu.open = false;
	}
}

export function getSpellEditor(): Editor | null {
	return activeEditor;
}

export function openSpellMenu(input: {
	x: number;
	y: number;
	word: string;
	from: number;
	to: number;
	suggestions: string[];
}): void {
	spellMenu.open = true;
	spellMenu.x = input.x;
	spellMenu.y = input.y;
	spellMenu.word = input.word;
	spellMenu.from = input.from;
	spellMenu.to = input.to;
	spellMenu.suggestions = input.suggestions;
}

export function closeSpellMenu(): void {
	spellMenu.open = false;
}
