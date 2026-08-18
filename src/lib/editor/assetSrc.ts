import { convertFileSrc } from '@tauri-apps/api/core';
import { parentDir, resolveFrom } from '$lib/project/paths';

export type EditorAssetContext = {
	projectRoot: string;
	chapterPath: string;
};

let context: EditorAssetContext | null = null;

export function setEditorAssetContext(next: EditorAssetContext | null): void {
	context = next;
}

function isRemoteOrProtocol(src: string): boolean {
	return /^(https?:|asset:|data:|blob:|http:\/\/asset\.localhost)/i.test(src);
}

export function markdownSrcToDisplay(src: string): string {
	if (!src || isRemoteOrProtocol(src) || !context) {
		return src;
	}
	try {
		return convertFileSrc(resolveFrom(parentDir(context.chapterPath), src));
	} catch {
		return src;
	}
}
