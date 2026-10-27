import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DiffolioApi, Preferences } from '../../../shared/types';
import type { AppUpdateState } from '../../../shared/app-updates';

type ActionCallback = Parameters<DiffolioApi['onAction']>[0];
type ProgressCallback = Parameters<DiffolioApi['onProgress']>[0];
const actions = new Set<ActionCallback>();
const progress = new Set<ProgressCallback>();
const updates = new Set<(state: AppUpdateState) => void>();
const preferenceChanges = new Set<(preferences: Preferences) => void>();
let latestPreferences: Preferences | undefined;

function subscribe<T>(listeners: Set<T>, callback: T): () => void {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

function fire(command: string, args?: Record<string, unknown>): void {
	void invoke(command, args).catch((error) => window.dispatchEvent(new CustomEvent('diffolio-error', { detail: String(error) })));
}

export async function installDesktop(): Promise<void> {
	// Browser verification injects the same interface without granting native capabilities.
	if (window.diffolio) {
		return;
	}
	if (!isTauri()) {
		throw new Error('请通过 npm run dev 启动 Diffolio 桌面应用。');
	}
	await Promise.all([
		listen<{ action: string; paths?: string[] }>('diffolio:action', ({ payload }) => actions.forEach((callback) => callback(payload.action, payload.paths))),
		listen<Parameters<ProgressCallback>[0]>('diffolio:progress', ({ payload }) => progress.forEach((callback) => callback(payload))),
		listen<AppUpdateState>('diffolio:update-state', ({ payload }) => updates.forEach((callback) => callback(payload))),
		listen<Preferences>('diffolio:preferences', ({ payload }) => {
			latestPreferences = payload;
			preferenceChanges.forEach((callback) => callback(payload));
		}),
		listen<string>('diffolio:error', ({ payload }) => window.dispatchEvent(new CustomEvent('diffolio-error', { detail: payload }))),
	]);
	window.diffolio = {
		showSettings: () => invoke('show_settings'),
		showUpdates: () => invoke('show_updates'),
		onPreferences: (callback) => subscribe(preferenceChanges, callback),
		update: (action) => invoke('update', { action }),
		onUpdate: (callback) => subscribe(updates, callback),
		bootstrap: async () => {
			const result = await invoke<Awaited<ReturnType<DiffolioApi['bootstrap']>>>('bootstrap');
			fire('ready');
			return { ...result, preferences: latestPreferences ?? result.preferences };
		},
		open: (kind, multiple = true, taskId) => invoke('open', { kind, multiple, taskId }),
		selectFolder: (path) => invoke('select_folder', { path }),
		readPaths: (paths, taskId) => invoke('read_paths', { paths, taskId }),
		clipboard: () => invoke('clipboard'),
		save: (content, source) => invoke('save', { content, source: { ...source, content: '', imageUrl: undefined } }),
		preferences: (value) => invoke('preferences', { value }),
		remember: (paths, kind) => invoke('remember', { paths, kind }),
		clearRecents: () => invoke('clear_recents'),
		confirmUnsaved: () => invoke('confirm_unsaved'),
		dirty: (value) => fire('dirty', { value }),
		close: () => fire('close'),
		cancel: (id) => fire('cancel', { id }),
		reveal: (path) => invoke('reveal', { path }),
		// Native drops provide paths through Tauri events, rather than DOM File objects.
		filePath: () => '',
		onAction: (callback) => subscribe(actions, callback),
		onProgress: (callback) => subscribe(progress, callback),
	};
}
