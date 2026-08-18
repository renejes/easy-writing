import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import type { Extensions } from '@tiptap/core';
import { Spellcheck } from '$lib/spell/extension';
import { Citation } from './citation';
import { Figure } from './figure';
import { Footnote } from './footnote';
import { ProjectImage } from './projectImage';

const GfmTableCell = TableCell.extend({
	content: 'paragraph',
});

const GfmTableHeader = TableHeader.extend({
	content: 'paragraph',
});

export function markdownExtensions(options: { placeholder: string; spellcheck?: boolean }): Extensions {
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
		}),
		Link.configure({
			openOnClick: false,
			autolink: true,
			defaultProtocol: 'https',
		}),
		Placeholder.configure({
			placeholder: options.placeholder,
		}),
		Table.configure({
			resizable: false,
		}),
		TableRow,
		GfmTableHeader,
		GfmTableCell,
		ProjectImage.configure({
			inline: false,
			allowBase64: false,
		}),
		Figure,
		Citation,
		Footnote,
		...(options.spellcheck === false ? [] : [Spellcheck]),
		Markdown.configure({
			markedOptions: { gfm: true, breaks: false },
		}),
	];
}
