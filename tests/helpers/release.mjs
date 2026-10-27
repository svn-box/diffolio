import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readReleaseMetadata, writeReleaseFiles } from '../../scripts/release-metadata.mjs';

const temporary = [];
export const releaseCommit = 'a'.repeat(40);

export async function releaseFixture({ unsigned = true } = {}) {
	const root = await mkdtemp(join(tmpdir(), 'diffolio-release-test-'));
	temporary.push(root);
	const version = '0.1.0';
	await writeFile(join(root, 'package.json'), JSON.stringify({ version, build: { appId: 'app.diffolio.desktop' } }));
	await writeFile(join(root, 'package-lock.json'), JSON.stringify({ version, packages: { '': { version } } }));
	await mkdir(join(root, 'docs/releases'), { recursive: true });
	await writeFile(join(root, 'docs/releases/0.1.0.md'), '# Diffolio 0.1.0\n\nFirst release.\n');
	const metadata = await readReleaseMetadata(root, { unsigned });
	await mkdir(metadata.directory, { recursive: true });
	for (const name of metadata.archives) {
		await writeFile(join(metadata.directory, name), `test artifact: ${name}`);
	}
	await writeReleaseFiles(metadata, metadata.directory, releaseCommit, unsigned ? undefined : 'DUMMY00000');
	return metadata;
}

export async function cleanupReleaseFixtures() {
	for (const path of temporary.splice(0)) {
		await rm(path, { recursive: true, force: true });
	}
}
