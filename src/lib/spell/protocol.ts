export type SpellLang = 'de' | 'en-US' | 'en-GB';

export type SpellRequest =
	| { type: 'configure'; id: number; lang: SpellLang; extra: string[] }
	| { type: 'check'; id: number; words: string[] }
	| { type: 'suggest'; id: number; word: string }
	| { type: 'add'; word: string };

export type SpellResponse =
	| { type: 'ready'; id: number; lang: SpellLang }
	| { type: 'misspelled'; id: number; words: string[] }
	| { type: 'suggestions'; id: number; word: string; suggestions: string[] }
	| { type: 'error'; id: number; message: string };
