export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function samePath(a: string, b: string): boolean {
	return normalizePath(a) === normalizePath(b);
}

export function relativeToRoot(root: string, absolute: string): string {
	const rootPath = root.replace(/\\/g, '/').replace(/\/+$/, '');
	const absPath = absolute.replace(/\\/g, '/');
	if (absPath === rootPath) {
		return '';
	}
	if (absPath.startsWith(`${rootPath}/`)) {
		return absPath.slice(rootPath.length + 1);
	}
	const lowerRoot = rootPath.toLowerCase();
	const lowerAbs = absPath.toLowerCase();
	if (lowerAbs.startsWith(`${lowerRoot}/`)) {
		return absPath.slice(rootPath.length + 1);
	}
	return absPath;
}

export function splitRelative(relativePath: string): string[] {
	return relativePath.split(/[/\\]+/).filter((part) => part.length > 0);
}

export function isMarkdownName(name: string): boolean {
	return /\.(mdx|md)$/i.test(name);
}

export function slugify(input: string, fallback = 'kapitel'): string {
	const umlauts: Record<string, string> = {
		ä: 'ae',
		ö: 'oe',
		ü: 'ue',
		ß: 'ss',
	};
	const replaced = input
		.trim()
		.toLowerCase()
		.replace(/[äöüß]/g, (char) => umlauts[char] ?? char)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return replaced.length > 0 ? replaced : fallback;
}

export function titleFromRelativePath(relativePath: string): string {
	const base = relativePath.split(/[/\\]/).pop() ?? relativePath;
	const noExt = base.replace(/\.(mdx|md)$/i, '');
	const stripped = noExt.replace(/^\d+[-_]/, '');
	const spaced = stripped.replace(/[-_]+/g, ' ').trim();
	if (spaced.length === 0) {
		return noExt;
	}
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function eventTouches(paths: string[], absolutePath: string): boolean {
	const target = normalizePath(absolutePath);
	return paths.some((path) => normalizePath(path) === target);
}

export function parentDir(path: string): string {
	const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
	const index = normalized.lastIndexOf('/');
	if (index <= 0) {
		return normalized;
	}
	return normalized.slice(0, index);
}

export function relativeFrom(fromDir: string, toFile: string): string {
	const fromParts = fromDir.replace(/\\/g, '/').replace(/\/+$/, '').split('/');
	const toParts = toFile.replace(/\\/g, '/').split('/');
	let shared = 0;
	const lastTo = toParts.length - 1;
	while (shared < fromParts.length && shared < lastTo && fromParts[shared] === toParts[shared]) {
		shared += 1;
	}
	const ups = fromParts.length - shared;
	const rest = toParts.slice(shared);
	return [...Array.from({ length: ups }, () => '..'), ...rest].join('/');
}

export function resolveFrom(fromDir: string, relative: string): string {
	if (relative.startsWith('/') || /^[a-zA-Z]:/.test(relative)) {
		return relative.replace(/\\/g, '/');
	}
	const parts = [...fromDir.replace(/\\/g, '/').replace(/\/+$/, '').split('/'), ...relative.split('/')];
	const stack: string[] = [];
	for (const part of parts) {
		if (!part || part === '.') {
			continue;
		}
		if (part === '..') {
			stack.pop();
			continue;
		}
		stack.push(part);
	}
	const joined = stack.join('/');
	if (stack[0]?.startsWith('scoped:')) {
		return joined;
	}
	return `/${joined}`.replace(/^\/+/, '/');
}
