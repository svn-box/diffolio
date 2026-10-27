import { _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const appPath = resolve(process.env.DIFFOLIO_PACKAGED_APP ?? 'release/mac-arm64/Diffolio.app');
const data = await mkdtemp(join(tmpdir(), 'diffolio-update-test-'));
await mkdir(resolve('work/update-review'), { recursive: true });
let application;

try {
	application = await electron.launch({ executablePath: join(appPath, 'Contents/MacOS/Diffolio'), args: [], env: { ...process.env, DIFFOLIO_DATA_DIR: data } });
	const page = await application.firstWindow();
	await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
	const configuration = await application.evaluate(({ app, shell }) => {
		const client = process.mainModule.require('electron-updater').autoUpdater;
		globalThis.diffolioUpdateTest = { client, checks: 0, downloads: 0, installs: 0, mode: 'current', release: '' };
		const fixture = globalThis.diffolioUpdateTest;
		client.checkForUpdates = async () => {
			fixture.checks += 1;
			client.emit('checking-for-update');
			if (fixture.mode === 'error') {
				throw new Error('private network details');
			}
			client.emit(fixture.mode === 'current' ? 'update-not-available' : 'update-available', { version: fixture.mode === 'current' ? app.getVersion() : '99.0.0' });
			return null;
		};
		client.downloadUpdate = async () => {
			fixture.downloads += 1;
			client.emit('download-progress', { percent: 42 });
			await new Promise((resolve) => {
				fixture.finishDownload = () => {
					client.emit('update-downloaded', { version: '99.0.0' });
					resolve();
				};
			});
			return [];
		};
		client.quitAndInstall = () => {
			fixture.installs += 1;
		};
		shell.openExternal = async (url) => {
			fixture.release = url;
		};
		return {
			autoDownload: client.autoDownload,
			autoInstall: client.autoInstallOnAppQuit,
			downgrade: client.allowDowngrade,
			prerelease: client.allowPrerelease,
			differentialDisabled: client.disableDifferentialDownload,
		};
	});
	assert.deepEqual(configuration, { autoDownload: false, autoInstall: false, downgrade: false, prerelease: false, differentialDisabled: true });
	assert.equal(await page.evaluate(async () => (await window.diffolio.update('status')).phase), 'idle');
	await page.getByRole('button', { name: '示例比较', exact: true }).click();
	await page.getByRole('button', { name: '创建结果', exact: true }).click();
	await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).focus();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n// unsaved result');
	await application.evaluate(({ Menu }) =>
		Menu.getApplicationMenu()
			.items[0].submenu.items.find((item) => item.label === '检查更新…')
			.click(),
	);
	const section = page.getByRole('region', { name: '应用更新', exact: true });
	await expect(section.getByRole('status')).toContainText('已是最新版本');
	await application.evaluate(() => {
		globalThis.diffolioUpdateTest.mode = 'error';
	});
	await section.getByRole('button', { name: '检查更新', exact: true }).click();
	await expect(section.getByRole('status')).toContainText('暂时无法检查更新');
	await expect(section.getByRole('status')).not.toContainText('private');
	await application.evaluate(() => {
		globalThis.diffolioUpdateTest.mode = 'available';
	});
	await section.getByRole('button', { name: '检查更新', exact: true }).click();
	await expect(section.getByRole('status')).toContainText('发现新版本 99.0.0');
	assert.equal(await application.evaluate(() => globalThis.diffolioUpdateTest.downloads), 0);
	await section.getByRole('button', { name: '下载更新', exact: true }).click();
	await expect(section.getByRole('progressbar')).toHaveAttribute('value', '42');
	await page.screenshot({ path: resolve('work/update-review/downloading.png') });
	await application.evaluate(() => globalThis.diffolioUpdateTest.finishDownload());
	await expect(section.getByRole('button', { name: '重启并安装', exact: true })).toBeDisabled();
	assert.equal(await application.evaluate(() => globalThis.diffolioUpdateTest.installs), 0);
	const blocked = await page.evaluate(() => window.diffolio.update('install'));
	assert.equal(blocked.phase, 'downloaded');
	assert.match(blocked.message, /先保存/);
	await section.getByRole('button', { name: '查看发布页', exact: true }).click();
	assert.equal(await application.evaluate(() => globalThis.diffolioUpdateTest.release), 'https://github.com/svn-box/diffolio/releases');
	assert.equal(
		await page.evaluate(async () => {
			try {
				await window.diffolio.update({ action: 'check', url: 'https://example.invalid' });
				return false;
			} catch {
				return true;
			}
		}),
		true,
	);
	await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	await application.evaluate(
		({ dialog }, path) => {
			dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
		},
		join(data, 'saved.ts'),
	);
	await page.getByRole('button', { name: '另存结果', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '已保存' })).toBeVisible();
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await expect(section.getByRole('button', { name: '重启并安装', exact: true })).toBeEnabled();
	await expect(section.getByRole('status')).not.toContainText('先保存');
	await page.screenshot({ path: resolve('work/update-review/downloaded.png') });
	await section.getByRole('button', { name: '重启并安装', exact: true }).click();
	await expect.poll(() => application.evaluate(() => globalThis.diffolioUpdateTest.installs)).toBe(1);
	console.log(
		'PASS: packaged update IPC/menu/UI, current/error/retry, explicit download/restart, progress, unsaved guard, fixed release URL and invalid command rejection; network/install client mocked.',
	);
} finally {
	await application?.close();
	await rm(data, { recursive: true, force: true });
}
