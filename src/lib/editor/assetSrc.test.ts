import { afterEach, describe, expect, it } from 'vitest';
import { markdownSrcToDisplay, mimeFromPath, setEditorAssetContext } from './assetSrc';

afterEach(() => {
	setEditorAssetContext(null);
});

describe('mimeFromPath', () => {
	it('maps common image extensions', () => {
		expect(mimeFromPath('a.png')).toBe('image/png');
		expect(mimeFromPath('a.JPG')).toBe('image/jpeg');
		expect(mimeFromPath('a.webp')).toBe('image/webp');
	});
});

describe('markdownSrcToDisplay', () => {
	it('leaves remote and protocol URLs alone', () => {
		expect(markdownSrcToDisplay('https://example.com/a.png')).toBe('https://example.com/a.png');
		expect(markdownSrcToDisplay('data:image/png;base64,aa')).toBe('data:image/png;base64,aa');
		expect(markdownSrcToDisplay('blob:http://localhost/1')).toBe('blob:http://localhost/1');
	});

	it('returns an empty src for scoped files until a blob is loaded', () => {
		setEditorAssetContext({
			projectRoot: 'scoped:abc',
			chapterPath: 'scoped:abc/chapters/01.mdx',
		});
		expect(markdownSrcToDisplay('../assets/pic.png')).toBe('');
	});
});
