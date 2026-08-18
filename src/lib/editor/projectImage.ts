import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { markdownSrcToDisplay } from './assetSrc';

export const ProjectImage = Image.extend({
	name: 'image',
	addAttributes() {
		return {
			...this.parent?.(),
			src: {
				default: null,
				parseHTML: (element: HTMLElement) =>
					element.getAttribute('data-md-src') || element.getAttribute('src'),
			},
		};
	},
	renderHTML({ HTMLAttributes }) {
		const markdownSrc = String(HTMLAttributes.src ?? '');
		return [
			'img',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				src: markdownSrcToDisplay(markdownSrc),
				'data-md-src': markdownSrc,
			}),
		];
	},
});
