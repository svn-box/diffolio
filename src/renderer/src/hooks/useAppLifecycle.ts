import { useEffect } from 'react';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { workspaceStore } from '@/state/workspace';
import { isDirty } from '@/state/session';
import { useAppUpdates } from '@/state/app-updates';

export function useAppLifecycle(): void {
	const { compare } = useEditorRuntime();
	useEffect(() => {
		const api = window.diffolio;
		let appearance: string | undefined;
		let dirty: boolean | undefined;
		let notice: string | undefined;
		let noticeTimer: ReturnType<typeof setTimeout> | undefined;

		function sync(): void {
			const state = workspaceStore.getState();
			if (appearance !== state.preferences.appearance) {
				appearance = state.preferences.appearance;
				document.documentElement.dataset.appearance = appearance;
			}
			const changed = state.sessions.some(isDirty);
			if (dirty !== changed) {
				dirty = changed;
				api.dirty(changed);
			}
			if (notice !== state.notice) {
				notice = state.notice;
				clearTimeout(noticeTimer);
				if (notice) {
					noticeTimer = setTimeout(() => workspaceStore.getState().clearNotice(), 5000);
				}
			}
		}

		sync();
		const unsubscribe = workspaceStore.subscribe(sync);
		const offProgress = api.onProgress(({ taskId, count }) => workspaceStore.getState().updateProgress(taskId, count));
		const offUpdate = api.onUpdate((state) => useAppUpdates.getState().accept(state));
		void useAppUpdates.getState().act('status');
		const offAction = api.onAction((action, paths) => {
			const state = workspaceStore.getState();
			switch (action) {
				case 'settings':
					state.setSettings(true);
					break;
				case 'check-updates':
					state.setSettings(true);
					void useAppUpdates.getState().act('check');
					break;
				case 'new':
					state.addSession();
					break;
				case 'open':
					void state.load('files');
					break;
				case 'folders':
					state.addSession('folders');
					break;
				case 'paths':
					if (paths) {
						void state.load('paths', paths);
					}
					break;
				case 'save':
					void state.saveSession(state.activeId);
					break;
				case 'close-tab':
					void state.closeSession(state.activeId);
					break;
				case 'close-window':
					void state.closeWindow();
					break;
				case 'split':
				case 'unified':
					state.setLayout(action);
					break;
				case 'find':
					compare.current?.find();
					break;
				case 'find-next':
				case 'find-previous':
					compare.current?.searchNext(action === 'find-next' ? 1 : -1);
					break;
			}
		});
		void workspaceStore.getState().initialize();
		return () => {
			unsubscribe();
			offProgress();
			offUpdate();
			offAction();
			clearTimeout(noticeTimer);
		};
	}, [compare]);
}
