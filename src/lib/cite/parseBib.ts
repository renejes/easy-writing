export type BibEntry = {
	key: string;
	type: string;
	fields: Record<string, string>;
};

function stripLineComments(source: string): string {
	return source
		.split('\n')
		.map((line) => {
			const trimmed = line.trimStart();
			if (trimmed.startsWith('%')) {
				return '';
			}
			return line;
		})
		.join('\n');
}

function readBraced(source: string, start: number): { value: string; next: number } | null {
	if (source[start] !== '{') {
		return null;
	}
	let depth = 0;
	for (let index = start; index < source.length; index += 1) {
		const char = source[index];
		if (char === '{') {
			depth += 1;
		} else if (char === '}') {
			depth -= 1;
			if (depth === 0) {
				return { value: source.slice(start + 1, index), next: index + 1 };
			}
		}
	}
	return null;
}

function readQuoted(source: string, start: number): { value: string; next: number } | null {
	if (source[start] !== '"') {
		return null;
	}
	let index = start + 1;
	while (index < source.length) {
		if (source[index] === '"' && source[index - 1] !== '\\') {
			return { value: source.slice(start + 1, index), next: index + 1 };
		}
		index += 1;
	}
	return null;
}

function skipWs(source: string, start: number): number {
	let index = start;
	while (index < source.length && /\s/.test(source[index])) {
		index += 1;
	}
	return index;
}

function readFieldValue(source: string, start: number): { value: string; next: number } | null {
	const at = skipWs(source, start);
	if (source[at] === '{') {
		const braced = readBraced(source, at);
		if (!braced) {
			return null;
		}
		return { value: braced.value.replace(/\s+/g, ' ').trim(), next: braced.next };
	}
	if (source[at] === '"') {
		const quoted = readQuoted(source, at);
		if (!quoted) {
			return null;
		}
		return { value: quoted.value.replace(/\s+/g, ' ').trim(), next: quoted.next };
	}
	const match = source.slice(at).match(/^[^,}\s]+/);
	if (!match) {
		return null;
	}
	return { value: match[0], next: at + match[0].length };
}

function parseFields(body: string): Record<string, string> {
	const fields: Record<string, string> = {};
	let index = 0;
	while (index < body.length) {
		index = skipWs(body, index);
		if (index >= body.length || body[index] === '}') {
			break;
		}
		const rest = body.slice(index);
		const nameMatch = rest.match(/^([A-Za-z][\w-]*)\s*=/);
		if (!nameMatch) {
			index += 1;
			continue;
		}
		const name = nameMatch[1].toLowerCase();
		const value = readFieldValue(body, index + nameMatch[0].length);
		if (!value) {
			break;
		}
		fields[name] = value.value;
		index = skipWs(body, value.next);
		if (body[index] === ',') {
			index += 1;
		}
	}
	return fields;
}

export function parseBibTeX(source: string): BibEntry[] {
	const text = stripLineComments(source);
	const entries: BibEntry[] = [];
	let index = 0;
	while (index < text.length) {
		if (text[index] !== '@') {
			index += 1;
			continue;
		}
		const header = text.slice(index).match(/^@(\w+)\s*\{/);
		if (!header) {
			index += 1;
			continue;
		}
		const type = header[1].toLowerCase();
		const open = index + header[0].length - 1;
		const braced = readBraced(text, open);
		if (!braced) {
			break;
		}
		if (type !== 'comment' && type !== 'preamble' && type !== 'string') {
			const inner = braced.value;
			const comma = inner.indexOf(',');
			if (comma > 0) {
				const key = inner.slice(0, comma).trim();
				if (key.length > 0) {
					entries.push({
						key,
						type,
						fields: parseFields(inner.slice(comma + 1)),
					});
				}
			}
		}
		index = braced.next;
	}
	return entries;
}

export function fieldOf(entry: BibEntry, name: string): string {
	return entry.fields[name] ?? '';
}

export function entryAuthor(entry: BibEntry): string {
	return fieldOf(entry, 'author') || fieldOf(entry, 'editor');
}

export function entryTitle(entry: BibEntry): string {
	return fieldOf(entry, 'title');
}

export function entryYear(entry: BibEntry): string {
	const year = fieldOf(entry, 'year');
	if (year) {
		return year;
	}
	const date = fieldOf(entry, 'date');
	const match = date.match(/\d{4}/);
	return match ? match[0] : '';
}

export function entryContainer(entry: BibEntry): string {
	return fieldOf(entry, 'journal') || fieldOf(entry, 'booktitle') || fieldOf(entry, 'publisher');
}

export function familyName(authorField: string): string {
	const first = authorField.split(/\s+and\s+/i)[0]?.trim() ?? '';
	if (first.length === 0) {
		return '';
	}
	if (first.includes(',')) {
		return first.split(',')[0].trim();
	}
	const parts = first.split(/\s+/);
	return parts[parts.length - 1] ?? first;
}

export function filterEntries(entries: BibEntry[], query: string): BibEntry[] {
	const needle = query.trim().toLowerCase();
	const pool = needle.length === 0
		? entries
		: entries.filter((entry) => {
				const hay = [entry.key, entryAuthor(entry), entryTitle(entry), entryYear(entry)]
					.join(' ')
					.toLowerCase();
				return hay.includes(needle);
			});
	return pool.slice(0, 20);
}
