import { isCslId, type CslId } from '$lib/cite/csl';
import {
	entryAuthor,
	entryContainer,
	entryTitle,
	entryYear,
	type BibEntry,
} from '$lib/cite/parseBib';
import { splitExportFootnotes } from './footnotes';

export type CiteCluster = {
	keys: string[];
	locator: string;
	raw: string;
};

const CITE_RE = /\[@([^\]]+)\]/g;

type Person = { family: string; given: string };

function parsePeople(field: string): Person[] {
	if (field.trim().length === 0) {
		return [];
	}
	return field.split(/\s+and\s+/i).map((part) => {
		const trimmed = part.trim();
		if (trimmed.includes(',')) {
			const comma = trimmed.indexOf(',');
			return { family: trimmed.slice(0, comma).trim(), given: trimmed.slice(comma + 1).trim() };
		}
		const bits = trimmed.split(/\s+/);
		return { family: bits[bits.length - 1] ?? trimmed, given: bits.slice(0, -1).join(' ') };
	});
}

function initials(given: string): string {
	return given
		.split(/[\s-]+/)
		.filter((part) => part.length > 0)
		.map((part) => `${part.charAt(0).toUpperCase()}.`)
		.join(' ');
}

function apaNames(people: Person[]): string {
	if (people.length === 0) {
		return '';
	}
	const formatted = people.map((person) => {
		const given = initials(person.given);
		return given.length > 0 ? `${person.family}, ${given}` : person.family;
	});
	if (formatted.length === 1) {
		return formatted[0];
	}
	if (formatted.length === 2) {
		return `${formatted[0]} & ${formatted[1]}`;
	}
	return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

function inTextNames(people: Person[], etAl: boolean): string {
	if (people.length === 0) {
		return '';
	}
	if (etAl && people.length > 2) {
		return `${people[0].family} et al.`;
	}
	if (people.length === 1) {
		return people[0].family;
	}
	if (people.length === 2) {
		return `${people[0].family} & ${people[1].family}`;
	}
	return `${people[0].family} et al.`;
}

function resolveStyle(value: string | undefined): CslId {
	return value && isCslId(value) ? value : 'apa';
}

export function collectCiteClusters(markdown: string): CiteCluster[] {
	const clusters: CiteCluster[] = [];
	for (const match of markdown.matchAll(CITE_RE)) {
		const inner = match[1].trim();
		const parts = inner.split(/\s*;\s*/);
		const keys: string[] = [];
		let locator = '';
		for (const part of parts) {
			const cleaned = part.replace(/^@/, '').trim();
			const comma = cleaned.search(/,\s*/);
			if (comma < 0) {
				if (cleaned.length > 0) {
					keys.push(cleaned);
				}
				continue;
			}
			const key = cleaned.slice(0, comma).trim();
			if (key.length > 0) {
				keys.push(key);
			}
			locator = cleaned.slice(comma + 1).trim();
		}
		clusters.push({ keys, locator, raw: match[0] });
	}
	return clusters;
}

function entryByKey(entries: BibEntry[], key: string): BibEntry | undefined {
	return entries.find((entry) => entry.key === key);
}

function formatInText(
	style: CslId,
	entries: BibEntry[],
	keys: string[],
	locator: string,
	numbers: Map<string, number>,
): string {
	const loc = locator.length > 0 ? `, ${locator}` : '';
	switch (style) {
		case 'vancouver':
		case 'chicago-note': {
			const nums = keys.map((key) => numbers.get(key) ?? '?').join(',');
			return `[${nums}${locator.length > 0 ? `, ${locator}` : ''}]`;
		}
		case 'apa':
		case 'chicago-author-date':
		case 'harvard-cite-them-right': {
			const bits = keys.map((key) => {
				const entry = entryByKey(entries, key);
				if (!entry) {
					return key;
				}
				const who = inTextNames(parsePeople(entryAuthor(entry)), true);
				const year = entryYear(entry);
				return year.length > 0 ? `${who}, ${year}` : who || key;
			});
			return `(${bits.join('; ')}${loc})`;
		}
		default: {
			const _exhaustive: never = style;
			return _exhaustive;
		}
	}
}

function formatBibLine(style: CslId, entry: BibEntry, index: number): string {
	const people = parsePeople(entryAuthor(entry));
	const names = apaNames(people) || entry.key;
	const year = entryYear(entry);
	const title = entryTitle(entry);
	const container = entryContainer(entry);
	const yearBit = year.length > 0 ? ` (${year})` : '';
	const titleBit = title.length > 0 ? ` ${title}.` : '';
	const rest = container.length > 0 ? ` ${container}.` : '';
	switch (style) {
		case 'vancouver':
		case 'chicago-note':
			return `${index}. ${names}${yearBit}.${titleBit}${rest}`.replace(/\.\./g, '.');
		case 'apa':
		case 'chicago-author-date':
		case 'harvard-cite-them-right':
			return `${names}${yearBit}.${titleBit}${rest}`.replace(/\.\./g, '.');
		default: {
			const _exhaustive: never = style;
			return _exhaustive;
		}
	}
}

export function applyCitations(
	markdown: string,
	entries: BibEntry[],
	csl: string | undefined,
	bibliographyHeading: string,
): string {
	const style = resolveStyle(csl);
	const clusters = collectCiteClusters(markdown);
	if (clusters.length === 0) {
		return markdown;
	}
	const order = citeKeyOrder(clusters);
	const numbers = new Map(order.map((key, index) => [key, index + 1]));
	const replaced = markdown.replace(CITE_RE, (raw) => {
		const cluster = collectCiteClusters(raw)[0];
		if (!cluster) {
			return raw;
		}
		return formatInText(style, entries, cluster.keys, cluster.locator, numbers);
	});
	return `${replaced.trimEnd()}\n\n## ${bibliographyHeading}\n\n${bibliographyLines(style, entries, order).join('\n\n')}\n`;
}

export type DocxFootnote = {
	id: number;
	text: string;
};

export function footnotePlaceholder(id: number): string {
	return `%%FN:${id}%%`;
}

function citeKeyOrder(clusters: CiteCluster[]): string[] {
	const order: string[] = [];
	const seen = new Set<string>();
	for (const cluster of clusters) {
		for (const key of cluster.keys) {
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			order.push(key);
		}
	}
	return order;
}

function bibliographyLines(style: CslId, entries: BibEntry[], order: string[]): string[] {
	return order.map((key, index) => {
		const entry = entryByKey(entries, key);
		if (!entry) {
			return `${index + 1}. ${key}`;
		}
		return formatBibLine(style, entry, index + 1);
	});
}

function formatChicagoNote(
	entries: BibEntry[],
	keys: string[],
	locator: string,
	numbers: Map<string, number>,
): string {
	const bits = keys.map((key) => {
		const entry = entryByKey(entries, key);
		if (!entry) {
			return key;
		}
		const line = formatBibLine('chicago-note', entry, numbers.get(key) ?? 0);
		return line.replace(/^\d+\.\s*/, '');
	});
	const loc = locator.length > 0 ? ` ${locator}` : '';
	return `${bits.join('; ')}${loc}`.trim();
}

export function prepareDocxMarkdown(
	markdown: string,
	entries: BibEntry[],
	csl: string | undefined,
	bibliographyHeading: string,
): { body: string; footnotes: DocxFootnote[] } {
	const split = splitExportFootnotes(markdown);
	const style = resolveStyle(csl);
	const clusters = collectCiteClusters(split.body);
	const order = citeKeyOrder(clusters);
	const numbers = new Map(order.map((key, index) => [key, index + 1]));
	const footnotes: DocxFootnote[] = [];
	const knownNotes = new Map<string, number>();
	let nextId = 1;
	const mark = /\[@([^\]]+)\]|\[\^([^\]]+)\]/g;
	let body = '';
	let last = 0;
	for (const match of split.body.matchAll(mark)) {
		const start = match.index ?? 0;
		body += split.body.slice(last, start);
		last = start + match[0].length;
		if (match[1] !== undefined) {
			const cluster = collectCiteClusters(match[0])[0];
			if (!cluster) {
				body += match[0];
				continue;
			}
			if (style === 'chicago-note') {
				const id = nextId;
				nextId += 1;
				footnotes.push({
					id,
					text: formatChicagoNote(entries, cluster.keys, cluster.locator, numbers),
				});
				body += footnotePlaceholder(id);
			} else {
				body += formatInText(style, entries, cluster.keys, cluster.locator, numbers);
			}
			continue;
		}
		const markdownId = match[2] ?? '';
		let id = knownNotes.get(markdownId);
		if (id === undefined) {
			id = nextId;
			nextId += 1;
			knownNotes.set(markdownId, id);
			const def = split.defs.find((entry) => entry.id === markdownId);
			footnotes.push({ id, text: def?.text ?? '' });
		}
		body += footnotePlaceholder(id);
	}
	body += split.body.slice(last);
	if (order.length > 0) {
		body = `${body.trimEnd()}\n\n## ${bibliographyHeading}\n\n${bibliographyLines(style, entries, order).join('\n\n')}\n`;
	}
	return { body, footnotes };
}
