import type { Node as PmNode } from '@tiptap/pm/model';

const SKIP_NODES = new Set([
	'codeBlock',
	'citation',
	'footnote',
	'figure',
	'image',
	'horizontalRule',
]);

export type SpellHit = {
	word: string;
	from: number;
	to: number;
};

export function shouldCheckWord(word: string): boolean {
	if (word.length < 2) {
		return false;
	}
	if (/\d/.test(word)) {
		return false;
	}
	if (word.startsWith('@')) {
		return false;
	}
	if (/^https?:/i.test(word) || word.includes('://')) {
		return false;
	}
	if (/^[A-ZÄÖÜ]{2,5}$/.test(word)) {
		return false;
	}
	return true;
}

export function collectWords(doc: PmNode): SpellHit[] {
	const hits: SpellHit[] = [];
	doc.descendants((node, pos) => {
		if (SKIP_NODES.has(node.type.name)) {
			return false;
		}
		if (!node.isText || !node.text) {
			return;
		}
		if (node.marks.some((mark) => mark.type.name === 'code')) {
			return;
		}
		const wordRe = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)?/gu;
		for (const match of node.text.matchAll(wordRe)) {
			const word = match[0];
			const index = match.index ?? 0;
			if (!shouldCheckWord(word)) {
				continue;
			}
			const from = pos + index;
			const to = from + word.length;
			hits.push({ word, from, to });
		}
	});
	return hits;
}
