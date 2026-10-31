import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// @ts-expect-error Build helpers run directly in Node.js.
import { iconCacheKey, restoreIconCache, storeIconCache } from '../scripts/helpers/icon-cache.mjs';

const temporary: string[] = [];

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'diffolio-icons-'));
	temporary.push(root);
	await mkdir(join(root, 'resources'));
	await writeFile(join(root, 'source.icon'), 'artwork');
	const outputs = ['resources/icon.icns', 'resources/Assets.car'];
	for (const path of outputs) {
		await writeFile(join(root, path), path);
	}
	const key = await iconCacheKey(root, ['source.icon'], { sdk: '27', arch: 'arm64' });
	return { root, outputs, key };
}

afterEach(async () => {
	await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('native icon cache', () => {
	it('restores verified outputs even when generated files have been deleted', async () => {
		const { root, key, outputs } = await fixture();
		await storeIconCache(root, key, outputs);
		await rm(join(root, 'resources'), { recursive: true });
		expect(await restoreIconCache(root, key, outputs)).toBe(true);
		for (const path of outputs) {
			expect(await readFile(join(root, path), 'utf8')).toBe(path);
		}
	});

	it('invalidates changed artwork, toolchains and required output sets', async () => {
		const { root, key, outputs } = await fixture();
		await storeIconCache(root, key, outputs);
		const upgraded = await iconCacheKey(root, ['source.icon'], { sdk: '28', arch: 'arm64' });
		expect(await restoreIconCache(root, upgraded, outputs)).toBe(false);
		await writeFile(join(root, 'source.icon'), 'new artwork');
		const changed = await iconCacheKey(root, ['source.icon'], { sdk: '27', arch: 'arm64' });
		expect(await restoreIconCache(root, changed, outputs)).toBe(false);
		expect(await restoreIconCache(root, key, [...outputs, 'resources/new.png'])).toBe(false);
	});

	it('rejects corrupt or incomplete caches without partially replacing existing outputs', async () => {
		const { root, key, outputs } = await fixture();
		await storeIconCache(root, key, outputs);
		await writeFile(join(root, outputs[0]), 'keep existing');
		const cached = join(root, '.cache/icons/files', outputs[1]);
		await writeFile(cached, 'damaged');
		expect(await restoreIconCache(root, key, outputs)).toBe(false);
		expect(await readFile(join(root, outputs[0]), 'utf8')).toBe('keep existing');
		await rm(cached);
		expect(await restoreIconCache(root, key, outputs)).toBe(false);
		expect(await readFile(join(root, outputs[0]), 'utf8')).toBe('keep existing');
	});
});
