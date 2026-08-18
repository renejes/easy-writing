import {
	BorderStyle,
	Document,
	ExternalHyperlink,
	FootnoteReferenceRun,
	HeadingLevel,
	ImageRun,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType,
	type FileChild,
	type IRunOptions,
	type ParagraphChild,
} from 'docx';
import { lexer, type Token, type Tokens } from 'marked';
import type { BibEntry } from '$lib/cite/parseBib';
import { footnotePlaceholder, prepareDocxMarkdown } from './citations';
import { extOf, imageSize } from './images';

export type DocxImage = {
	bytes: Uint8Array;
	ext: string;
};

function headingLevel(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
	switch (depth) {
		case 1:
			return HeadingLevel.HEADING_1;
		case 2:
			return HeadingLevel.HEADING_2;
		case 3:
			return HeadingLevel.HEADING_3;
		default:
			return HeadingLevel.HEADING_3;
	}
}

function imageType(ext: string): 'jpg' | 'png' | 'gif' | 'bmp' | null {
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'jpg';
		case 'png':
			return 'png';
		case 'gif':
			return 'gif';
		case 'bmp':
			return 'bmp';
		default:
			return null;
	}
}

function imageRun(src: string, alt: string, images: Map<string, DocxImage>): ImageRun | TextRun {
	const asset = images.get(src);
	const kind = imageType(extOf(src));
	if (!asset || !kind) {
		return new TextRun({ text: alt.length > 0 ? alt : src, italics: true });
	}
	const size = imageSize(asset.bytes, extOf(src));
	const width = Math.min(480, size.width);
	const height = Math.round((size.height / size.width) * width);
	return new ImageRun({
		type: kind,
		data: asset.bytes,
		transformation: { width, height },
		altText: { title: alt, description: alt, name: alt },
	});
}

function runsFromPlain(text: string, style: IRunOptions = {}): ParagraphChild[] {
	const parts: ParagraphChild[] = [];
	const mark = new RegExp(footnotePlaceholder(0).replace('0', '(\\d+)'), 'g');
	let last = 0;
	for (const match of text.matchAll(mark)) {
		const start = match.index ?? 0;
		if (start > last) {
			parts.push(new TextRun({ ...style, text: text.slice(last, start) }));
		}
		parts.push(new FootnoteReferenceRun(Number(match[1])));
		last = start + match[0].length;
	}
	if (last < text.length) {
		parts.push(new TextRun({ ...style, text: text.slice(last) }));
	}
	return parts;
}
function inlineChildren(
	tokens: Token[] | undefined,
	images: Map<string, DocxImage>,
): ParagraphChild[] {
	if (!tokens || tokens.length === 0) {
		return [];
	}
	const children: ParagraphChild[] = [];
	for (const token of tokens) {
		switch (token.type) {
			case 'text':
				children.push(...runsFromPlain(token.text));
				break;
			case 'strong':
				children.push(
					...runsFromPlain('text' in token ? token.text : inlinePlain(token.tokens), { bold: true }),
				);
				break;
			case 'em':
				children.push(
					...runsFromPlain('text' in token ? token.text : inlinePlain(token.tokens), { italics: true }),
				);
				break;
			case 'codespan':
				children.push(...runsFromPlain(token.text, { font: 'Courier New' }));
				break;
			case 'link':
				children.push(
					new ExternalHyperlink({
						link: token.href,
						children: [
							...runsFromPlain(inlinePlain(token.tokens) || token.href, { underline: {} }),
						],
					}),
				);
				break;
			case 'image':
				children.push(imageRun(token.href, token.text, images));
				break;
			case 'br':
				children.push(new TextRun({ break: 1 }));
				break;
			default:
				if ('tokens' in token && Array.isArray(token.tokens)) {
					children.push(...inlineChildren(token.tokens, images));
				} else if ('text' in token && typeof token.text === 'string') {
					children.push(...runsFromPlain(token.text));
				}
				break;
		}
	}
	return children;
}

function inlinePlain(tokens: Token[] | undefined): string {
	if (!tokens) {
		return '';
	}
	return tokens
		.map((token) => {
			if ('text' in token && typeof token.text === 'string' && token.type !== 'image') {
				return token.text;
			}
			if ('tokens' in token && Array.isArray(token.tokens)) {
				return inlinePlain(token.tokens);
			}
			return '';
		})
		.join('');
}

