import {
	joinPath,
	listDir,
	makeDir,
	pathExists,
	readBytes,
	resolveProjectPath,
	writeBytes,
} from '$lib/host/files';
import { parentDir, relativeFrom, slugify } from '$lib/project/paths';

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;

export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export type ImportedAsset = {
	absolutePath: string;
	relativeSrc: string;
};

const HASH_LENGTH = 8;

function isImageExtension(value: string): value is ImageExtension {
	return (IMAGE_EXTENSIONS as readonly string[]).includes(value);
}

export function imageExtensionFrom(name: string, mime?: string): ImageExtension | null {
	const fromName = name.split('.').pop()?.toLowerCase() ?? '';
	if (isImageExtension(fromName)) {
		return fromName === 'jpeg' ? 'jpg' : fromName;
	}
	switch (mime) {
		case 'image/png':
			return 'png';
		case 'image/jpeg':
			return 'jpg';
		case 'image/gif':
			return 'gif';
		case 'image/webp':
			return 'webp';
		case undefined:
			return null;
		default:
			return null;
	}
}

export function isImageFile(file: File): boolean {
	return imageExtensionFrom(file.name, file.type) !== null;
}

async function shortHash(bytes: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return hex.slice(0, HASH_LENGTH);
}

async function existingByHash(
	assetsDir: string,
	hash: string,
	extension: ImageExtension,
): Promise<string | null> {
	if (!(await pathExists(assetsDir))) {
		return null;
	}
	const suffix = `-${hash}.${extension}`;
	for (const entry of await listDir(assetsDir)) {
		if (entry.isFile && entry.name.toLowerCase().endsWith(suffix)) {
			return await joinPath(assetsDir, entry.name);
		}
	}
	return null;
}

export async function importImageBytes(input: {
	projectRoot: string;
	chapterPath: string;
	bytes: Uint8Array;
	originalName: string;
	mime?: string;
}): Promise<ImportedAsset> {
	const extension = imageExtensionFrom(input.originalName, input.mime);
	if (!extension) {
		throw new Error('unsupported-image');
	}
	const hash = await shortHash(input.bytes);
	const assetsDir = await resolveProjectPath(input.projectRoot, 'assets');
	await makeDir(assetsDir);
	const reused = await existingByHash(assetsDir, hash, extension);
	const absolutePath =
		reused ??
		(await resolveProjectPath(
			input.projectRoot,
			`assets/${slugify(input.originalName.replace(/\.[^.]+$/, ''), 'bild')}-${hash}.${extension}`,
		));
	if (!reused) {
		await writeBytes(absolutePath, input.bytes);
	}
	return {
		absolutePath,
		relativeSrc: relativeFrom(parentDir(input.chapterPath), absolutePath),
	};
}

export async function importImagePath(input: {
	projectRoot: string;
	chapterPath: string;
	sourcePath: string;
}): Promise<ImportedAsset> {
	const bytes = await readBytes(input.sourcePath);
	const originalName = input.sourcePath.split(/[/\\]/).pop() ?? 'bild';
	return importImageBytes({
		projectRoot: input.projectRoot,
		chapterPath: input.chapterPath,
		bytes,
		originalName,
	});
}
