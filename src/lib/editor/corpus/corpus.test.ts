// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { markdownExtensions } from '../markdownExtensions';
import { prepareEditorMarkdown, serializeEditorMarkdown } from '../markdownRoundtrip';
import { splitRawFrontmatter } from '$lib/export/frontmatter';

const corpusDir = dirname(fileURLToPath(import.meta.url));

function createRoundtripEditor(markdown: string): Editor {
	const element = document.createElement('div');
	document.body.append(element);
	return new Editor({
		element,
		extensions: markdownExtensions({ placeholder: '', spellcheck: false }),
		content: prepareEditorMarkdown(markdown),
		contentType: 'markdown',
	});
}

function roundtrip(source: string): { first: string; jsonA: unknown; jsonB: unknown } {
	const a = createRoundtripEditor(source);
	const jsonA = a.getJSON();
	const first = serializeEditorMarkdown(a);
	a.destroy();
	const b = createRoundtripEditor(first);
	const jsonB = b.getJSON();
	b.destroy();
	return { first, jsonA, jsonB };
}

describe('markdown corpus', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	const files = readdirSync(corpusDir).filter((name) => name.endsWith('.mdx'));

	it.each(files)('parse → serialize → parse holds for %s', (name) => {
		const source = readFileSync(join(corpusDir, name), 'utf8');
		const { jsonA, jsonB, first } = roundtrip(source);
		expect(jsonB).toEqual(jsonA);
		if (name === 'frontmatter.mdx') {
			const original = splitRawFrontmatter(source);
			expect(first.startsWith(original.fence.trimEnd())).toBe(true);
			expect(first).toContain('customKey: bleibt');
			expect(first).toContain('draft: true');
		}
	});

	it('roundtrips Windows line endings', () => {
		const source = readFileSync(join(corpusDir, 'umlauts.mdx'), 'utf8').replaceAll('\n', '\r\n');
		const { jsonA, jsonB } = roundtrip(source);
		expect(jsonB).toEqual(jsonA);
	});
});
