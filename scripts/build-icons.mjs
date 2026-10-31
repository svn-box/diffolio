import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { iconCacheKey, restoreIconCache, storeIconCache } from './helpers/icon-cache.mjs';

const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'resources');
const concept = join(resources, 'icon-concepts/frosted-diff');
const document = join(concept, 'Diffolio.icon');
const foreground = join(document, 'Assets/comparison.png');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--force')) {
	throw new Error('Use --force to regenerate icons.');
}

async function sourceFiles(directory) {
	const result = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		result.push(...(entry.isDirectory() ? await sourceFiles(path) : [relative(root, path)]));
	}
	return result;
}

const toolchain = await Promise.all([
	exec('/usr/bin/xcodebuild', ['-version']),
	exec('/usr/bin/xcrun', ['--sdk', 'macosx', '--show-sdk-build-version']),
	exec('/usr/bin/sw_vers', ['-buildVersion']),
]);
const pngVersion = JSON.parse(await readFile(join(root, 'node_modules/pngjs/package.json'), 'utf8')).version;
const inputs = ['scripts/build-icons.mjs', 'scripts/helpers/icon-cache.mjs', relative(root, join(concept, 'build-icon.mjs')), ...(await sourceFiles(document))];
const identity = { tools: toolchain.map((result) => result.stdout.trim()), node: process.version, pngVersion, arch: process.arch };
const key = await iconCacheKey(root, inputs, identity);
const outputs = [
	'resources/Assets.car',
	'resources/icon.icns',
	'resources/icon.png',
	'resources/icon-source.json',
	'src-tauri/icons/icon.png',
	...['icon.icns', 'icon.png', 'dark.png', 'tinted.png', 'preview.png', 'icon-64.png'].map((name) => relative(root, join(concept, name))),
];
if (!args.includes('--force') && (await restoreIconCache(root, key, outputs))) {
	console.log('Icons: cached.');
	process.exit(0);
}
const composition = JSON.parse(await readFile(join(document, 'icon.json'), 'utf8'));
const layers = composition.groups.flatMap((group) => group.layers);
if (!composition.fill || layers.length !== 1 || layers[0]['image-name'] !== 'comparison.png') {
	throw new Error('frosted-diff 图标应由一层透明双文稿前景与原生底板组成。');
}
const sourceHash = createHash('sha256')
	.update(await readFile(foreground))
	.digest('hex');
const result = await exec(process.execPath, [join(concept, 'build-icon.mjs')], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
process.stderr.write(result.stderr);
const icon = await readFile(join(concept, 'icon.icns'));
if (icon.toString('ascii', 0, 4) !== 'icns' || icon.readUInt32BE(4) !== icon.length) {
	throw new Error('Icon Composer 未生成有效的 ICNS。');
}
if (
	createHash('sha256')
		.update(await readFile(foreground))
		.digest('hex') !== sourceHash
) {
	throw new Error('构建期间图标前景发生变化，请重新构建。');
}
await copyFile(join(concept, 'icon.icns'), join(resources, 'icon.icns'));
await copyFile(join(concept, 'icon.png'), join(resources, 'icon.png'));
await mkdir(join(root, 'src-tauri/icons'), { recursive: true });
// Icon Composer exports 16-bit PNGs; Tauri's window icon decoder expects RGBA8.
await writeFile(join(root, 'src-tauri/icons/icon.png'), PNG.sync.write(PNG.sync.read(await readFile(join(resources, 'icon.png'))), { bitDepth: 8 }));
await writeFile(
	join(resources, 'icon-source.json'),
	JSON.stringify(
		{
			document: 'resources/icon-concepts/frosted-diff/Diffolio.icon',
			foreground: 'Assets/comparison.png',
			foregroundSha256: sourceHash,
			artworkLayers: layers.length,
			nativeBackground: composition.fill,
			position: layers[0].position,
			packaging: 'Native Icon Composer asset catalog and legacy ICNS; no extra inset, background or raster frame.',
		},
		null,
		2,
	) + '\n',
);
if ((await iconCacheKey(root, inputs, identity)) !== key) {
	throw new Error('构建期间图标来源发生变化，请重新构建。');
}
await storeIconCache(root, key, outputs);
console.log('Icons: built.');
