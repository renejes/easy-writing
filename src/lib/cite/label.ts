import type { BibEntry } from './parseBib';
import { entryAuthor, entryContainer, entryTitle, entryYear, familyName } from './parseBib';

export function citeChipLabel(entry: BibEntry | undefined, key: string, locator: string): string {
	const loc = locator.trim();
	if (!entry) {
		return loc.length > 0 ? `${key}, ${loc}` : key;
	}
	const family = familyName(entryAuthor(entry));
	const year = entryYear(entry);
	const who = family.length > 0 ? family : key;
	const core = year.length > 0 ? `${who}, ${year}` : who;
	return loc.length > 0 ? `${core}, ${loc}` : core;
}

export function citeHoverText(entry: BibEntry): string {
	const parts = [entryTitle(entry), entryAuthor(entry), entryYear(entry), entryContainer(entry)].filter(
		(part) => part.length > 0,
	);
	return parts.join(' — ');
}
