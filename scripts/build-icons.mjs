import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'resources');
const concept = join(resources, 'icon-concepts/frosted-diff');
const document = join(concept, 'Diffolio.icon');
const foreground = join(document, 'Assets/comparison.png');
const composition = JSON.parse(await readFile(join(document, 'icon.json'), 'utf8'));
const layers = composition.groups.flatMap((group) => group.layers);
if (!composition.fill || layers.length !== 1 || layers[0]['image-name'] !== 'comparison.png') {
	throw new Error('frosted-diff 图标应由一层透明双文稿前景与原生底板组成。');
}
const sourceHash = createHash('sha256')
	.update(await readFile(foreground))
	.digest('hex');
const result = await exec(process.execPath, [join(concept, 'build-icon.mjs')], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
process.stdout.write(result.stdout);
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
console.log('Diffolio 图标已就绪：frosted-diff 原生底板与透明前景，保留原始比例。');
