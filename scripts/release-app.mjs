import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { releaseCommand, verifySignature } from './release-signing.mjs';

export async function verifyApp(path, metadata, teamId) {
	const plist = join(path, 'Contents/Info.plist');
	for (const [key, value] of Object.entries({
		CFBundleIdentifier: metadata.definition.build.appId,
		CFBundleShortVersionString: metadata.version,
		CFBundleVersion: metadata.version,
	})) {
		assert.equal((await releaseCommand('/usr/libexec/PlistBuddy', ['-c', `Print ${key}`, plist])).stdout.trim(), value, `Unexpected ${key}.`);
	}
	assert.equal((await releaseCommand('/usr/bin/lipo', ['-archs', join(path, 'Contents/MacOS/Diffolio')])).stdout.trim(), 'arm64');
	const icon = await readFile(join(path, 'Contents/Resources/icon.icns'));
	assert.equal(icon.toString('ascii', 0, 4), 'icns');
	assert.equal(icon.readUInt32BE(4), icon.length);
	assert.ok((await readFile(join(path, 'Contents/Resources/Assets.car'))).length > 0, 'Native icon catalog is missing.');
	if (!metadata.unsigned) {
		assert.match(teamId ?? '', /^[A-Z\d]{10}$/, 'Signed app verification requires the Apple team.');
		await verifySignature(path, teamId, true);
		await releaseCommand('/usr/bin/codesign', ['--verify', '--deep', '--strict', path]);
		await releaseCommand('/usr/bin/xcrun', ['stapler', 'validate', path]);
		await releaseCommand('/usr/sbin/spctl', ['--assess', '--verbose=2', '--type', 'execute', path]);
	}
}
