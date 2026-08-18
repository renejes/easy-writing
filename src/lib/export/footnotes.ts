const DEF_LINE = /^\[\^([^\]]+)\]:\s*(.*)$/;

export type FootnoteDef = { id: string; text: string };

export function splitExportFootnotes(markdown: string): { body: string; defs: FootnoteDef[] } {
	const lines = markdown.split('\n');
	const defs: FootnoteDef[] = [];
	const body: string[] = [];
	const seen = new Set<string>();
	let index = 0;
	while (index < lines.length) {
		const match = lines[index].match(DEF_LINE);
		if (!match) {
			body.push(lines[index]);
			index += 1;
			continue;
		}
		const parts = [match[2]];
		index += 1;
		while (index < lines.length) {
			const line = lines[index];
			if (line.length === 0) {
				if (index + 1 < lines.length && /^[ \t]/.test(lines[index + 1])) {
					parts.push('');
					index += 1;
					continue;
				}
				break;
			}
			if (!/^[ \t]/.test(line) || DEF_LINE.test(line)) {
				break;
			}
			parts.push(line.replace(/^[ \t]+/, ''));
			index += 1;
		}
		if (!seen.has(match[1])) {
			seen.add(match[1]);
			defs.push({ id: match[1], text: parts.join('\n').trim() });
		}
	}
	return { body: body.join('\n'), defs };
}

export function applyFootnoteMarkers(markdown: string, heading: string): string {
	const split = splitExportFootnotes(markdown);
	if (split.defs.length === 0) {
		return split.body.replace(/\[\^([^\]]+)\]/g, '^[$1]');
	}
	const numbers = new Map(split.defs.map((def, index) => [def.id, index + 1]));
	const body = split.body.replace(/\[\^([^\]]+)\]/g, (_all, id: string) => {
		const n = numbers.get(id);
		return n ? `[^${n}]` : '';
	});
	const block = split.defs
		.map((def, index) => `[^${index + 1}]: ${def.text}`)
		.join('\n\n');
	const titled = heading.length > 0 ? `${body.trimEnd()}\n\n## ${heading}\n\n${block}\n` : `${body.trimEnd()}\n\n${block}\n`;
	return titled;
}

export function footnotesToHtml(markdown: string, heading: string): string {
	const split = splitExportFootnotes(markdown);
	let body = split.body;
	if (split.defs.length === 0) {
		return body.replace(/\[\^([^\]]+)\]/g, '');
	}
	const numbers = new Map(split.defs.map((def, index) => [def.id, index + 1]));
	body = body.replace(/\[\^([^\]]+)\]/g, (_all, id: string) => {
		const n = numbers.get(id);
		if (!n) {
			return '';
		}
		return `<sup class="fn"><a href="#fn-${n}">${n}</a></sup>`;
	});
	const items = split.defs
		.map((def, index) => `<li id="fn-${index + 1}">${escapeHtml(def.text)}</li>`)
		.join('');
	return `${body}\n\n<section class="footnotes"><h2>${escapeHtml(heading)}</h2><ol>${items}</ol></section>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}
