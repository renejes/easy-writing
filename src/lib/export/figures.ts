function parseJsxAttributes(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	for (const match of source.matchAll(pattern)) {
		attrs[match[1]] = match[2] ?? match[3] ?? '';
	}
	return attrs;
}

export function convertFigures(markdown: string): string {
	return markdown.replace(/<Figure\b([^>]*?)\s*\/>/gi, (_all, raw: string) => {
		const attrs = parseJsxAttributes(raw);
		const src = attrs.src ?? '';
		if (src.length === 0) {
			return '';
		}
		const alt = attrs.alt ?? '';
		const caption = attrs.caption ?? '';
		const image = `![${alt}](${src})`;
		return caption.length > 0 ? `${image}\n\n*${caption}*` : image;
	});
}
