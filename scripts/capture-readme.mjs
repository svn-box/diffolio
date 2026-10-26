import { _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = resolve('.');
const output = join(root, 'resources/screenshots');
const data = await mkdtemp(join(tmpdir(), 'diffolio-readme-'));
const appPath = join(root, 'release/mac-arm64/Diffolio.app/Contents/MacOS/Diffolio');
const windowSize = { width: 1280, height: 800 };
const errors = [];
let instance;

await mkdir(output, { recursive: true });
try {
	instance = await electron.launch({ executablePath: appPath, args: [], env: { ...process.env, DIFFOLIO_DATA_DIR: data } });
	const page = await instance.firstWindow();
	page.on('pageerror', (error) => errors.push(error.message));
	await instance.evaluate(({ BrowserWindow }, size) => {
		const window = BrowserWindow.getAllWindows()[0];
		window.setBounds({ x: 100, y: 80, ...size });
		window.show();
		window.focus();
	}, windowSize);
	await expect(page.locator('.home-welcome')).toBeVisible();
	const helper = join(data, 'window-id.swift');
	await writeFile(
		helper,
		`import CoreGraphics
let pid = Int(CommandLine.arguments[1])!
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for item in windows {
    let bounds = item[kCGWindowBounds as String] as? [String: Any] ?? [:]
    if item[kCGWindowOwnerPID as String] as? Int == pid && item[kCGWindowLayer as String] as? Int == 0 && (bounds["Width"] as? Double ?? 0) > 600 {
        print(item[kCGWindowNumber as String] as! Int)
        break
    }
}
`,
	);
	const windowId = (await exec('/usr/bin/swift', [helper, String(instance.process().pid)])).stdout.trim();
	if (!/^\d+$/.test(windowId)) {
		throw new Error('Cannot locate the dedicated macOS capture window.');
	}

	async function capture(name, description, inputs = []) {
		await page.mouse.move(windowSize.width - 12, windowSize.height - 12);
		await page.evaluate(async () => {
			await document.fonts.ready;
			await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		});
		const path = join(output, name);
		await exec('/usr/sbin/screencapture', ['-x', '-o', `-l${windowId}`, path]);
		const pixels = await readFile(path);
		const origin = {
			origin: 'Targeted macOS window capture of the packaged Diffolio application',
			description,
			interfaceLanguage: 'zh-CN',
			logicalSize: [windowSize.width, windowSize.height],
			pixelSize: [pixels.readUInt32BE(16), pixels.readUInt32BE(20)],
			inputs,
		};
		await writeFile(`${path}.json`, JSON.stringify(origin, null, 2) + '\n');
		console.log(`Captured ${name}`);
	}

	async function action(name, paths) {
		await instance.evaluate(
			({ BrowserWindow }, payload) => {
				BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', payload.name, payload.paths);
			},
			{ name, paths: paths?.map((path) => join(root, path)) },
		);
	}

	async function appearance(name) {
		await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
		await page.getByRole('button', { name, exact: true }).click();
		await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	}

	const textInputs = ['fixtures/reference/text/before.ts', 'fixtures/reference/text/after.ts'];
	await action('paths', textInputs);
	await expect(page.locator('.cm-editor')).toHaveCount(2);
	await appearance('深色');
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await page.getByRole('combobox', { name: '编辑器字号', exact: true }).click();
	await page.getByRole('combobox', { name: '搜索编辑器字号', exact: true }).fill('14');
	await page.getByRole('option', { name: '14 px', exact: true }).click();
	await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	await capture('comparison-dark.png', 'Dark side-by-side text comparison using the included text fixtures.', textInputs);
	await appearance('浅色');
	await page.getByRole('button', { name: /创建结果/ }).click();
	await page.getByRole('button', { name: /当前差异采用 A/ }).click();
	await capture('comparison-light.png', 'Light text comparison with an editable result copy; current change uses A.', textInputs);
	await instance.evaluate(({ dialog }) => {
		dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
	});
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	const folders = ['fixtures/reference/left', 'fixtures/reference/right'];
	await action('paths', folders);
	await expect(page.locator('.folder-row')).toHaveCount(6);
	await capture('folder-comparison.png', 'Folder comparison showing modified, equal and unmatched entries from the included fixture directories.', folders);
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	const images = ['fixtures/reference/left/assets/preview.png', 'fixtures/reference/right/assets/preview.png'];
	await action('paths', images);
	await expect(page.locator('.image-comparison')).toBeVisible();
	await page.waitForFunction(() => [...document.querySelectorAll('.image-stage img')].every((image) => image.complete && image.naturalWidth > 0));
	await page.getByRole('button', { name: '图片分割', exact: true }).click();
	await page.getByRole('slider', { name: '图片分割位置', exact: true }).fill('40');
	await capture('image-comparison.png', 'Image wipe comparison at 40 percent using the two included sample images.', images);
	await action('close-tab');
	await expect(page.locator('.home-recent-list > button')).toHaveCount(3);
	await capture('welcome.png', 'Welcome with actual recent text, folder and image fixture comparisons.', [...textInputs, ...folders, ...images]);
	await page.getByRole('button', { name: /新建比较/ }).click();
	await expect(page.locator('.compare-setup')).toBeVisible();
	await capture('new-comparison.png', 'Empty A/B source entry with separate choose and paste actions.');
	await action('paths', [textInputs[0]]);
	await expect(page.locator('.source-preview .cm-content')).toContainText('export const preferences');
	await capture('source-preview.png', 'The first file opens as a read-only preview while the other pane waits for input.', [textInputs[0]]);
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await page.getByRole('combobox', { name: '编辑器字号', exact: true }).click();
	await expect(page.getByRole('combobox', { name: '搜索编辑器字号', exact: true })).toBeFocused();
	await capture('font-combobox.png', 'Appearance and text preferences with the searchable font-size Combobox open.', [textInputs[0]]);
	if (errors.length) {
		throw new Error(`Renderer errors: ${errors.join(', ')}`);
	}
	const sources = [...new Set([...textInputs, ...images])];
	await writeFile(
		join(output, 'manifest.json'),
		JSON.stringify(
			{
				application: 'Diffolio',
				version: await instance.evaluate(({ app }) => app.getVersion()),
				logicalSize: windowSize,
				interfaceLanguage: 'zh-CN',
				fontSize: 14,
				data: 'Included fixtures; isolated temporary preferences and recent history; no user files or clipboard used.',
				sources: await Promise.all(
					sources.map(async (path) => ({
						path,
						sha256: createHash('sha256')
							.update(await readFile(join(root, path)))
							.digest('hex'),
					})),
				),
				command: 'npm run docs:screenshots',
			},
			null,
			2,
		) + '\n',
	);
} finally {
	await instance?.close();
	await rm(data, { recursive: true, force: true });
}
