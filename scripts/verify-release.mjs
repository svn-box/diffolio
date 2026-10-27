import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readlink, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileChecksum, previewMode, readReleaseMetadata, verifyReleaseFiles } from './release-metadata.mjs';
import { verifyApp } from './release-app.mjs';
import { buildEnvironment, verifySignedDmg } from './release-signing.mjs';

const exec = promisify(execFile);
const unsigned = previewMode(process.argv.slice(2));
const metadata = await readReleaseMetadata(resolve('.'), { unsigned });
const manifest = await verifyReleaseFiles(metadata);
assert.equal(manifest.sourceRevision, (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim(), 'Check out the source revision recorded in the release manifest.');
if (!unsigned) {
	assert.equal(manifest.teamId, process.env.APPLE_TEAM_ID, 'Installer team must match the configured Apple team.');
	await verifySignedDmg(join(metadata.directory, metadata.archives[0]), manifest.teamId);
}
await exec('/usr/bin/hdiutil', ['verify', join(metadata.directory, metadata.archives[0])]);
await exec('/usr/bin/unzip', ['-t', '-qq', join(metadata.directory, metadata.archives[1])]);
await mkdir(resolve('.cache'), { recursive: true });
const temporary = await mkdtemp(resolve('.cache/release-verify-'));
const extraction = join(temporary, 'extracted');
const mount = join(temporary, 'mounted');
let mounted = false;

try {
	await mkdir(extraction);
	await exec('/usr/bin/ditto', ['-x', '-k', join(metadata.directory, metadata.archives[1]), extraction]);
	const app = join(extraction, 'Diffolio.app');
	await verifyApp(app, metadata, manifest.teamId);
	await mkdir(mount);
	await exec('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, join(metadata.directory, metadata.archives[0])]);
	mounted = true;
	const diskApp = join(mount, 'Diffolio.app');
	await verifyApp(diskApp, metadata, manifest.teamId);
	assert.equal(await readlink(join(mount, 'Applications')), '/Applications', 'DMG must include the Applications shortcut.');
	for (const relative of ['Contents/Info.plist', 'Contents/MacOS/Diffolio', 'Contents/Resources/app.asar', 'Contents/Resources/Assets.car', 'Contents/Resources/icon.icns']) {
		assert.equal(await fileChecksum(join(app, relative)), await fileChecksum(join(diskApp, relative)), `DMG and ZIP differ: ${relative}`);
	}
	for (const script of ['scripts/smoke-packaged.mjs', 'scripts/updates-e2e.mjs']) {
		await new Promise((done, reject) => {
			const child = spawn(process.execPath, [script], { env: { ...buildEnvironment(), DIFFOLIO_PACKAGED_APP: app }, stdio: 'inherit' });
			child.once('error', reject);
			child.once('close', (code) => (code === 0 ? done() : reject(new Error(`Extracted installer check failed: ${script}`))));
		});
	}
	console.log('PASS: release checksums, version/architecture/icons, mounted DMG, extracted ZIP, matching app content and real installer startup.');
} finally {
	if (mounted) {
		await exec('/usr/bin/hdiutil', ['detach', mount]);
	}
	await rm(temporary, { recursive: true, force: true });
}
