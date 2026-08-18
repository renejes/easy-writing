import { describe, expect, it } from 'vitest';
import { flattenProject } from './flatten';

describe('flattenProject', () => {
	it('keeps chapter order and rewrites image paths', () => {
		const result = flattenProject({
			root: '/proj',
			title: 'Paper',
			lang: 'de',
			chapters: [
				{
					relativePath: 'chapters/01.mdx',
					absolutePath: '/proj/chapters/01.mdx',
					markdown: '![A](../assets/one.png)\n',
				},
				{
					relativePath: 'chapters/02.mdx',
					absolutePath: '/proj/chapters/02.mdx',
					markdown: 'Zweiter Teil\n',
				},
			],
		});
		expect(result.markdown).toContain('![A](assets/one.png)');
		expect(result.markdown.indexOf('assets/one.png')).toBeLessThan(result.markdown.indexOf('Zweiter Teil'));
		expect(result.imageSrcs).toEqual(['assets/one.png']);
	});

	it('takes title from the first chapter frontmatter', () => {
		const result = flattenProject({
			root: '/proj',
			title: 'Fallback',
			lang: 'de',
			chapters: [
				{
					relativePath: 'index.mdx',
					absolutePath: '/proj/index.mdx',
					markdown: '---\ntitle: "Schlaf"\nlang: en-US\n---\n\nHallo\n',
				},
			],
		});
		expect(result.title).toBe('Schlaf');
		expect(result.lang).toBe('en-US');
		expect(result.markdown).toBe('Hallo\n');
	});
});
