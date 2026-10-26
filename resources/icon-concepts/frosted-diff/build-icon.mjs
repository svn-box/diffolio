import { execFile } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = dirname(fileURLToPath(import.meta.url));
const document = join(root, 'Diffolio.icon');
const developer = (await exec('/usr/bin/xcode-select', ['-p'])).stdout.trim();
const ictool = resolve(developer, '../Applications/Icon Composer.app/Contents/Executables/ictool');

for (const [name, rendition] of [
	['icon', 'Default'],
	['dark', 'Dark'],
	['tinted', 'TintedDark'],
]) {
	await exec(ictool, [
		document,
		'--export-image',
		'--output-file',
		join(root, `${name}.png`),
		'--platform',
		'macOS',
		'--rendition',
		rendition,
		'--width',
		'1024',
		'--height',
		'1024',
		'--scale',
		'1',
		'--design-generation',
		'27',
		...(name === 'tinted' ? ['--tint-color', '0.60', '--tint-strength', '0.60'] : []),
	]);
}
await exec('/usr/bin/sips', ['-z', '256', '256', join(root, 'icon.png'), '--out', join(root, 'preview.png')]);
await exec('/usr/bin/sips', ['-z', '64', '64', join(root, 'icon.png'), '--out', join(root, 'icon-64.png')]);
const temporary = await mkdtemp(join(tmpdir(), 'diffolio-icon-'));
try {
	const input = join(temporary, 'Icon.icon');
	const output = join(temporary, 'compiled');
	await cp(document, input, { recursive: true });
	await mkdir(output);
	await exec(
		'/usr/bin/xcrun',
		[
			'actool',
			input,
			'--compile',
			output,
			'--output-format',
			'human-readable-text',
			'--notices',
			'--warnings',
			'--output-partial-info-plist',
			join(output, 'icon-info.plist'),
			'--app-icon',
			'Icon',
			'--include-all-app-icons',
			'--enable-on-demand-resources',
			'NO',
			'--development-region',
			'en',
			'--target-device',
			'mac',
			'--minimum-deployment-target',
			'26.0',
			'--platform',
			'macosx',
		],
		{ maxBuffer: 4 * 1024 * 1024 },
	);
	const icon = await readFile(join(output, 'Icon.icns'));
	if (icon.toString('ascii', 0, 4) !== 'icns' || icon.readUInt32BE(4) !== icon.length) {
		throw new Error('Icon Composer did not produce a valid ICNS.');
	}
	await copyFile(join(output, 'Icon.icns'), join(root, 'icon.icns'));
} finally {
	await rm(temporary, { recursive: true, force: true });
}
console.log(`Diffolio native icon and previews are ready: ${root}`);
