import { _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const appPath = resolve(process.env.DIFFOLIO_PACKAGED_APP ?? 'release/mac-arm64/Diffolio.app');
const { version: expectedVersion } = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const data = await mkdtemp(join(tmpdir(), 'diffolio-packaged-'));
const entries = require('@electron/asar').listPackage(join(appPath, 'Contents/Resources/app.asar'));
assert.ok(
	!entries.some((entry) => /^\/(replica|fixtures|work|tests|docs|scripts|src|resources|\.impeccable)\//.test(entry)),
	'Development files and public images must stay outside the app package',
);
let instance;

try {
	instance = await electron.launch({ executablePath: join(appPath, 'Contents/MacOS/Diffolio'), args: [], env: { ...process.env, DIFFOLIO_DATA_DIR: data } });
	const page = await instance.firstWindow();
	await instance.evaluate(async ({ BrowserWindow, clipboard, ClipboardItem }) => {
		BrowserWindow.getAllWindows()[0].hide();
		globalThis.diffolioSmokeClipboard = await Promise.all(
			(await clipboard.read()).map(async (item) => {
				const values = await Promise.all(item.types.map(async (type) => [type, await item.getType(type)]));
				return new ClipboardItem(Object.fromEntries(values));
			}),
		);
	});
	await expect(page.locator('.welcome')).toBeVisible();
	const version = await instance.evaluate(({ app }) => ({ name: app.getName(), version: app.getVersion(), packaged: app.isPackaged }));
	assert.deepEqual(version, { name: 'Diffolio', version: expectedVersion, packaged: true });
	await instance.evaluate(
		({ dialog }, paths) => {
			dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths });
		},
		[resolve('fixtures/reference/text/before.ts'), resolve('fixtures/reference/text/after.ts')],
	);
	await page.getByRole('button', { name: '选择要比较的文件', exact: true }).click();
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.path-half').first()).toContainText('before.ts');
	await expect(page.locator('.path-half').nth(1)).toContainText('after.ts');
	await page.getByRole('button', { name: '新建比较 ⌘N', exact: true }).click();
	await instance.evaluate(async ({ clipboard }) => {
		await clipboard.writeText('原始片段\n');
	});
	await page.getByRole('button', { name: '从剪贴板加入A', exact: true }).click();
	await instance.evaluate(async ({ clipboard }) => {
		await clipboard.writeText('修改后的片段\n');
	});
	await page.getByRole('button', { name: '从剪贴板加入B', exact: true }).click();
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.cm-merge-a .cm-content')).toContainText('原始片段');
	await expect(page.locator('.cm-merge-b .cm-content')).toContainText('修改后的片段');
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await expect(page.locator('.settings-footer')).toContainText(expectedVersion);
	await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	console.log('PASS: packaged macOS application, production preload, native open-dialog route, clipboard A/B, package content exclusions.');
} finally {
	await instance
		?.evaluate(async ({ clipboard }) => {
			if (globalThis.diffolioSmokeClipboard) {
				await clipboard.write(globalThis.diffolioSmokeClipboard);
				delete globalThis.diffolioSmokeClipboard;
			}
		})
		.catch(() => {});
	await instance?.close();
	await rm(data, { recursive: true, force: true });
}