const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '111111' };
const TABLE_BORDERS = {
	top: TABLE_BORDER,
	bottom: TABLE_BORDER,
	left: TABLE_BORDER,
	right: TABLE_BORDER,
};

function tableCell(token: Tokens.TableCell, images: Map<string, DocxImage>, header: boolean): TableCell {
	return new TableCell({
		borders: TABLE_BORDERS,
		children: [
			new Paragraph({
				children: inlineChildren(token.tokens, images),
			}),
		],
		shading: header ? { fill: 'F4F4F4' } : undefined,
	});
}

function tableFromToken(token: Tokens.Table, images: Map<string, DocxImage>): Table {
	const header = new TableRow({
		children: token.header.map((cell) => tableCell(cell, images, true)),
		tableHeader: true,
	});
	const body = token.rows.map(
		(row) =>
			new TableRow({
				children: row.map((cell) => tableCell(cell, images, false)),
			}),
	);
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		rows: [header, ...body],
	});
}

function blocksFromTokens(
	tokens: Token[],
	images: Map<string, DocxImage>,
	listKind: 'none' | 'bullet' | 'number' = 'none',
): FileChild[] {
	const out: FileChild[] = [];
	for (const token of tokens) {
		switch (token.type) {
			case 'space':
				break;
			case 'heading':
				out.push(
					new Paragraph({
						heading: headingLevel(token.depth),
						children: inlineChildren(token.tokens, images),
					}),
				);
				break;
			case 'paragraph':
				out.push(new Paragraph({ children: inlineChildren(token.tokens, images) }));
				break;
			case 'blockquote':
				out.push(...blocksFromTokens(token.tokens ?? [], images));
				break;
			case 'code':
				out.push(
					new Paragraph({
						children: [new TextRun({ text: token.text, font: 'Courier New' })],
						shading: { fill: 'F4F4F4' },
					}),
				);
				break;
			case 'list':
				out.push(
					...blocksFromTokens(token.items, images, token.ordered ? 'number' : 'bullet'),
				);
				break;
			case 'list_item': {
				const itemChildren = inlineChildren(token.tokens, images);
				out.push(
					new Paragraph({
						children: itemChildren.length > 0 ? itemChildren : runsFromPlain(token.text || ''),
						bullet: listKind === 'bullet' ? { level: 0 } : undefined,
						numbering: listKind === 'number' ? { reference: 'export-lists', level: 0 } : undefined,
					}),
				);
				break;
			}
			case 'table':
				out.push(tableFromToken(token as Tokens.Table, images));
				break;
			case 'hr':
				out.push(new Paragraph({ border: { bottom: { color: '111111', space: 1, style: 'single', size: 6 } } }));
				break;
			case 'html':
				out.push(new Paragraph({ children: [new TextRun({ text: token.text.replace(/<[^>]+>/g, '') })] }));
				break;
			default:
				if ('tokens' in token && Array.isArray(token.tokens)) {
					out.push(...blocksFromTokens(token.tokens, images, listKind));
				}
				break;
		}
	}
	return out;
}

export async function markdownToDocx(input: {
	title: string;
	markdown: string;
	images: Map<string, DocxImage>;
	entries: BibEntry[];
	csl: string | undefined;
	bibliographyHeading: string;
}): Promise<Uint8Array> {
	const prepared = prepareDocxMarkdown(
		input.markdown,
		input.entries,
		input.csl,
		input.bibliographyHeading,
	);
	const tokens = lexer(prepared.body);
	const children = [
		new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: input.title })] }),
		...blocksFromTokens(tokens, input.images),
	];
	const footnotes = Object.fromEntries(
		prepared.footnotes.map((note) => [
			String(note.id),
			{ children: [new Paragraph({ children: [new TextRun({ text: note.text })] })] },
		]),
	);
	const doc = new Document({
		styles: {
			default: {
				document: {
					run: { font: 'Courier New', size: 22 },
				},
			},
		},
		numbering: {
			config: [
				{
					reference: 'export-lists',
					levels: [
						{
							level: 0,
							format: 'decimal',
							text: '%1.',
							alignment: 'left',
						},
					],
				},
			],
		},
		footnotes,
		sections: [{ children }],
	});
	const blob = await Packer.toBlob(doc);
	return new Uint8Array(await blob.arrayBuffer());
}
