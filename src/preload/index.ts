import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { DiffolioApi } from '../shared/types';

const api: DiffolioApi = {
	bootstrap: () => ipcRenderer.invoke('diffolio:bootstrap'),
	open: (kind, multiple, taskId) => ipcRenderer.invoke('diffolio:open', kind, multiple, taskId),
	selectFolder: (path) => ipcRenderer.invoke('diffolio:select-folder', path),
	readPaths: (paths, id) => ipcRenderer.invoke('diffolio:read', paths, id),
	clipboard: () => ipcRenderer.invoke('diffolio:clipboard'),
	save: (content, source) => ipcRenderer.invoke('diffolio:save', content, source),
	preferences: (value) => ipcRenderer.invoke('diffolio:preferences', value),
	remember: (paths, kind) => ipcRenderer.invoke('diffolio:remember', paths, kind),
	clearRecents: () => ipcRenderer.invoke('diffolio:clear-recents'),
	confirmUnsaved: () => ipcRenderer.invoke('diffolio:unsaved'),
	dirty: (value) => ipcRenderer.send('diffolio:dirty', value),
	close: () => ipcRenderer.send('diffolio:close'),
	cancel: (id) => ipcRenderer.send('diffolio:cancel', id),
	reveal: (path) => ipcRenderer.invoke('diffolio:reveal', path),
	filePath: (file) => webUtils.getPathForFile(file),
	onAction(callback) {
		const listener = (_event: unknown, action: string, paths?: string[]): void => callback(action, paths);
		ipcRenderer.on('diffolio:action', listener);
		return () => ipcRenderer.removeListener('diffolio:action', listener);
	},
	onProgress(callback) {
		const listener = (_event: unknown, progress: { taskId: string; count: number }): void => callback(progress);
		ipcRenderer.on('diffolio:progress', listener);
		return () => ipcRenderer.removeListener('diffolio:progress', listener);
	},
};

contextBridge.exposeInMainWorld('diffolio', api);
