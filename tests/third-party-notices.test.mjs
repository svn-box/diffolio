import { afterEach, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const temporary = [];

afterEach(async () => {
	await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

it('checks committed notices without an Electron runtime download in a clean install', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'diffolio-license-check-'));
	temporary.push(directory);
	for (const name of ['package.json', 'package-lock.json', 'THIRD_PARTY_NOTICES.md']) {
		await cp(resolve(name), join(directory, name));
	}
	await cp(resolve('resources/licenses'), join(directory, 'resources/licenses'), { recursive: true });
	const lock = JSON.parse(await readFile(resolve('package-lock.json'), 'utf8'));
	for (const [location, metadata] of Object.entries(lock.packages)) {
		if (!location || metadata.dev || metadata.devOptional) {
			continue;
		}
		await mkdir(join(directory, location), { recursive: true });
		const files = (await readdir(resolve(location))).filter((name) => name === 'package.json' || /^(licen[sc]e|copying|notice|copyright)([.\-_]|$)/i.test(name));
		await Promise.all(files.map((name) => cp(resolve(location, name), join(directory, location, name))));
	}
	await mkdir(join(directory, 'node_modules/electron'), { recursive: true });
	for (const name of ['package.json', 'LICENSE']) {
		await cp(resolve('node_modules/electron', name), join(directory, 'node_modules/electron', name));
	}
	const result = await execute(process.execPath, [resolve('scripts/third-party-notices.mjs'), '--check'], { cwd: directory });
	expect(result.stdout).toContain('Verified notices for');
});
