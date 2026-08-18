export const CSL_IDS = [
	'apa',
	'chicago-author-date',
	'chicago-note',
	'harvard-cite-them-right',
	'vancouver',
] as const;

export type CslId = (typeof CSL_IDS)[number];

export function isCslId(value: string): value is CslId {
	return (CSL_IDS as readonly string[]).includes(value);
}

export function cslLabelKey(id: CslId): 'cslApa' | 'cslChicagoAuthorDate' | 'cslChicagoNote' | 'cslHarvard' | 'cslVancouver' {
	switch (id) {
		case 'apa':
			return 'cslApa';
		case 'chicago-author-date':
			return 'cslChicagoAuthorDate';
		case 'chicago-note':
			return 'cslChicagoNote';
		case 'harvard-cite-them-right':
			return 'cslHarvard';
		case 'vancouver':
			return 'cslVancouver';
		default: {
			const _exhaustive: never = id;
			return _exhaustive;
		}
	}
}
