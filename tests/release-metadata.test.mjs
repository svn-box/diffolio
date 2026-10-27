import { afterEach, describe, expect, it } from 'vitest';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileChecksum, previewMode, readReleaseMetadata, verifyReleaseFiles } from '../scripts/release-metadata.mjs';
import { releaseFixture as fixture, cleanupReleaseFixtures } from './helpers/release.mjs';

afterEach(cleanupReleaseFixtures);

describe('release metadata and integrity', () => {
	it('separates signed output from unsigned previews and refuses unsigned tags', async () => {
		const metadata = await fixture();
		const signed = await readReleaseMetadata(metadata.root);
		expect(signed.directory).toBe(join(metadata.root, 'release/0.1.0/macos/arm64'));
		expect(metadata.directory).toBe(join(metadata.root, 'release/preview/0.1.0/macos/arm64'));
		expect(previewMode([], {})).toBe(false);
		expect(previewMode(['--unsigned'], {})).toBe(true);
		expect(() => previewMode(['--unsigned'], { GITHUB_REF_TYPE: 'tag' })).toThrow('cannot');
		expect(() => previewMode(['--unexpected'], {})).toThrow('Only');
		await expect(readReleaseMetadata(metadata.root, { tag: 'v0.2.0' })).rejects.toThrow('tag must match');
		await expect(verifyReleaseFiles({ ...metadata, unsigned: false })).rejects.toThrow('developerIdSigned');
	});

	it('records the verified signing team for the signed release mode', async () => {
		const metadata = await fixture({ unsigned: false });
		expect(await verifyReleaseFiles(metadata)).toMatchObject({ developerIdSigned: true, notarized: true, teamId: 'DUMMY00000' });
	});

	it('records matching artifacts and their committed source without claiming signing', async () => {
		const metadata = await fixture();
		const manifest = await verifyReleaseFiles(metadata);
		expect(manifest).toMatchObject({
			version: '0.1.0',
			tag: 'v0.1.0',
			platform: 'darwin',
			arch: 'arm64',
			developerIdSigned: false,
			notarized: false,
			sourceRevision: 'a'.repeat(40),
		});
		expect(manifest.files).toHaveLength(2);
		expect(manifest.files[0].sha256).toBe(await fileChecksum(join(metadata.directory, metadata.archives[0])));
	});

	it('rejects package/lock version disagreement and prerelease versions', async () => {
		const metadata = await fixture();
		await writeFile(join(metadata.root, 'package-lock.json'), JSON.stringify({ version: '0.2.0', packages: { '': { version: '0.1.0' } } }));
		await expect(readReleaseMetadata(metadata.root)).rejects.toThrow('Lockfile version');
		await writeFile(join(metadata.root, 'package.json'), JSON.stringify({ version: '0.1.0-beta.1' }));
		await expect(readReleaseMetadata(metadata.root)).rejects.toThrow('stable three-part');
	});

	it('rejects notes for a different version', async () => {
		const metadata = await fixture();
		await writeFile(metadata.notes, '# Diffolio 0.2.0\n');
		await expect(readReleaseMetadata(metadata.root)).rejects.toThrow('heading must match');
	});

	it('publishes a SHA-512 feed for the final ZIP and rejects a rewritten download target', async () => {
		const metadata = await fixture();
		const path = join(metadata.directory, 'latest-mac.yml');
		const update = JSON.parse(await readFile(path, 'utf8'));
		expect(update).toMatchObject({
			version: metadata.version,
			path: metadata.archives[1],
			sha512: await fileChecksum(join(metadata.directory, metadata.archives[1]), 'sha512'),
		});
		update.files[0].url = 'https://example.invalid/replacement.zip';
		await writeFile(path, JSON.stringify(update));
		const checksumsPath = join(metadata.directory, 'SHA256SUMS');
		await writeFile(checksumsPath, (await readFile(checksumsPath, 'utf8')).replace(/^[a-f\d]+  latest-mac\.yml$/m, `${await fileChecksum(path)}  latest-mac.yml`));
		await expect(verifyReleaseFiles(metadata)).rejects.toThrow('Update manifest');
	});

	it('rejects modified archives, missing files and unexpected output', async () => {
		const metadata = await fixture();
		const archive = join(metadata.directory, metadata.archives[0]);
		const original = await readFile(archive);
		await writeFile(archive, 'changed');
		await expect(verifyReleaseFiles(metadata)).rejects.toThrow('SHA-256');
		await writeFile(archive, original);
		await writeFile(join(metadata.directory, 'unexpected.log'), 'extra');
		await expect(verifyReleaseFiles(metadata)).rejects.toThrow('unexpected or missing');
		await rm(join(metadata.directory, 'unexpected.log'));
		await rm(archive);
		await expect(verifyReleaseFiles(metadata)).rejects.toThrow('unexpected or missing');
	});

	it('rejects a changed manifest even when its checksum has been regenerated', async () => {
		const metadata = await fixture();
		const path = join(metadata.directory, 'release-manifest.json');
		const manifest = JSON.parse(await readFile(path, 'utf8'));
		manifest.version = '0.2.0';
		await writeFile(path, JSON.stringify(manifest));
		const checksumsPath = join(metadata.directory, 'SHA256SUMS');
		const checksum = await fileChecksum(path);
		const checksums = (await readFile(checksumsPath, 'utf8')).replace(/^[a-f\d]+  release-manifest\.json$/m, `${checksum}  release-manifest.json`);
		await writeFile(checksumsPath, checksums);
		await expect(verifyReleaseFiles(metadata)).rejects.toThrow('Invalid release manifest version');
	});
});
