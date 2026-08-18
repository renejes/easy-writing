import { watch, type UnwatchFn, type WatchEvent } from '@tauri-apps/plugin-fs';
import { isOwnWrite } from './ownWrites';
import { shouldIgnorePath } from './watchIgnore';

export type ProjectFileChange = {
	paths: string[];
};

export { shouldIgnorePath };

function isIgnorableKind(event: WatchEvent): boolean {
	if (event.type === 'other') {
		return true;
	}
	if (typeof event.type !== 'object') {
		return false;
	}
	if ('access' in event.type) {
		return true;
	}
	if ('modify' in event.type && event.type.modify.kind === 'metadata') {
		return true;
	}
	return false;
}

export async function watchDirectory(
	root: string,
	onChange: (change: ProjectFileChange) => void,
): Promise<UnwatchFn> {
	return watch(
		root,
		(event) => {
			if (isIgnorableKind(event)) {
				return;
			}
			const paths = event.paths.filter((path) => !shouldIgnorePath(path) && !isOwnWrite(path));
			if (paths.length === 0) {
				return;
			}
			onChange({ paths });
		},
		{ recursive: true, delayMs: 400 },
	);
}
