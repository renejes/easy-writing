import { appState } from '$lib/appState.svelte';
import type { BibEntry } from './parseBib';

export function findBibEntry(key: string): BibEntry | undefined {
	const needle = key.toLowerCase();
	return appState.bibEntries.find((entry) => entry.key.toLowerCase() === needle);
}
