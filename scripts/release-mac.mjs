import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { Arch, build, Platform } from 'electron-builder';
import { readReleaseMetadata, verifyReleaseFiles, writeReleaseFiles } from './release-metadata.mjs';

const exec = promisify(execFile);
assert.equal(process.platform, 'darwin', 'Installers must be built on macOS.');
assert.equal(process.arch, 'arm64', 'This release targets Apple Silicon.');
assert.deepEqual(process.argv.slice(2), ['--unsigned'], 'Use the explicit --unsigned option for this local release candidate.');
const metadata = await readReleaseMetadata();
assert.equal((await exec('git', ['status', '--porcelain'])).stdout.trim(), '', 'Commit source changes before creating release artifacts.');
const revision = (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim();
await mkdir(resolve('.cache'), { recursive: true });
const temporary = await mkdtemp(resolve('.cache/release-'));
const candidate = join(temporary, 'candidate');
const previous = join(temporary, 'previous');
let replaced = false;

try {
	await build({
		targets: Platform.MAC.createTarget(['dmg', 'zip'], Arch.arm64),
		publish: 'never',
		config: {
			...metadata.definition.build,
			buildVersion: metadata.version,
			artifactName: `Diffolio-${metadata.version}-macOS-\${arch}.\${ext}`,
			publish: null,
			directories: { ...metadata.definition.build.directories, output: join(temporary, 'builder') },
			mac: { ...metadata.definition.build.mac, identity: null, notarize: false },
			dmg: { title: `Diffolio ${metadata.version}`, icon: 'resources/icon.icns', backgroundColor: '#faf9f7', sign: false, writeUpdateInfo: false },
		},
	});
	await mkdir(candidate);
	for (const name of metadata.archives) {
		await copyFile(join(temporary, 'builder', name), join(candidate, name));
	}
	await writeReleaseFiles(metadata, candidate, revision);
	await verifyReleaseFiles(metadata, candidate);
	await exec('/usr/bin/hdiutil', ['verify', join(candidate, metadata.archives[0])]);
	await exec('/usr/bin/unzip', ['-t', '-qq', join(candidate, metadata.archives[1])]);
	await mkdir(resolve(metadata.directory, '..'), { recursive: true });
	try {
		await rename(metadata.directory, previous);
		replaced = true;
	} catch (reason) {
		if (reason.code !== 'ENOENT') {
			throw reason;
		}
	}
	try {
		await rename(candidate, metadata.directory);
		replaced = false;
	} catch (reason) {
		if (replaced) {
			await rename(previous, metadata.directory);
			replaced = false;
		}
		throw reason;
	}
	console.log(`Local ${metadata.tag} installers ready: ${metadata.directory}`);
	console.log('Developer ID signing and Apple notarization are not configured for this candidate.');
} finally {
	// Preserve the previous candidate if restoring it failed.
	if (!replaced) {
		await rm(temporary, { recursive: true, force: true });
	} else {
		await rm(join(temporary, 'builder'), { recursive: true, force: true });
	}
}
