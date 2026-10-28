import { describe, expect, it } from 'vitest';
import { isDirty, isSideDirty } from '@/state/session';
import { deferred, source, workspace } from './helpers/workspace';

async function dualDrafts() {
	const result = workspace();
	await result.actions.acceptOpen({ files: [source('a.ts', 'A\n'), source('b.ts', 'B\n')] });
	for (const side of ['a', 'b'] as const) {
		result.actions.startEditing(side);
		result.actions.changeContent(result.current().id, result.current().documentId, `${side} draft\n`, side);
	}
	return result;
}

describe('independent A/B drafts', () => {
	it('preserves immutable sources and saves only the requested side', async () => {
		const { actions, api, current } = await dualDrafts();
		expect(current().a!.content).toBe('A\n');
		expect(current().b!.content).toBe('B\n');
		await actions.saveSession(current().id, 'a');
		expect(api.save).toHaveBeenCalledExactlyOnceWith('a draft\n', current().a);
		expect(isSideDirty(current(), 'a')).toBe(false);
		expect(isSideDirty(current(), 'b')).toBe(true);
		expect(isDirty(current())).toBe(true);
	});

	it('saves both dirty sides before allowing close and stops on cancellation', async () => {
		const { actions, api, current } = await dualDrafts();
		api.confirmUnsaved.mockResolvedValue('save');
		api.save.mockResolvedValueOnce({ path: '/tmp/a-result.ts' }).mockResolvedValueOnce(null);
		await actions.closeWindow();
		expect(api.close).not.toHaveBeenCalled();
		expect(isSideDirty(current(), 'a')).toBe(false);
		expect(isSideDirty(current(), 'b')).toBe(true);
		api.save.mockResolvedValue({ path: '/tmp/b-result.ts' });
		await actions.closeWindow();
		expect(api.close).toHaveBeenCalledOnce();
		expect(isDirty(current())).toBe(false);
	});

	it('keeps edits made to either side while a save dialog is pending', async () => {
		const { actions, api, current } = await dualDrafts();
		const pending = deferred<{ path: string } | null>();
		api.save.mockReturnValue(pending.promise);
		const saving = actions.saveSession(current().id, 'a');
		actions.changeContent(current().id, current().documentId, 'new A', 'a');
		actions.changeContent(current().id, current().documentId, 'new B', 'b');
		pending.resolve({ path: '/tmp/a-result.ts' });
		await saving;
		expect(current().drafts.a.savedContent).toBe('a draft\n');
		expect(current().drafts.a.content).toBe('new A');
		expect(current().drafts.b.content).toBe('new B');
		expect(isSideDirty(current(), 'a')).toBe(true);
		expect(isSideDirty(current(), 'b')).toBe(true);
	});

	it('does not open the second save dialog after the session has been discarded', async () => {
		const { actions, api, current } = await dualDrafts();
		const pending = deferred<{ path: string } | null>();
		api.save.mockReturnValueOnce(pending.promise);
		const saving = actions.saveSession(current().id);
		api.confirmUnsaved.mockResolvedValue('discard');
		await actions.closeSession(current().id);
		pending.resolve({ path: '/tmp/a-result.ts' });
		expect(await saving).toBe(false);
		expect(api.save).toHaveBeenCalledOnce();
	});
});
