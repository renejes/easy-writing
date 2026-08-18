import { describe, expect, it } from 'vitest';
import { entryAuthor, entryTitle, entryYear, parseBibTeX } from './parseBib';

const SOURCE = `
@article{lim2010sleep,
  author = {Lim, Julian and Dinges, David F.},
  title = {A Meta-Analysis of the Impact of Short-Term Sleep Deprivation on Cognitive Variables},
  journal = {Psychological Bulletin},
  year = {2010}
}

@book{kahneman2011thinking,
  author = {Kahneman, Daniel},
  title = {Thinking, Fast and Slow},
  publisher = {Farrar, Straus and Giroux},
  year = {2011}
}

@incollection{baumeister1998ego,
  author = {Baumeister, Roy F. and Bratslavsky, Ellen and Muraven, Mark and Tice, Dianne M.},
  title = {Ego Depletion: Is the Active Self a Limited Resource?},
  booktitle = {Handbook of Self-Regulation},
  year = {1998}
}

@article{mueller2014umlaut,
  author = {Müller, Jürgen},
  title = {Überprüfung der Arbeitsgedächtnisbelastung},
  journal = {Zeitschrift für Psychologie},
  year = {2014}
}
`;

describe('parseBibTeX', () => {
	it('parses article, book, incollection and umlauts', () => {
		const entries = parseBibTeX(SOURCE);
		expect(entries.map((entry) => entry.key)).toEqual([
			'lim2010sleep',
			'kahneman2011thinking',
			'baumeister1998ego',
			'mueller2014umlaut',
		]);
		const lim = entries[0];
		expect(lim.type).toBe('article');
		expect(entryAuthor(lim)).toContain('Lim, Julian');
		expect(entryTitle(lim)).toContain('Sleep Deprivation');
		expect(entryYear(lim)).toBe('2010');
		expect(entries[1].type).toBe('book');
		expect(entries[2].type).toBe('incollection');
		expect(entryAuthor(entries[3])).toBe('Müller, Jürgen');
		expect(entryTitle(entries[3])).toContain('Überprüfung');
	});

	it('ignores comments and string entries', () => {
		const entries = parseBibTeX('% note\n@string{foo = "bar"}\n@article{ok2024, title = {Hi}, year = {2024}}');
		expect(entries).toHaveLength(1);
		expect(entries[0].key).toBe('ok2024');
	});
});
