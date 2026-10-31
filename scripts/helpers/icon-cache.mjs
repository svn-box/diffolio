import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function iconCacheKey(root, inputs, toolchain) {
	const hash = createHash('sha256').update(JSON.stringify(toolchain));
	for (const path of [...inputs].sort()) {
		hash.update(path)
			.update('\0')
			.update(await readFile(join(root, path)))
			.update('\0');
	}
	return hash.digest('hex');
}

export async function restoreIconCache(root, key, outputs) {
	const cache = join(root, '.cache/icons');
	const verified = new Map();
	try {
		const manifest = JSON.parse(await readFile(join(cache, 'manifest.json'), 'utf8'));
		if (manifest.key !== key || Object.keys(manifest.files).sort().join('\0') !== [...outputs].sort().join('\0')) {
			return false;
		}
		for (const path of outputs) {
			const bytes = await readFile(join(cache, 'files', path));
			if (digest(bytes) !== manifest.files[path]) {
				return false;
			}
			verified.set(path, bytes);
		}
	} catch {
		return false;
	}
	for (const [path, bytes] of verified) {
		const destination = join(root, path);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, bytes);
	}
	return true;
}

export async function storeIconCache(root, key, outputs) {
	const cache = join(root, '.cache/icons');
	const files = {};
	for (const path of outputs) {
		const bytes = await readFile(join(root, path));
		const destination = join(cache, 'files', path);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, bytes);
		files[path] = digest(bytes);
	}
	const temporary = join(cache, `manifest-${randomUUID()}.tmp`);
	await writeFile(temporary, JSON.stringify({ key, files }) + '\n');
	await rename(temporary, join(cache, 'manifest.json'));
}
