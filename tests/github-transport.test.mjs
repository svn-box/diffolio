import { afterEach, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { readGitHubJson } from '../scripts/github-api.mjs';

vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
afterEach(() => vi.mocked(execFile).mockReset());

it('passes the GitHub token through the environment and redacts CLI failures', async () => {
	const token = 'dummy-release-token';
	vi.mocked(execFile).mockImplementation((_tool, _arguments, _options, callback) => callback(new Error(`failed ${token}`), '', `request failed with ${token} (HTTP 403)`));
	await expect(readGitHubJson('repos/example/diffolio', token)).rejects.toThrow('GitHub API request failed: HTTP 403.');
	const [tool, arguments_, options] = vi.mocked(execFile).mock.calls[0];
	expect(tool).toBe('gh');
	expect(arguments_).toEqual(expect.arrayContaining(['api', '--method', 'GET']));
	expect(arguments_.join(' ')).not.toContain(token);
	expect(options.env.GH_TOKEN).toBe(token);
	expect(options.env.GH_DEBUG).toBe('');
});

it('rejects a missing token and malformed JSON without exposing raw output', async () => {
	await expect(readGitHubJson('repos/example/diffolio', '')).rejects.toThrow('Missing GitHub release token');
	expect(execFile).not.toHaveBeenCalled();
	vi.mocked(execFile).mockImplementation((_tool, _arguments, _options, callback) => callback(null, 'private invalid response', ''));
	await expect(readGitHubJson('repos/example/diffolio', 'dummy')).rejects.toThrow('GitHub API returned invalid JSON.');
});
