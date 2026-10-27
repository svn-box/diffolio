import { app, ipcMain, shell, type BrowserWindow } from 'electron';
import electronUpdater from 'electron-updater';
import { AppUpdates } from './app-updates';
import { releasesUrl, updateRepository, type AppUpdateAction } from '../shared/app-updates';

export function registerUpdates(options: { window(): BrowserWindow | undefined; blockedReason(): string | undefined; flush(): Promise<void> }): void {
	const client = electronUpdater.autoUpdater;
	client.autoDownload = false;
	client.autoInstallOnAppQuit = false;
	client.allowDowngrade = false;
	client.allowPrerelease = false;
	client.disableDifferentialDownload = true;
	client.logger = null;
	client.setFeedURL(updateRepository);
	const updates = new AppUpdates({
		client,
		version: app.getVersion(),
		disabledReason: !app.isPackaged
			? '开发模式下不检查更新，请使用已安装的 macOS 版本。'
			: process.platform !== 'darwin' || process.arch !== 'arm64'
				? '当前平台暂不支持应用内更新。'
				: undefined,
		blockedReason: options.blockedReason,
		beforeInstall: options.flush,
		onChange: (state) => options.window()?.webContents.send('diffolio:update-state', state),
	});
	ipcMain.handle('diffolio:update', async (_event, action: AppUpdateAction) => {
		if (!['status', 'check', 'download', 'install', 'release'].includes(action)) {
			throw new Error('更新操作无效。');
		}
		if (action === 'release') {
			await shell.openExternal(releasesUrl);
			return updates.getState();
		}
		return updates.act(action);
	});
}
