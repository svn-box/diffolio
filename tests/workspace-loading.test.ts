import { describe, expect, it } from 'vitest';
import type { OpenResult } from '../src/shared/types';
import { deferred, editingWorkspace, source, workspace } from './helpers/workspace';

describe('asynchronous comparison inputs', () => {
	it.each(['clipboard-first', 'file-first'])('keeps the later file intent when a superseded paste completes %s', async (order) => {
		const { actions, api, current } = workspace();
		const clipboard = deferred<Awaited<ReturnType<typeof api.clipboard>>>();
		const file = deferred<OpenResult>();
		api.clipboard.mockReturnValue(clipboard.promise);
		api.readPaths.mockReturnValue(file.promise);
		const pasting = actions.paste('a');
		const loading = actions.load('paths', ['/newer.txt'], 'a');
		if (order === 'clipboard-first') {
			clipboard.resolve(source('older-clipboard'));
			await pasting;
			file.resolve({ files: [source('newer.txt')] });
		} else {
			file.resolve({ files: [source('newer.txt')] });
			await loading;
			clipboard.resolve(source('older-clipboard'));
		}
		await Promise.all([pasting, loading]);
		expect(current().a?.name).toBe('newer.txt');
	});

	it('invalidates an older file request when a newer clipboard intent starts', async () => {
		const { actions, api, current, store } = workspace();
		const file = deferred<OpenResult>();
		api.readPaths.mockReturnValue(file.promise);
		const loading = actions.load('paths', ['/older.txt'], 'a');
		api.clipboard.mockResolvedValue(source('newer-clipboard'));
		await actions.paste('a');
		file.resolve({ files: [source('older.txt')] });
		await loading;
		expect(current().a?.name).toBe('newer-clipboard');
		expect(store.getState().busy).toBeNull();
	});

	it('ignores late results and progress from canceled or superseded tasks', async () => {
		const { actions, api, store, current } = workspace();
		const first = deferred<OpenResult>();
		const second = deferred<OpenResult>();
		api.readPaths.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const earlier = actions.load('paths', ['/first']);
		const firstId = store.getState().busy!.id;
		const later = actions.load('paths', ['/second']);
		const secondId = store.getState().busy!.id;
		expect(api.cancel).toHaveBeenCalledWith(firstId);
		actions.updateProgress(firstId, 900);
		expect(store.getState().busy!.count).toBeUndefined();
		actions.updateProgress(secondId, 12);
		expect(store.getState().busy!.count).toBe(12);
		first.resolve({ files: [source('stale.ts')] });
		await earlier;
		expect(store.getState().busy!.id).toBe(secondId);
		actions.cancelTask();
		second.resolve({ files: [source('canceled.ts')] });
		await later;
		expect(current().a).toBeUndefined();
		expect(store.getState().busy).toBeNull();
	});

	it('retains the intended target when the user switches tabs while reading', async () => {
		const { actions, api, current, store } = workspace();
		await actions.acceptOpen({ files: [source('first.ts')] });
		const targetId = current().id;
		const otherId = actions.addSession();
		actions.activateSession(targetId);
		const task = deferred<OpenResult>();
		api.readPaths.mockReturnValue(task.promise);
		const loading = actions.load('paths', ['/second']);
		actions.activateSession(otherId);
		task.resolve({ files: [source('second.ts')] });
		await loading;
		expect(store.getState().sessions.find((session) => session.id === targetId)?.b?.name).toBe('second.ts');
		expect(store.getState().sessions.find((session) => session.id === otherId)?.a).toBeUndefined();
	});

	it('does not apply a pending read after its target has closed or been replaced', async () => {
		const { actions, api, current, store } = workspace();
		const task = deferred<OpenResult>();
		api.readPaths.mockReturnValue(task.promise);
		const loading = actions.load('paths', ['/later']);
		await actions.closeSession(current().id);
		task.resolve({ files: [source('stale.ts')] });
		await loading;
		expect(current().a).toBeUndefined();
		expect(store.getState().sessions).toHaveLength(1);
	});

	it('does not replace a dirty input when its load was canceled during the confirmation', async () => {
		const { actions, api, current } = await editingWorkspace();
		const confirmation = deferred<'save' | 'discard' | 'cancel'>();
		api.confirmUnsaved.mockReturnValue(confirmation.promise);
		api.readPaths.mockResolvedValue({ files: [source('replacement.ts')] });
		const loading = actions.load('paths', ['/replacement'], 'b');
		await Promise.resolve();
		expect(api.confirmUnsaved).toHaveBeenCalledOnce();
		actions.cancelTask();
		confirmation.resolve('discard');
		await loading;
		expect(current().drafts.b.content).toBe('draft\n');
		expect(current().b?.name).toBe('after.ts');
	});

	it('supports independent folder choices, cancellation, and a complete comparison', async () => {
		const { actions, api, current } = workspace();
		actions.addSession('folders');
		api.selectFolder.mockResolvedValueOnce('/left').mockResolvedValueOnce(null).mockResolvedValueOnce('/right');
		await actions.selectFolder('a');
		await actions.selectFolder('b');
		expect(current().folderPaths).toEqual({ a: '/left' });
		api.readPaths.mockResolvedValue({ files: [], folder: { id: 'folder', left: '/left', right: '/right', entries: [] } });
		await actions.selectFolder('b');
		expect(api.readPaths).toHaveBeenCalledWith(['/left', '/right'], expect.any(String));
		expect(current().folder?.id).toBe('folder');
	});

	it('preserves the missing side in folder drilldown and reports incompatible one-sided images', async () => {
		const { actions, api, current, store } = workspace();
		api.readPaths.mockResolvedValue({ files: [source('only.txt')] });
		await actions.openFolderEntry({ path: 'only.txt', kind: 'file', status: 'right', right: '/right/only.txt' });
		expect(current().a?.name).toBe('此侧不存在');
		expect(current().b?.name).toBe('only.txt');
		api.readPaths.mockResolvedValue({ files: [{ ...source('only.png'), kind: 'image' }] });
		await actions.openFolderEntry({ path: 'only.png', kind: 'file', status: 'left', left: '/left/only.png' });
		expect(store.getState().error).toContain('只存在于一侧');
		expect(current().b?.name).toBe('only.txt');
	});
});
