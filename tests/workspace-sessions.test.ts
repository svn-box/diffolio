import { describe, expect, it } from 'vitest';
import { isDirty, sessionView } from '@/state/session';
import { deferred, editingWorkspace, source, workspace } from './helpers/workspace';

describe('comparison sessions', () => {
	it('reuses only empty sessions and retains the file draft across entry modes', async () => {
		const { actions, store, current } = workspace();
		const id = current().id;
		expect(actions.addSession('folders')).toBe(id);
		actions.setEntryKind('files');
		const file = source();
		await actions.acceptOpen({ files: [file] }, 'b');
		actions.setEntryKind('folders');
		expect(sessionView(current()).previewing).toBe(false);
		actions.setEntryKind('files');
		expect(current().b).toBe(file);
		expect(actions.addSession()).not.toBe(id);
		expect(store.getState().sessions).toHaveLength(2);
		actions.showHome();
		actions.continueSession();
		expect(store.getState().activeId).toBe(id);
	});

	it('fills a B-first pair and preserves it when an incompatible replacement fails', async () => {
		const { actions, current } = workspace();
		const b = source('b.txt', '');
		await actions.acceptOpen({ files: [b] }, 'b');
		await actions.acceptOpen({ files: [source('a.txt')] });
		expect(sessionView(current()).paired).toBe(true);
		expect(current().content).toBe('');
		const before = current();
		await expect(actions.acceptOpen({ files: [{ ...source(), kind: 'image' }] }, 'a')).rejects.toThrow('相同类型');
		expect(current()).toBe(before);
	});

	it('keeps per-session statistics and rejects callbacks from replaced documents', async () => {
		const { actions, current } = workspace();
		await actions.acceptOpen({ files: [source(), source()] });
		const original = current();
		const stats = { total: 2, added: 1, deleted: 0, modified: 1, current: 2, canUndo: false, canRedo: false };
		actions.updateStats(original.id, original.documentId, stats);
		actions.addSession();
		actions.activateSession(original.id);
		expect(current().stats).toEqual(stats);
		actions.swapSources();
		expect(current().id).toBe(original.id);
		expect(current().documentId).not.toBe(original.documentId);
		actions.updateStats(original.id, original.documentId, stats);
		actions.changeContent(original.id, original.documentId, 'stale');
		expect(current().stats.total).toBe(0);
		expect(current().content).not.toBe('stale');
	});

	it('cancels a dirty close, then discards and returns to a valid empty home', async () => {
		const { actions, api, store, current } = await editingWorkspace();
		const id = current().id;
		await actions.closeSession(id);
		expect(current().id).toBe(id);
		expect(isDirty(current())).toBe(true);
		api.confirmUnsaved.mockResolvedValue('discard');
		await actions.closeSession(id);
		expect(current().id).not.toBe(id);
		expect(store.getState().home).toBe(true);
		expect(store.getState().sessions).toHaveLength(1);
	});

	it('does not mark newer edits as saved when an earlier save finishes', async () => {
		const { actions, api, current } = await editingWorkspace();
		const task = deferred<{ path: string } | null>();
		api.save.mockReturnValue(task.promise);
		const saving = actions.saveSession(current().id);
		actions.changeContent(current().id, current().documentId, 'newer draft');
		task.resolve({ path: '/tmp/result.ts' });
		expect(await saving).toBe(true);
		expect(current().savedContent).toBe('draft\n');
		expect(current().content).toBe('newer draft');
		expect(isDirty(current())).toBe(true);
	});

	it('keeps a session open if a save is canceled or edits change during confirmation', async () => {
		const { actions, api, current } = await editingWorkspace();
		const id = current().id;
		api.confirmUnsaved.mockResolvedValue('save');
		api.save.mockResolvedValue(null);
		await actions.closeSession(id);
		expect(current().id).toBe(id);
		const confirmation = deferred<'save' | 'discard' | 'cancel'>();
		api.confirmUnsaved.mockReturnValue(confirmation.promise);
		const closing = actions.closeSession(id);
		actions.changeContent(id, current().documentId, 'newer draft');
		confirmation.resolve('discard');
		await closing;
		expect(current().content).toBe('newer draft');
	});

	it('does not resurrect closed sessions when their pending saves finish', async () => {
		const { actions, api, store, current } = await editingWorkspace();
		const task = deferred<{ path: string } | null>();
		api.save.mockReturnValue(task.promise);
		const saving = actions.saveSession(current().id);
		api.confirmUnsaved.mockResolvedValue('discard');
		await actions.closeSession(current().id);
		task.resolve({ path: '/tmp/result.ts' });
		await saving;
		expect(store.getState().sessions).toHaveLength(1);
		expect(current().a).toBeUndefined();
		expect(store.getState().notice).toBe('');
	});

	it('saves all dirty sessions before closing the window and reports dialog errors', async () => {
		const { actions, api, store, current } = await editingWorkspace();
		actions.addSession();
		await actions.acceptOpen({ files: [source(), source()] });
		actions.startEditing();
		actions.changeContent(current().id, current().documentId, 'second draft');
		api.confirmUnsaved.mockResolvedValue('save');
		await actions.closeWindow();
		expect(api.save).toHaveBeenCalledTimes(2);
		expect(api.close).toHaveBeenCalledOnce();
		expect(store.getState().sessions.some(isDirty)).toBe(false);
		actions.changeContent(current().id, current().documentId, 'another draft');
		api.confirmUnsaved.mockRejectedValue(new Error('dialog failed'));
		await actions.closeWindow();
		expect(store.getState().error).toBe('dialog failed');
		expect(api.close).toHaveBeenCalledOnce();
	});
});
