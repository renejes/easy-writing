import type { Editor } from '@tiptap/core';
import { splitRawFrontmatter } from '$lib/export/frontmatter';

const DEF_LINE = /^\[\^([^\]]+)\]:\s*(.*)$/;

export function splitFootnoteMarkdown(markdown: string): { body: string; defs: Map<string, string> } {
	const lines = markdown.split('\n');
	const defs = new Map<string, string>();
	const body: string[] = [];
	let index = 0;
	while (index < lines.length) {
		const match = lines[index].match(DEF_LINE);
		if (!match) {
			body.push(lines[index]);
			index += 1;
			continue;
		}
		const parts = [match[2]];
		index += 1;
		while (index < lines.length) {
			const line = lines[index];
			if (line.length === 0) {
				if (index + 1 < lines.length && /^[ \t]/.test(lines[index + 1])) {
					parts.push('');
					index += 1;
					continue;
				}
				break;
			}
			if (!/^[ \t]/.test(line) || DEF_LINE.test(line)) {
				break;
			}
			parts.push(line.replace(/^[ \t]+/, ''));
			index += 1;
		}
		defs.set(match[1], parts.join('\n').trim());
	}
	return { body: body.join('\n'), defs };
}

let pendingDefs = new Map<string, string>();
let pendingFence = '';

export function prepareEditorMarkdown(markdown: string): string {
	const raw = splitRawFrontmatter(markdown);
	pendingFence = raw.fence;
	const split = splitFootnoteMarkdown(raw.body);
	pendingDefs = split.defs;
	return split.body;
}

export function pendingFootnoteText(id: string): string {
	return pendingDefs.get(id) ?? '';
}

export function serializeEditorMarkdown(editor: Editor): string {
	const markdown = editor.getMarkdown();
	const defs: { id: string; text: string }[] = [];
	const seen = new Set<string>();
	editor.state.doc.descendants((node) => {
		if (node.type.name !== 'footnote') {
			return;
		}
		const id = String(node.attrs.id ?? '');
		if (id.length === 0 || seen.has(id)) {
			return;
		}
		seen.add(id);
		defs.push({ id, text: String(node.attrs.text ?? '') });
	});
	const body = markdown.replace(/(?:\n+\[\^[^\]]+\]:[\s\S]*)+$/, '').trimEnd();
	let next = '';
	if (defs.length === 0) {
		next = body.length > 0 ? `${body}\n` : '';
	} else {
		const block = defs.map((def) => `[^${def.id}]: ${def.text}`).join('\n\n');
		next = `${body}\n\n${block}\n`;
	}
	if (pendingFence.length === 0) {
		return next;
	}
	if (next.length === 0) {
		return pendingFence.endsWith('\n') ? pendingFence : `${pendingFence}\n`;
	}
	const fence = pendingFence.endsWith('\n') ? pendingFence : `${pendingFence}\n`;
	return `${fence}${next}`;
}

export function nextFootnoteId(editor: Editor): string {
	const used = new Set<string>();
	editor.state.doc.descendants((node) => {
		if (node.type.name === 'footnote') {
			used.add(String(node.attrs.id ?? ''));
		}
	});
	let n = 1;
	while (used.has(String(n))) {
		n += 1;
	}
	return String(n);
}

export function refreshCitationNodes(editor: Editor): void {
	const { tr } = editor.state;
	let changed = false;
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name !== 'citation') {
			return;
		}
		tr.setNodeMarkup(pos, undefined, { ...node.attrs });
		changed = true;
	});
	if (changed) {
		editor.view.dispatch(tr);
	}
}
