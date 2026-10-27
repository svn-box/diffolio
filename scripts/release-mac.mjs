import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rename, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Arch, build, Platform } from 'electron-builder';
import { previewMode, readReleaseMetadata, verifyReleaseFiles, writeReleaseFiles } from './release-metadata.mjs';
import { builderIdentity, notarize, prepareSigning, releaseCommand, runBuild, verifySignedDmg } from './release-signing.mjs';
import { verifyApp } from './release-app.mjs';

assert.equal(process.platform, 'darwin', 'Installers must be built on macOS.');
assert.equal(process.arch, 'arm64', 'This release targets Apple Silicon.');
const unsigned = previewMode(process.argv.slice(2));
const metadata = await readReleaseMetadata(resolve('.'), { unsigned, tag: process.env.GITHUB_REF_TYPE === 'tag' ? (process.env.GITHUB_REF_NAME ?? '') : undefined });
assert.equal((await releaseCommand('git', ['status', '--porcelain'])).stdout.trim(), '', 'Commit source changes before creating release artifacts.');
const revision = (await releaseCommand('git', ['rev-parse', 'HEAD'])).stdout.trim();
await runBuild(['scripts/third-party-notices.mjs', '--check']);
const signing = unsigned ? undefined : await prepareSigning();
await runBuild(['scripts/build-icons.mjs']);
await runBuild(['node_modules/typescript/bin/tsc', '--noEmit']);
await runBuild(['node_modules/electron-vite/bin/electron-vite.js', 'build']);
await mkdir(resolve('.cache'), { recursive: true });
const temporary = await mkdtemp(resolve('.cache/release-'));
const candidate = join(temporary, 'candidate');
const previous = join(temporary, 'previous');
let replaced = false;

try {
	try {
		await build({
			targets: Platform.MAC.createTarget(['dir'], Arch.arm64),
			publish: 'never',
			config: {
				...metadata.definition.build,
				buildVersion: metadata.version,
				forceCodeSigning: !unsigned,
				publish: null,
				directories: { ...metadata.definition.build.directories, output: join(temporary, 'builder') },
				mac: {
					...metadata.definition.build.mac,
					identity: builderIdentity(signing?.identity),
					notarize: false,
					hardenedRuntime: true,
					preAutoEntitlements: false,
					entitlements: 'resources/entitlements.mac.plist',
					entitlementsInherit: 'resources/entitlements.mac.plist',
				},
			},
		});
	} catch {
		throw new Error('Application packaging or signing failed; no unsigned fallback is permitted.');
	}
	const app = join(temporary, 'builder/mac-arm64/Diffolio.app');
	if (signing) {
		const submission = join(temporary, 'notarize.zip');
		await releaseCommand('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, submission]);
		await notarize(submission, signing.keychain, app);
	}
	await verifyApp(app, metadata, signing?.teamId);
	await mkdir(candidate);
	const [dmgName, zipName] = metadata.archives;
	await releaseCommand('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, join(candidate, zipName)]);
	const imageSource = join(temporary, 'image-source');
	await mkdir(imageSource);
	await releaseCommand('/usr/bin/ditto', [app, join(imageSource, 'Diffolio.app')]);
	await symlink('/Applications', join(imageSource, 'Applications'));
	const dmg = join(candidate, dmgName);
	await releaseCommand('/usr/bin/hdiutil', ['create', '-volname', `Diffolio ${metadata.version}`, '-srcfolder', imageSource, '-format', 'UDZO', dmg]);
	if (signing) {
		await releaseCommand('/usr/bin/codesign', ['--sign', signing.identity, '--keychain', signing.keychain, '--timestamp', dmg]);
		await notarize(dmg, signing.keychain);
		await verifySignedDmg(dmg, signing.teamId);
	}
	await writeReleaseFiles(metadata, candidate, revision, signing?.teamId);
	await verifyReleaseFiles(metadata, candidate);
	await releaseCommand('/usr/bin/hdiutil', ['verify', dmg]);
	await releaseCommand('/usr/bin/unzip', ['-t', '-qq', join(candidate, zipName)]);
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
	console.log(`${unsigned ? 'Unsigned preview' : 'Signed and notarized'} ${metadata.tag} installers ready: ${metadata.directory}`);
} finally {
	if (!replaced) {
		await rm(temporary, { recursive: true, force: true });
	} else {
		await rm(join(temporary, 'builder'), { recursive: true, force: true });
	}
}
