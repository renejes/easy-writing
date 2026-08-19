import { convertFileSrc } from '@tauri-apps/api/core';
import { readBytes } from '$lib/host/files';
import { isScopedPath } from '$lib/host/scopedPath';
import { parentDir, resolveFrom } from '$lib/project/paths';

export type EditorAssetContext = {
	projectRoot: string;
	chapterPath: string;
};

let context: EditorAssetContext | null = null;
const blobUrls = new Map<string, string>();

export function setEditorAssetContext(next: EditorAssetContext | null): void {
	if (context?.projectRoot !== next?.projectRoot) {
		clearBlobUrls();
	}
	context = next;
}

function clearBlobUrls(): void {
	for (const url of blobUrls.values()) {
		URL.revokeObjectURL(url);
	}
	blobUrls.clear();
}

function isRemoteOrProtocol(src: string): boolean {
	return /^(https?:|asset:|data:|blob:|http:\/\/asset\.localhost)/i.test(src);
}

export function mimeFromPath(path: string): string {
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	switch (ext) {
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		default:
			return 'application/octet-stream';
	}
}

function absoluteFromMarkdown(src: string): string | null {
	if (!src || isRemoteOrProtocol(src) || !context) {
		return null;
	}
	return resolveFrom(parentDir(context.chapterPath), src);
}

export function markdownSrcToDisplay(src: string): string {
	if (!src || isRemoteOrProtocol(src) || !context) {
		return src;
	}
	const absolute = absoluteFromMarkdown(src);
	if (!absolute) {
		return src;
	}
	if (isScopedPath(absolute)) {
		return blobUrls.get(absolute) ?? '';
	}
	try {
		return convertFileSrc(absolute);
	} catch {
		return src;
	}
}

export async function ensureDisplaySrc(src: string): Promise<string> {
	if (!src || isRemoteOrProtocol(src) || !context) {
		return src;
	}
	const absolute = absoluteFromMarkdown(src);
	if (!absolute) {
		return src;
	}
	if (!isScopedPath(absolute)) {
		return markdownSrcToDisplay(src);
	}
	const cached = blobUrls.get(absolute);
	if (cached) {
		return cached;
	}
	const bytes = await readBytes(absolute);
	const copy = new Uint8Array(bytes);
	const url = URL.createObjectURL(new Blob([copy], { type: mimeFromPath(absolute) }));
	blobUrls.set(absolute, url);
	return url;
}

export async function hydrateEditorImages(root: ParentNode): Promise<void> {
	const images = [...root.querySelectorAll('img[data-md-src]')];
	await Promise.all(
		images.map(async (img) => {
			const markdownSrc = img.getAttribute('data-md-src');
			if (!markdownSrc) {
				return;
			}
			const current = img.getAttribute('src') ?? '';
			if (isRemoteOrProtocol(current) && current.length > 0) {
				return;
			}
			const display = await ensureDisplaySrc(markdownSrc);
			if (display && img.getAttribute('src') !== display) {
				img.setAttribute('src', display);
			}
		}),
	);
}
