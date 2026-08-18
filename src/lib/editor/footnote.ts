import { mergeAttributes, Node } from '@tiptap/core';
import { pendingFootnoteText } from './markdownRoundtrip';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		footnote: {
			setFootnote: (options: { id: string; text: string }) => ReturnType;
		};
	}
}

export const Footnote = Node.create({
	name: 'footnote',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,
	addAttributes() {
		return {
			id: { default: '1' },
			text: { default: '' },
		};
	},
	parseHTML() {
		return [
			{
				tag: 'span[data-footnote]',
				getAttrs: (element) => {
					if (!(element instanceof HTMLElement)) {
						return false;
					}
					return {
						id: element.getAttribute('data-id') ?? '1',
						text: element.getAttribute('data-text') ?? element.getAttribute('title') ?? '',
					};
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		const id = String(HTMLAttributes.id ?? '1');
		const text = String(HTMLAttributes.text ?? '');
		return [
			'span',
			mergeAttributes({
				'data-footnote': '',
				'data-id': id,
				'data-text': text,
				class: 'fn-chip',
				title: text,
			}),
			`[^${id}]`,
		];
	},
	parseMarkdown(token, helpers) {
		const id = String(token.id ?? '');
		return helpers.createNode('footnote', {
			id,
			text: String(token.note ?? pendingFootnoteText(id)),
		});
	},
	renderMarkdown(node) {
		return `[^${String(node.attrs?.id ?? '1')}]`;
	},
	markdownTokenizer: {
		name: 'footnote',
		level: 'inline',
		start(src) {
			const match = src.match(/\[\^/);
			return match?.index ?? -1;
		},
		tokenize(src) {
			const match = src.match(/^\[\^([^\]]+)\](?!:)/);
			if (!match) {
				return undefined;
			}
			return {
				type: 'footnote',
				raw: match[0],
				id: match[1],
				note: pendingFootnoteText(match[1]),
			};
		},
	},
	addCommands() {
		return {
			setFootnote:
				(options) =>
				({ commands }) => {
					return commands.insertContent([
						{ type: this.name, attrs: { id: options.id, text: options.text } },
						{ type: 'text', text: ' ' },
					]);
				},
		};
	},
});
