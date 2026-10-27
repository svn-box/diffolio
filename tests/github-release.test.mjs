import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { publishRelease } from '../scripts/github-release.mjs';
import { findRelease, releaseRepository } from '../scripts/github-release-api.mjs';
import { readGitHubJson } from '../scripts/github-api.mjs';
import { fileChecksum } from '../scripts/release-metadata.mjs';
import { cleanupReleaseFixtures, releaseCommit, releaseFixture } from './helpers/release.mjs';

vi.mock('../scripts/github-api.mjs', () => ({ readGitHubJson: vi.fn() }));
const repository = 'example/diffolio';
const token = 'dummy-token';

afterEach(async () => {
	vi.mocked(readGitHubJson).mockReset();
	await cleanupReleaseFixtures();
});

async function uploadedDraft(metadata) {
	const names = [...metadata.archives, 'latest-mac.yml', 'RELEASE-NOTES.md', 'release-manifest.json', 'SHA256SUMS'];
	return {
		tag_name: metadata.tag,
		draft: true,
		prerelease: false,
		assets: await Promise.all(
			names.map(async (name) => {
				const path = join(metadata.directory, name);
				return { name, state: 'uploaded', size: (await readFile(path)).length, digest: `sha256:${await fileChecksum(path)}` };
			}),
		),
	};
}

describe('GitHub release publication', () => {
	it('verifies a draft and its exact assets before making the release public', async () => {
		const metadata = await releaseFixture({ unsigned: false });
		const draft = await uploadedDraft(metadata);
		vi.mocked(readGitHubJson)
			.mockResolvedValueOnce({ sha: releaseCommit })
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([draft])
			.mockResolvedValueOnce({ sha: releaseCommit });
		const run = vi.fn().mockResolvedValue(undefined);
		await publishRelease(metadata, releaseCommit, repository, token, run);
		expect(run).toHaveBeenCalledTimes(2);
		expect(run.mock.calls[0][0]).toEqual(expect.arrayContaining(['create', 'v0.1.0', '--draft', '--verify-tag', '--repo', repository]));
		expect(
			run.mock.calls[0][0]
				.slice(-draft.assets.length)
				.map((path) => basename(path))
				.sort(),
		).toEqual(draft.assets.map((asset) => asset.name).sort());
		expect(run.mock.calls[1][0]).toEqual(['release', 'edit', 'v0.1.0', '--repo', repository, '--draft=false', '--latest']);
	});

	it('never uploads unsigned previews or artifacts from another commit', async () => {
		const preview = await releaseFixture();
		const run = vi.fn();
		await expect(publishRelease(preview, releaseCommit, repository, token, run)).rejects.toThrow('Unsigned previews');
		const signed = await releaseFixture({ unsigned: false });
		await expect(publishRelease(signed, 'b'.repeat(40), repository, token, run)).rejects.toThrow('source commit');
		expect(run).not.toHaveBeenCalled();
	});

	it('does not overwrite an existing release or draft', async () => {
		const metadata = await releaseFixture({ unsigned: false });
		vi.mocked(readGitHubJson)
			.mockResolvedValueOnce({ sha: releaseCommit })
			.mockResolvedValueOnce([{ tag_name: metadata.tag, draft: true }]);
		const run = vi.fn();
		await expect(publishRelease(metadata, releaseCommit, repository, token, run)).rejects.toThrow('will not be overwritten');
		expect(run).not.toHaveBeenCalled();
	});

	it('keeps the upload as a draft if the server digest or final tag is wrong', async () => {
		for (const failure of ['digest', 'tag']) {
			const metadata = await releaseFixture({ unsigned: false });
			const draft = await uploadedDraft(metadata);
			if (failure === 'digest') {
				draft.assets[0].digest = 'sha256:wrong';
			}
			vi.mocked(readGitHubJson).mockResolvedValueOnce({ sha: releaseCommit }).mockResolvedValueOnce([]).mockResolvedValueOnce([draft]);
			if (failure === 'tag') {
				vi.mocked(readGitHubJson).mockResolvedValueOnce({ sha: 'b'.repeat(40) });
			}
			const run = vi.fn().mockResolvedValue(undefined);
			await expect(publishRelease(metadata, releaseCommit, repository, token, run)).rejects.toThrow();
			expect(run).toHaveBeenCalledOnce();
			vi.mocked(readGitHubJson).mockReset();
		}
	});

	it('paginates authenticated releases and requires an explicit repository context', async () => {
		vi.mocked(readGitHubJson)
			.mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => ({ tag_name: `old-${i}` })))
			.mockResolvedValueOnce([{ tag_name: 'v0.1.0', draft: true }]);
		expect(await findRelease(repository, 'v0.1.0', token)).toMatchObject({ draft: true });
		expect(readGitHubJson).toHaveBeenLastCalledWith(`repos/${repository}/releases?per_page=100&page=2`, token);
		expect(releaseRepository({ GITHUB_REPOSITORY: repository })).toBe(repository);
		expect(() => releaseRepository({})).toThrow('GitHub repository');
	});
});
