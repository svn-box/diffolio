import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { AppUpdates } from '../src/main/app-updates';
import type { AppUpdateState } from '../src/shared/app-updates';
import { deferred } from './helpers/workspace';

function fixture(disabledReason?: string) {
	const client = Object.assign(new EventEmitter(), {
		checkForUpdates: vi.fn(async () => {
			client.emit('checking-for-update');
			client.emit('update-available', { version: '0.2.0' });
			return null;
		}),
		downloadUpdate: vi.fn(async () => {
			client.emit('download-progress', { percent: 45 });
			client.emit('update-downloaded');
			return [];
		}),
		quitAndInstall: vi.fn(),
	});
	const changes: AppUpdateState[] = [];
	const blockedReason = vi.fn<() => string | undefined>(() => undefined);
	const beforeInstall = vi.fn(async () => {});
	const updates = new AppUpdates({ client, version: '0.1.0', disabledReason, blockedReason, beforeInstall, onChange: (state) => changes.push(state) });
	return { client, changes, blockedReason, beforeInstall, updates };
}

describe('consent-based application updates', () => {
	it('shares concurrent checks and downloads, requiring explicit consent at each stage', async () => {
		const { client, updates, changes } = fixture();
		expect(client.checkForUpdates).not.toHaveBeenCalled();
		await Promise.all([updates.act('check'), updates.act('check')]);
		expect(client.checkForUpdates).toHaveBeenCalledTimes(1);
		expect(client.downloadUpdate).not.toHaveBeenCalled();
		expect(updates.getState()).toMatchObject({ phase: 'available', version: '0.2.0' });
		await Promise.all([updates.act('download'), updates.act('download')]);
		expect(client.downloadUpdate).toHaveBeenCalledTimes(1);
		expect(changes).toContainEqual(expect.objectContaining({ phase: 'downloading', percent: 45 }));
		expect(updates.getState().phase).toBe('downloaded');
		expect(client.quitAndInstall).not.toHaveBeenCalled();
		await updates.act('check');
		expect(client.checkForUpdates).toHaveBeenCalledTimes(1);
	});

	it('flushes preferences before restart and checks for edits again after the flush', async () => {
		const { updates, client, blockedReason, beforeInstall } = fixture();
		await updates.act('check');
		await updates.act('download');
		const flush = deferred<void>();
		beforeInstall.mockReturnValueOnce(flush.promise);
		const installing = updates.act('install');
		await vi.waitFor(() => expect(beforeInstall).toHaveBeenCalled());
		expect(client.quitAndInstall).not.toHaveBeenCalled();
		blockedReason.mockReturnValue('请先保存未保存的比较结果。');
		flush.resolve();
		expect(await installing).toMatchObject({ phase: 'downloaded', message: '请先保存未保存的比较结果。' });
		expect(client.quitAndInstall).not.toHaveBeenCalled();
		blockedReason.mockReturnValue(undefined);
		await updates.act('install');
		expect(client.quitAndInstall).toHaveBeenCalledTimes(1);
	});

	it('keeps the downloaded update when a task blocks restart or persistence fails', async () => {
		const { updates, client, blockedReason, beforeInstall } = fixture();
		await updates.act('check');
		await updates.act('download');
		blockedReason.mockReturnValue('请等待当前任务完成。');
		expect(await updates.act('install')).toMatchObject({ phase: 'downloaded', message: '请等待当前任务完成。' });
		expect(beforeInstall).not.toHaveBeenCalled();
		blockedReason.mockReturnValue(undefined);
		beforeInstall.mockRejectedValueOnce(new Error('private disk error'));
		expect(await updates.act('install')).toMatchObject({ phase: 'downloaded', message: expect.not.stringContaining('private') });
		expect(client.quitAndInstall).not.toHaveBeenCalled();
	});

	it('handles current releases, invalid version metadata, and downgrade attempts', async () => {
		const { client, updates } = fixture();
		for (const action of ['download', 'install'] as const) {
			await updates.act(action);
		}
		expect(client.downloadUpdate).not.toHaveBeenCalled();
		expect(client.quitAndInstall).not.toHaveBeenCalled();
		for (const version of ['0.1.0', '0.0.9']) {
			client.emit('update-available', { version });
			expect(updates.getState()).toMatchObject({ phase: 'current', version: undefined });
		}
		for (const version of ['0.2.0-beta.1', '../../app', '1.0']) {
			client.emit('update-available', { version });
			expect(updates.getState().phase).toBe('error');
		}
	});

	it('recovers after check, download, checksum, and native installation failures', async () => {
		const { client, updates } = fixture();
		client.checkForUpdates.mockRejectedValueOnce(new Error('private network error'));
		expect(await updates.act('check')).toMatchObject({ phase: 'error', message: expect.not.stringContaining('private') });
		await updates.act('check');
		client.downloadUpdate.mockRejectedValueOnce(new Error('checksum mismatch'));
		expect((await updates.act('download')).phase).toBe('error');
		await updates.act('download');
		await updates.act('install');
		client.emit('error', new Error('native signature validation failed'));
		expect(updates.getState()).toMatchObject({ phase: 'downloaded', version: '0.2.0' });
	});

	it('never checks, downloads, or installs in disabled development mode', async () => {
		const { updates, client } = fixture('开发模式');
		for (const action of ['status', 'check', 'download', 'install'] as const) {
			expect((await updates.act(action)).phase).toBe('disabled');
		}
		client.emit('update-available', { version: '0.2.0' });
		expect(updates.getState().phase).toBe('disabled');
		expect(client.checkForUpdates).not.toHaveBeenCalled();
		expect(client.downloadUpdate).not.toHaveBeenCalled();
		expect(client.quitAndInstall).not.toHaveBeenCalled();
	});
});
