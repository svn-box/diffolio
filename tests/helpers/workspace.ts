import { vi } from 'vitest';
import { defaultPreferences, type DiffolioApi, type SourceFile } from '../../src/shared/types';
import { createWorkspaceStore } from '@/state/workspace-store';
import { activeSession } from '@/state/workspace-state';

export function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

export function source(name = 'input.ts', content = 'original\n'): SourceFile {
	return { id: crypto.randomUUID(), name, kind: 'text', content, bytes: new TextEncoder().encode(content).length, bom: false, lineEnding: 'LF' };
}

export function workspace() {
	const api = {
		showSettings: vi.fn<DiffolioApi['showSettings']>().mockResolvedValue(undefined),
		showUpdates: vi.fn<DiffolioApi['showUpdates']>().mockResolvedValue(undefined),
		onPreferences: vi.fn<DiffolioApi['onPreferences']>().mockReturnValue(() => {}),
		update: vi.fn<DiffolioApi['update']>().mockResolvedValue({ phase: 'idle', currentVersion: '0.1.0', revision: 0 }),
		onUpdate: vi.fn<DiffolioApi['onUpdate']>().mockReturnValue(() => {}),
		bootstrap: vi.fn<DiffolioApi['bootstrap']>().mockResolvedValue({ preferences: { ...defaultPreferences }, recents: [] }),
		open: vi.fn<DiffolioApi['open']>().mockResolvedValue(null),
		selectFolder: vi.fn<DiffolioApi['selectFolder']>().mockResolvedValue(null),
		readPaths: vi.fn<DiffolioApi['readPaths']>().mockResolvedValue({ files: [] }),
		clipboard: vi.fn<DiffolioApi['clipboard']>().mockResolvedValue(source()),
		save: vi.fn<DiffolioApi['save']>().mockResolvedValue({ path: '/tmp/result.ts' }),
		preferences: vi.fn<DiffolioApi['preferences']>().mockResolvedValue(undefined),
		remember: vi.fn<DiffolioApi['remember']>().mockResolvedValue([]),
		clearRecents: vi.fn<DiffolioApi['clearRecents']>().mockResolvedValue(undefined),
		confirmUnsaved: vi.fn<DiffolioApi['confirmUnsaved']>().mockResolvedValue('cancel'),
		dirty: vi.fn<DiffolioApi['dirty']>(),
		close: vi.fn<DiffolioApi['close']>(),
		cancel: vi.fn<DiffolioApi['cancel']>(),
		reveal: vi.fn<DiffolioApi['reveal']>().mockResolvedValue(undefined),
		filePath: vi.fn<DiffolioApi['filePath']>().mockReturnValue(''),
		onAction: vi.fn<DiffolioApi['onAction']>().mockReturnValue(() => {}),
		onProgress: vi.fn<DiffolioApi['onProgress']>().mockReturnValue(() => {}),
	} satisfies DiffolioApi;
	const store = createWorkspaceStore(api);
	return { api, store, actions: store.getState(), current: () => activeSession(store.getState()) };
}

export async function editingWorkspace() {
	const result = workspace();
	await result.actions.acceptOpen({ files: [source('before.ts'), source('after.ts', 'changed\n')] });
	result.actions.startEditing();
	result.actions.changeContent(result.current().id, result.current().documentId, 'draft\n');
	return result;
}
