import { describe, expect, it } from 'vitest';
import { defaultPreferences, type RecentComparison } from '../src/shared/types';
import { deferred, workspace } from './helpers/workspace';

describe('workspace catalog persistence', () => {
	it('initializes once and waits for saved settings before applying queued changes', async () => {
		const { actions, api, store } = workspace();
		const task = deferred<Awaited<ReturnType<typeof api.bootstrap>>>();
		api.bootstrap.mockReturnValue(task.promise);
		const first = actions.initialize();
		const second = actions.initialize();
		const update = actions.setPreference({ fontSize: 18 });
		expect(api.bootstrap).toHaveBeenCalledOnce();
		task.resolve({ preferences: { ...defaultPreferences, appearance: 'dark' }, recents: [] });
		await Promise.all([first, second, update]);
		expect(store.getState().preferences).toEqual({ ...defaultPreferences, appearance: 'dark', fontSize: 18 });
		expect(api.preferences).toHaveBeenCalledWith({ fontSize: 18 });
	});

	it('serializes preference changes and recovers after a failed write', async () => {
		const { actions, api, store } = workspace();
		await actions.initialize();
		const task = deferred<void>();
		api.preferences.mockReturnValueOnce(task.promise);
		const appearance = actions.setPreference({ appearance: 'dark' });
		const size = actions.setPreference({ fontSize: 16 });
		await Promise.resolve();
		await Promise.resolve();
		expect(api.preferences).toHaveBeenCalledTimes(1);
		task.resolve();
		await Promise.all([appearance, size]);
		expect(store.getState().preferences).toEqual({ ...defaultPreferences, appearance: 'dark', fontSize: 16 });
		api.preferences.mockRejectedValueOnce(new Error('disk full'));
		await actions.setPreference({ wrap: true });
		expect(store.getState().preferences.wrap).toBe(false);
		expect(store.getState().error).toBe('disk full');
		await actions.setPreference({ collapse: true });
		expect(store.getState().preferences.collapse).toBe(true);
	});

	it('does not restore stale recent records after a queued clear', async () => {
		const { actions, api, store } = workspace();
		await actions.initialize();
		const task = deferred<RecentComparison[]>();
		api.remember.mockReturnValue(task.promise);
		const remember = actions.remember(['/a', '/b'], 'text');
		const clear = actions.clearRecents();
		await Promise.resolve();
		await Promise.resolve();
		expect(api.clearRecents).not.toHaveBeenCalled();
		task.resolve([{ id: 'recent', paths: ['/a', '/b'], name: 'a ↔ b', kind: 'text', openedAt: '2026-10-27' }]);
		await Promise.all([remember, clear]);
		expect(api.clearRecents).toHaveBeenCalledOnce();
		expect(store.getState().recents).toEqual([]);
	});
});
