import { _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const data = await mkdtemp(join(tmpdir(), 'diffolio-entry-'));
const review = resolve('.impeccable/review');
await mkdir(review, { recursive: true });
let instance;

try {
	instance = await electron.launch({ executablePath: require('electron'), args: [resolve('out/main/index.js')], env: { ...process.env, DIFFOLIO_DATA_DIR: data } });
	const page = await instance.firstWindow();
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));

	async function choose(paths, canceled = false) {
		await instance.evaluate(
			({ dialog }, value) => {
				dialog.showOpenDialog = async () => ({ canceled: value.canceled, filePaths: value.paths });
			},
			{ paths: paths.map((path) => resolve(path)), canceled },
		);
	}

	async function action(name) {
		await instance.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', value), name);
	}

	async function drop(selector, paths) {
		await page.evaluate(() => {
			const input = document.createElement('input');
			input.type = 'file';
			input.multiple = true;
			input.id = 'native-drop-fixture';
			input.hidden = true;
			document.body.append(input);
		});
		await page.locator('#native-drop-fixture').setInputFiles(paths.map((path) => resolve(path)));
		const transfer = await page.evaluateHandle(() => {
			const data = new DataTransfer();
			for (const file of document.getElementById('native-drop-fixture').files) {
				data.items.add(file);
			}
			return data;
		});
		await page.locator('.app-shell').dispatchEvent('dragover', { dataTransfer: transfer });
		await expect(page.locator('.drop-overlay')).toBeVisible();
		await page.locator(selector).dispatchEvent('drop', { dataTransfer: transfer });
		await expect(page.locator('.drop-overlay')).toHaveCount(0);
		await page.locator('#native-drop-fixture').evaluate((input) => input.remove());
		await transfer.dispose();
	}

	async function fits() {
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'The window must not overflow horizontally');
		const clipped = await page.locator('.input-pair, .setup-hint, .home-drop').evaluateAll((elements) =>
			elements
				.filter((element) => {
					const r = element.getBoundingClientRect();
					return r.width && (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight);
				})
				.map((element) => element.className),
		);
		assert.deepEqual(clipped, [], 'Entry controls must fit the compact viewport');
	}

	async function appearance(name) {
		await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
		await page.getByRole('button', { name, exact: true }).click();
		await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	}

	await expect(page.locator('.home-welcome')).toBeVisible();
	await expect(page.locator('.sidebar')).toHaveCount(1);
	await expect(page.getByRole('button', { name: '显示或隐藏侧栏', exact: true })).toHaveCount(0);
	assert.equal(
		await page.locator('.sidebar').evaluate((element) => getComputedStyle(element).backgroundColor),
		'rgb(34, 33, 38)',
		'Welcome rail must have one opaque graphite background',
	);
	await page.screenshot({ path: join(review, 'entry-welcome.png') });
	await page.getByRole('button', { name: /新建比较/ }).hover();
	await page.screenshot({ path: join(review, 'entry-home-hover.png') });
	await page.getByRole('button', { name: /拖入即可比较/ }).click();
	await expect(page.locator('.compare-setup')).toBeVisible();
	await expect(page.locator('.sidebar')).toHaveCount(0);
	await expect(page.locator('.tabbar')).toHaveCount(0);
	await fits();
	await page.screenshot({ path: join(review, 'entry-files.png') });
	await page.locator('.source-choose').first().hover();
	await page.screenshot({ path: join(review, 'entry-choose-hover-light.png') });
	await page.locator('.paste-button').first().hover();
	await page.screenshot({ path: join(review, 'entry-paste-hover-light.png') });
	await page.locator('.source-choose').first().focus();
	await page.keyboard.press('Tab');
	await page.keyboard.press('Shift+Tab');
	await page.mouse.move(400, 120);
	await expect(page.locator('.source-choose').first()).toBeFocused();
	assert.equal(
		await page
			.locator('.source-choose')
			.first()
			.evaluate((element) => element.matches(':focus-visible')),
		true,
	);
	await page.screenshot({ path: join(review, 'entry-choose-focus-light.png') });
	const corners = await page
		.locator('.paste-button')
		.first()
		.evaluate((element) => {
			const css = getComputedStyle(element);
			return [css.borderTopLeftRadius, css.borderTopRightRadius, css.borderBottomLeftRadius, css.borderBottomRightRadius];
		});
	assert.deepEqual(corners, ['7px', '7px', '7px', '7px'], 'Source actions must have four consistent corners');
	await expect(page.locator('.input-main')).toHaveCount(0);
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(880, 540));
	await fits();
	await page.screenshot({ path: join(review, 'entry-files-minimum.png') });
	await page.getByRole('button', { name: '文件夹', exact: true }).click();
	await choose(['fixtures/reference/left']);
	await page.getByRole('button', { name: '选择A文件夹', exact: true }).click();
	await expect(page.locator('.input-target[data-side="a"]')).toContainText('left');
	await choose([], true);
	await page.getByRole('button', { name: '选择B文件夹', exact: true }).click();
	await expect(page.locator('.compare-setup')).toBeVisible();
	await expect(page.locator('.input-target[data-side="a"]')).toContainText('left');
	await page.screenshot({ path: join(review, 'entry-folder-partial.png') });
	await choose(['fixtures/reference/right']);
	await page.getByRole('button', { name: '选择B文件夹', exact: true }).click();
	await expect(page.locator('.folder-comparison')).toBeVisible();
	await expect(page.locator('.sidebar')).toHaveCount(0);
	await fits();
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await page.getByRole('button', { name: /继续比较/ }).click();
	await expect(page.locator('.folder-comparison')).toBeVisible();
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	await page.getByRole('button', { name: /新建比较/ }).click();
	await choose(['fixtures/reference/text/after.ts']);
	await page.getByRole('button', { name: '选择B文件', exact: true }).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('.input-target[data-side="b"]')).toContainText('after.ts');
	await expect(page.locator('.source-preview .cm-content')).toContainText('export const preferences');
	await expect(page.locator('.source-preview .cm-content')).toHaveAttribute('contenteditable', 'false');
	await page.getByRole('button', { name: '文件夹', exact: true }).click();
	await expect(page.locator('.window-heading')).toHaveText('新建比较');
	await page.getByRole('button', { name: '文件或图片', exact: true }).click();
	await expect(page.locator('.source-preview .cm-content')).toContainText('export const preferences');
	await choose([], true);
	await page.getByRole('button', { name: '选择A文件', exact: true }).click();
	await expect(page.locator('.input-target[data-side="b"]')).toContainText('after.ts');
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(964, 564));
	await page.screenshot({ path: join(review, 'entry-file-partial.png') });
	await choose(['fixtures/reference/text/before.ts']);
	await action('open');
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.path-half').first()).toContainText('before.ts');
	await expect(page.locator('.path-half').nth(1)).toContainText('after.ts');
	await expect(page.locator('.sidebar')).toHaveCount(0);
	await expect(page.locator('.tabbar')).toHaveCount(0);
	const editor = await page.locator('.text-comparison').boundingBox();
	assert.equal(editor.x, 0, 'The comparison must begin at the left window edge');
	assert.equal(editor.width, 964, 'The document canvas must use the full window width');
	await page.screenshot({ path: join(review, 'entry-comparison.png') });
	await page.getByRole('button', { name: /创建结果/ }).click();
	await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).click();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n// entry draft retained');
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await expect(page.locator('.sidebar')).toHaveCount(1);
	await page.screenshot({ path: join(review, 'entry-welcome-recents.png') });
	await page.getByRole('button', { name: /新建比较/ }).click();
	await expect(page.locator('.compare-setup')).toBeVisible();
	await expect(page.locator('.tabbar')).toHaveCount(1);
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await page.getByRole('button', { name: /继续比较/ }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).toContainText('entry draft retained');
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).not.toContainText('entry draft retained');
	await action('close-tab');
	await expect(page.locator('.compare-setup')).toBeVisible();
	await drop('.input-target[data-side="a"]', ['fixtures/reference/text/before.ts']);
	await expect(page.locator('.input-target[data-side="a"]')).toContainText('before.ts');
	await drop('.input-target[data-side="b"]', ['fixtures/reference/right/assets/preview.png']);
	await expect(page.getByRole('alert')).toContainText('相同类型');
	await expect(page.locator('.input-target[data-side="a"]')).toContainText('before.ts');
	await page.screenshot({ path: join(review, 'entry-type-error.png') });
	await drop('.input-target[data-side="b"]', ['fixtures/reference/text/after.ts']);
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	await choose(['fixtures/reference/text/before.ts']);
	await page.getByRole('button', { name: '选择要比较的文件', exact: true }).click();
	await expect(page.locator('.compare-setup')).toBeVisible();
	await expect(page.locator('.input-target[data-side="a"]')).toContainText('before.ts');
	await choose(['fixtures/reference/text/after.ts']);
	await action('open');
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.tabbar')).toHaveCount(0);
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(880, 540));
	await fits();
	await page.screenshot({ path: join(review, 'entry-comparison-minimum.png') });
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	await page.getByRole('button', { name: /新建比较/ }).click();
	await appearance('深色');
	await page.locator('.source-choose').first().hover();
	await page.screenshot({ path: join(review, 'entry-choose-hover-dark.png') });
	await page.locator('.paste-button').first().hover();
	await page.screenshot({ path: join(review, 'entry-paste-hover-dark.png') });
	await instance.evaluate(async ({ clipboard, ClipboardItem }) => {
		globalThis.diffolioEntryClipboard = await Promise.all(
			(await clipboard.read()).map(
				async (item) => new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async (type) => [type, await item.getType(type)])))),
			),
		);
		await clipboard.writeText('');
	});
	await page.getByRole('button', { name: '从剪贴板加入A', exact: true }).click();
	await expect(page.locator('.source-empty-note')).toHaveText('已加入空文本');
	await expect(page.locator('.source-header-actions')).toContainText('0 B');
	await fits();
	await page.screenshot({ path: join(review, 'entry-empty-text-dark.png') });
	await instance.evaluate(async ({ clipboard }) => {
		await clipboard.writeText('new version\n');
	});
	await page.getByRole('button', { name: '从剪贴板加入B', exact: true }).click();
	await expect(page.locator('.text-comparison:not(.source-preview)')).toBeVisible();
	await expect(page.locator('.cm-merge-b .cm-content')).toContainText('new version');
	await action('close-tab');
	await expect(page.locator('.home-welcome')).toBeVisible();
	await page.getByRole('button', { name: /新建比较/ }).click();
	await choose(['fixtures/reference/left/assets/preview.png']);
	await page.getByRole('button', { name: '选择A文件', exact: true }).click();
	await page.waitForFunction(() => {
		const image = document.querySelector('.source-image-preview img');
		return image?.complete && image.naturalWidth > 0;
	});
	await page.screenshot({ path: join(review, 'entry-image-partial-dark.png') });
	assert.deepEqual(errors, []);
	console.log(
		'PASS: welcome-only rail; full-width comparison; independent folder pickers and cancellation; B-first files; sequential opens; real A/B drops and type-error recovery; retained edits and undo across recents; conditional tabs; compact entry and comparison.',
	);
} finally {
	await instance
		?.evaluate(async ({ clipboard }) => {
			if (globalThis.diffolioEntryClipboard) {
				await clipboard.write(globalThis.diffolioEntryClipboard);
				delete globalThis.diffolioEntryClipboard;
			}
		})
		.catch(() => {});
	await instance?.close();
	await rm(data, { recursive: true, force: true });
}
