import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readlink, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileChecksum, readReleaseMetadata, verifyReleaseFiles } from './release-metadata.mjs';

const exec = promisify(execFile);
const metadata = await readReleaseMetadata();
const manifest = await verifyReleaseFiles(metadata);
assert.equal(manifest.sourceRevision, (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim(), 'Check out the source revision recorded in the release manifest.');
await exec('/usr/bin/hdiutil', ['verify', join(metadata.directory, metadata.archives[0])]);
await exec('/usr/bin/unzip', ['-t', '-qq', join(metadata.directory, metadata.archives[1])]);
await mkdir(resolve('.cache'), { recursive: true });
const temporary = await mkdtemp(resolve('.cache/release-verify-'));
const extraction = join(temporary, 'extracted');
const mount = join(temporary, 'mounted');
let mounted = false;

async function verifyApp(path) {
	const plist = join(path, 'Contents/Info.plist');
	for (const [key, value] of Object.entries({
		CFBundleIdentifier: metadata.definition.build.appId,
		CFBundleShortVersionString: metadata.version,
		CFBundleVersion: metadata.version,
	})) {
		assert.equal((await exec('/usr/libexec/PlistBuddy', ['-c', `Print ${key}`, plist])).stdout.trim(), value, `Unexpected ${key}.`);
	}
	assert.equal((await exec('/usr/bin/lipo', ['-archs', join(path, 'Contents/MacOS/Diffolio')])).stdout.trim(), 'arm64');
	const icon = await readFile(join(path, 'Contents/Resources/icon.icns'));
	assert.equal(icon.toString('ascii', 0, 4), 'icns');
	assert.equal(icon.readUInt32BE(4), icon.length);
	assert.ok((await readFile(join(path, 'Contents/Resources/Assets.car'))).length > 0, 'Native icon catalog is missing.');
}

try {
	await mkdir(extraction);
	await exec('/usr/bin/ditto', ['-x', '-k', join(metadata.directory, metadata.archives[1]), extraction]);
	const app = join(extraction, 'Diffolio.app');
	await verifyApp(app);
	await mkdir(mount);
	await exec('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, join(metadata.directory, metadata.archives[0])]);
	mounted = true;
	const diskApp = join(mount, 'Diffolio.app');
	await verifyApp(diskApp);
	assert.equal(await readlink(join(mount, 'Applications')), '/Applications', 'DMG must include the Applications shortcut.');
	for (const relative of ['Contents/Info.plist', 'Contents/MacOS/Diffolio', 'Contents/Resources/app.asar', 'Contents/Resources/Assets.car', 'Contents/Resources/icon.icns']) {
		assert.equal(await fileChecksum(join(app, relative)), await fileChecksum(join(diskApp, relative)), `DMG and ZIP differ: ${relative}`);
	}
	await new Promise((done, reject) => {
		const child = spawn(process.execPath, ['scripts/smoke-packaged.mjs'], { env: { ...process.env, DIFFOLIO_PACKAGED_APP: app }, stdio: 'inherit' });
		child.once('error', reject);
		child.once('close', (code) => (code === 0 ? done() : reject(new Error('Extracted installer smoke check failed.'))));
	});
	console.log('PASS: release checksums, version/architecture/icons, mounted DMG, extracted ZIP, matching app content and real installer startup.');
} finally {
	if (mounted) {
		await exec('/usr/bin/hdiutil', ['detach', mount]);
	}
	await rm(temporary, { recursive: true, force: true });
}
