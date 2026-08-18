import { mergeAttributes, Node } from '@tiptap/core';
import { markdownSrcToDisplay } from './assetSrc';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		figure: {
			setFigure: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
		};
	}
}

function parseJsxAttributes(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	for (const match of source.matchAll(pattern)) {
		attrs[match[1]] = match[2] ?? match[3] ?? '';
	}
	return attrs;
}

function escapeAttr(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function figureMarkdown(attrs: { src?: string; alt?: string; caption?: string }): string {
	const parts = [`src="${escapeAttr(attrs.src ?? '')}"`];
	if (attrs.alt) {
		parts.push(`alt="${escapeAttr(attrs.alt)}"`);
	}
	if (attrs.caption) {
		parts.push(`caption="${escapeAttr(attrs.caption)}"`);
	}
	return `<Figure ${parts.join(' ')} />`;
}

export const Figure = Node.create({
	name: 'figure',
	group: 'block',
	atom: true,
	draggable: true,
	addAttributes() {
		return {
			src: { default: '' },
			alt: { default: '' },
			caption: { default: '' },
		};
	},
	parseHTML() {
		return [
			{
				tag: 'figure[data-figure]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) {
						return false;
					}
					const img = element.querySelector('img');
					const caption = element.querySelector('figcaption');
					return {
						src: img?.getAttribute('data-md-src') || img?.getAttribute('src') || '',
						alt: img?.getAttribute('alt') ?? '',
						caption: caption?.textContent ?? '',
					};
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		const markdownSrc = String(HTMLAttributes.src ?? '');
		const alt = String(HTMLAttributes.alt ?? '');
		const caption = String(HTMLAttributes.caption ?? '');
		const img = [
			'img',
			{
				src: markdownSrcToDisplay(markdownSrc),
				alt,
				'data-md-src': markdownSrc,
			},
		] as const;
		if (caption.length === 0) {
			return ['figure', mergeAttributes({ 'data-figure': '', class: 'md-figure' }), img];
		}
		return [
			'figure',
			mergeAttributes({ 'data-figure': '', class: 'md-figure' }),
			img,
			['figcaption', caption],
		];
	},
	parseMarkdown(token, helpers) {
		return helpers.createNode('figure', {
			src: String(token.src ?? token.attributes?.src ?? ''),
			alt: String(token.alt ?? token.attributes?.alt ?? ''),
			caption: String(token.caption ?? token.attributes?.caption ?? ''),
		});
	},
	renderMarkdown(node) {
		return figureMarkdown({
			src: String(node.attrs?.src ?? ''),
			alt: String(node.attrs?.alt ?? ''),
			caption: String(node.attrs?.caption ?? ''),
		});
	},
	markdownTokenizer: {
		name: 'figure',
		level: 'block',
		start(src) {
			const match = src.match(/<Figure\b/i);
			return match?.index ?? -1;
		},
		tokenize(src) {
			const selfClosing = src.match(/^<Figure\b([^>]*?)\s*\/>/i);
			const paired = src.match(/^<Figure\b([^>]*)>\s*<\/Figure>/i);
			const match = selfClosing ?? paired;
			if (!match) {
				return undefined;
			}
			const attrs = parseJsxAttributes(match[1] ?? '');
			if (!attrs.src) {
				return undefined;
			}
			return {
				type: 'figure',
				raw: match[0],
				src: attrs.src,
				alt: attrs.alt ?? '',
				caption: attrs.caption ?? '',
			};
		},
	},
	addCommands() {
		return {
			setFigure:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: {
							src: options.src,
							alt: options.alt ?? '',
							caption: options.caption ?? '',
						},
					});
				},
		};
	},
});
