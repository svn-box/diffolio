import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function readReleaseMetadata(root = resolve('.')) {
	const definition = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
	const { version } = definition;
	assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Release requires a stable three-part version.');
	const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
	assert.equal(lock.version, version, 'Lockfile version must match package.json.');
	assert.equal(lock.packages[''].version, version, 'Root package lock version must match package.json.');
	const notes = join(root, 'docs/releases', `${version}.md`);
	assert.ok((await lstat(notes)).isFile(), 'Release notes must be a regular file.');
	assert.ok((await readFile(notes, 'utf8')).startsWith(`# Diffolio ${version}\n`), 'Release notes heading must match the version.');
	const archives = ['dmg', 'zip'].map((extension) => `Diffolio-${version}-macOS-arm64.${extension}`);
	return { root, definition, version, tag: `v${version}`, notes, archives, directory: join(root, 'release', version, 'macos', 'arm64') };
}

export async function fileChecksum(path) {
	const hash = createHash('sha256');
	for await (const bytes of createReadStream(path)) {
		hash.update(bytes);
	}
	return hash.digest('hex');
}

export async function writeReleaseFiles(metadata, directory, revision) {
	assert.match(revision, /^[a-f\d]{40}$/, 'A committed source revision is required.');
	const files = await Promise.all(
		metadata.archives.map(async (name) => ({ name, bytes: (await lstat(join(directory, name))).size, sha256: await fileChecksum(join(directory, name)) })),
	);
	await copyFile(metadata.notes, join(directory, 'RELEASE-NOTES.md'));
	await writeFile(
		join(directory, 'release-manifest.json'),
		JSON.stringify(
			{
				version: metadata.version,
				tag: metadata.tag,
				platform: 'darwin',
				arch: 'arm64',
				bundleId: metadata.definition.build.appId,
				developerIdSigned: false,
				notarized: false,
				sourceRevision: revision,
				builtAt: new Date().toISOString(),
				files,
			},
			null,
			2,
		) + '\n',
	);
	const checksummed = [...metadata.archives, 'release-manifest.json', 'RELEASE-NOTES.md'];
	const checksums = await Promise.all(checksummed.map(async (name) => `${await fileChecksum(join(directory, name))}  ${name}`));
	await writeFile(join(directory, 'SHA256SUMS'), checksums.join('\n') + '\n');
}

export async function verifyReleaseFiles(metadata, directory = metadata.directory) {
	const checksummed = [...metadata.archives, 'release-manifest.json', 'RELEASE-NOTES.md'];
	assert.deepEqual((await readdir(directory)).sort(), [...checksummed, 'SHA256SUMS'].sort(), 'Release directory contains unexpected or missing files.');
	for (const name of [...checksummed, 'SHA256SUMS']) {
		const info = await lstat(join(directory, name));
		assert.ok(info.isFile() && info.size > 0, `Invalid release file: ${name}`);
	}
	const actual = await Promise.all(checksummed.map(async (name) => `${await fileChecksum(join(directory, name))}  ${name}`));
	const expected = (await readFile(join(directory, 'SHA256SUMS'), 'utf8')).trim().split(/\r?\n/);
	assert.deepEqual(expected.sort(), actual.sort(), 'Release SHA-256 checksums do not match.');
	const manifest = JSON.parse(await readFile(join(directory, 'release-manifest.json'), 'utf8'));
	for (const [key, value] of Object.entries({
		version: metadata.version,
		tag: metadata.tag,
		platform: 'darwin',
		arch: 'arm64',
		bundleId: metadata.definition.build.appId,
		developerIdSigned: false,
		notarized: false,
	})) {
		assert.equal(manifest[key], value, `Invalid release manifest ${key}.`);
	}
	assert.match(manifest.sourceRevision, /^[a-f\d]{40}$/);
	assert.ok(Number.isFinite(Date.parse(manifest.builtAt)), 'Invalid release timestamp.');
	const files = await Promise.all(
		metadata.archives.map(async (name) => ({ name, bytes: (await lstat(join(directory, name))).size, sha256: await fileChecksum(join(directory, name)) })),
	);
	assert.deepEqual(manifest.files, files, 'Archive metadata does not match the release files.');
	assert.equal(await readFile(join(directory, 'RELEASE-NOTES.md'), 'utf8'), await readFile(metadata.notes, 'utf8'), 'Release notes differ from the source version.');
	return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const metadata = await readReleaseMetadata();
	console.log(`Release metadata ready: ${metadata.tag}, macOS arm64; notes: ${metadata.notes}`);
}
