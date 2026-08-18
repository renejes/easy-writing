const IMAGE_MD = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function isRemoteSrc(src: string): boolean {
	return /^(https?:|data:|blob:|asset:|file:)/i.test(src);
}

export function rewriteMarkdownImages(
	markdown: string,
	rewrite: (alt: string, src: string) => { alt: string; src: string },
): string {
	return markdown.replace(IMAGE_MD, (_all, alt: string, src: string) => {
		const next = rewrite(alt, src);
		return `![${next.alt}](${next.src})`;
	});
}

export function collectMarkdownImageSrcs(markdown: string): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	for (const match of markdown.matchAll(IMAGE_MD)) {
		const src = match[2];
		if (isRemoteSrc(src) || seen.has(src)) {
			continue;
		}
		seen.add(src);
		found.push(src);
	}
	return found;
}

export function replaceSrcInHtml(html: string, from: string, to: string): string {
	const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return html.replace(new RegExp(`src="${escaped}"`, 'g'), `src="${to}"`);
}

export function extOf(path: string): string {
	const base = path.split(/[/\\]/).pop() ?? path;
	const dot = base.lastIndexOf('.');
	return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

export function mimeForExt(ext: string): string {
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

export function toDataUrl(bytes: Uint8Array, ext: string): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return `data:${mimeForExt(ext)};base64,${btoa(binary)}`;
}

export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
	if (bytes.length < 24) {
		return null;
	}
	if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
		return null;
	}
	const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
	const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
	if (width <= 0 || height <= 0) {
		return null;
	}
	return { width, height };
}

export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
		return null;
	}
	let offset = 2;
	while (offset + 8 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = bytes[offset + 1];
		if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
			const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
			const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
			if (width > 0 && height > 0) {
				return { width, height };
			}
			return null;
		}
		const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
		offset += 2 + length;
	}
	return null;
}

export function imageSize(bytes: Uint8Array, ext: string): { width: number; height: number } {
	const parsed = ext === 'png' ? pngSize(bytes) : jpegSize(bytes);
	if (parsed) {
		return parsed;
	}
	return { width: 1200, height: 800 };
}
