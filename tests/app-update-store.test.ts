import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppUpdates } from '@/state/app-updates';
import type { AppUpdateState } from '../src/shared/app-updates';
import { deferred } from './helpers/workspace';

afterEach(() => {
	useAppUpdates.setState({ state: { phase: 'idle', currentVersion: '0.1.0', revision: 0 } });
	vi.unstubAllGlobals();
});

describe('update snapshot ordering', () => {
	it('does not replace a newer authoritative download snapshot with an old RPC failure', async () => {
		const response = deferred<AppUpdateState>();
		vi.stubGlobal('window', { diffolio: { update: () => response.promise } });
		const pending = useAppUpdates.getState().act('status');
		const downloading: AppUpdateState = { phase: 'downloading', currentVersion: '0.1.0', revision: 5, version: '0.2.0', percent: 42 };
		useAppUpdates.getState().accept(downloading);
		response.reject(new Error('old network failure'));
		await pending;
		expect(useAppUpdates.getState().state).toEqual(downloading);
	});

	it('ignores an older failure after a newer request has completed with the same revision', async () => {
		const response = deferred<AppUpdateState>();
		const current: AppUpdateState = { phase: 'current', currentVersion: '0.1.0', revision: 0 };
		const update = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce(current);
		vi.stubGlobal('window', { diffolio: { update } });
		const pending = useAppUpdates.getState().act('release');
		await useAppUpdates.getState().act('status');
		response.reject(new Error('old release-page error'));
		await pending;
		expect(useAppUpdates.getState().state).toEqual(current);
	});

	it('reports a current transport failure without exposing raw details', async () => {
		vi.stubGlobal('window', { diffolio: { update: () => Promise.reject(new Error('private transport details')) } });
		await useAppUpdates.getState().act('check');
		expect(useAppUpdates.getState().state).toMatchObject({ phase: 'error', message: '更新操作未完成，请重试。' });
	});
});
