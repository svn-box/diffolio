import { _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const data = await mkdtemp(join(tmpdir(), 'diffolio-e2e-'));
const review = resolve('.impeccable/review');
await mkdir(review, { recursive: true });
const errors = [];
let instance;

try {
	instance = await electron.launch({ executablePath: require('electron'), args: [resolve('out/main/index.js')], env: { ...process.env, DIFFOLIO_DATA_DIR: data } });
	const page = await instance.firstWindow();
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
	page.on('pageerror', (error) => errors.push(error.message));
	await expect(page.locator('.welcome')).toBeVisible();
	await page.screenshot({ path: join(review, 'welcome.png') });
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(964, 564));
	await page.screenshot({ path: join(review, 'welcome-compact.png') });
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900));
	await page.getByRole('button', { name: '示例比较', exact: true }).click();
	await expect(page.locator('.cm-editor')).toHaveCount(2);
	await expect(page.locator('.cm-changedLine').first()).toBeVisible();
	await page.waitForFunction(() => document.querySelectorAll('.diff-modified').length > 0);
	const firstLine = await page.locator('.cm-merge-a .cm-line').first().boundingBox();
	const firstNumber = await page.locator('.cm-merge-a .cm-lineNumbers .cm-gutterElement').filter({ hasText: /^1$/ }).boundingBox();
	assert.ok(Math.abs(firstLine.y - firstNumber.y) < 2, 'Line numbers must align with content');
	assert.match(await page.locator('.diff-summary').innerText(), /修改/);
	await page.evaluate(async () => {
		const value = await window.diffolio.bootstrap();
		await window.diffolio.preferences({ ...value.preferences, appearance: 'dark' });
	});
	await page.evaluate(() => {
		document.documentElement.dataset.appearance = 'dark';
	});
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900));
	await page.screenshot({ path: join(review, 'desktop.png') });
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(964, 564));
	await page.screenshot({ path: join(review, 'desktop-default-compact.png') });
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900));
	await page.getByRole('button', { name: '下一处差异', exact: true }).click();
	await page.getByRole('button', { name: /创建结果/ }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).toBeVisible();
	const originalB = await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).innerText();
	await page.locator('.cm-merge-b .cm-line').filter({ hasText: "interface: 'system-ui'" }).click();
	await page.getByRole('button', { name: /当前差异采用 A/ }).click();
	assert.ok(
		(await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).innerText()).includes("appearance: 'system'"),
		'Applying current difference must not change the first block from an unchanged line',
	);
	assert.ok(
		(await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).innerText()).includes('fontSize: 12'),
		'Applying current difference must select the next displayed block',
	);
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).not.toHaveText(originalB);
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	assert.equal(await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).innerText(), originalB);
	await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).click();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n// verified edit');
	await page.getByRole('button', { name: '统一布局 ⌘2', exact: true }).click();
	await expect(page.locator('.cm-editor')).toHaveCount(1);
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	assert.ok(!(await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).innerText()).includes('verified edit'), 'Undo history must survive layout switching');
	await page.getByRole('button', { name: '重做编辑 ⌘⇧Z', exact: true }).click();
	await page.locator('.text-comparison .cm-scroller').evaluate((element) => (element.scrollTop = 0));
	await page.screenshot({ path: join(review, 'unified-editing.png') });
	const output = join(data, 'result.ts');
	await instance.evaluate(({ dialog }, path) => {
		dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
	}, output);
	await page.getByRole('button', { name: '另存结果', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '已保存' })).toBeVisible();
	assert.ok((await readFile(output, 'utf8')).includes('verified edit'));
	await page.locator('.text-comparison .cm-line').filter({ hasText: "interface: 'system-ui'" }).click();
	await page.getByRole('button', { name: /当前差异采用 A/ }).click();
	await page.getByRole('button', { name: '另存结果', exact: true }).click();
	await expect.poll(() => readFile(output, 'utf8')).toContain('fontSize: 12');
	assert.ok((await readFile(output, 'utf8')).includes("appearance: 'system'"), 'Unified apply must use the displayed upcoming block');
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	await page.getByRole('button', { name: '另存结果', exact: true }).click();
	await expect.poll(() => readFile(output, 'utf8')).toContain('fontSize: 13');
	await page.getByRole('textbox', { name: '编辑比较结果', exact: true }).click();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n// unsaved');
	await instance.evaluate(({ dialog }) => {
		dialog.showMessageBox = async () => ({ response: 2, checkboxChecked: false });
	});
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', 'close-tab'));
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	await page.getByRole('button', { name: '双栏布局 ⌘1', exact: true }).click();
	await page
		.getByRole('button', { name: '交换 A 和 B', exact: true })
		.isDisabled()
		.then((disabled) => assert.equal(disabled, true));
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await expect(page.locator('dialog')).toBeVisible();
	await page.getByRole('button', { name: '浅色', exact: true }).click();
	await page.getByRole('combobox', { name: '编辑器字号', exact: true }).click();
	await expect(page.getByRole('combobox', { name: '搜索编辑器字号', exact: true })).toBeFocused();
	await page.getByRole('combobox', { name: '搜索编辑器字号', exact: true }).fill('99');
	await expect(page.getByText('没有匹配的字号', { exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('dialog')).toBeVisible();
	await expect(page.locator('.combobox-content')).toHaveCount(0);
	await page.getByRole('combobox', { name: '编辑器字号', exact: true }).click();
	await page.getByRole('combobox', { name: '搜索编辑器字号', exact: true }).fill('14');
	await page.screenshot({ path: join(review, 'settings-combobox.png') });
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('combobox', { name: '编辑器字号', exact: true })).toHaveText('14 px');
	await page.screenshot({ path: join(review, 'settings-light.png') });
	await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	await page.screenshot({ path: join(review, 'desktop-light.png') });
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(964, 564));
	await page.screenshot({ path: join(review, 'desktop-compact.png') });
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 900));
	await instance.evaluate(
		({ BrowserWindow }, paths) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', 'paths', paths),
		[resolve('fixtures/reference/left'), resolve('fixtures/reference/right')],
	);
	await expect(page.locator('.folder-comparison')).toBeVisible();
	await expect(page.locator('.folder-row')).toHaveCount(6);
	await page.screenshot({ path: join(review, 'folder.png') });
	await page.getByRole('textbox', { name: '筛选文件名' }).fill('preferences');
	await expect(page.locator('.folder-row')).toHaveCount(1);
	await page.locator('.folder-row').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.tabs .tab')).toHaveCount(3);
	await page.getByRole('tab', { name: 'left ↔ right', exact: true }).click();
	await page.getByRole('textbox', { name: '筛选文件名' }).fill('preferences');
	await page.locator('.folder-row').focus();
	await page.keyboard.press('Space');
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.tabs .tab')).toHaveCount(4);
	await page.getByRole('tab', { name: 'left ↔ right', exact: true }).click();
	await page.getByRole('textbox', { name: '筛选文件名' }).fill('preferences');
	await page.locator('.folder-row').dblclick();
	await expect(page.locator('.text-comparison')).toBeVisible();
	await page.getByRole('button', { name: '交换 A 和 B', exact: true }).click();
	await expect(page.locator('.text-comparison')).toBeVisible();
	await expect(page.locator('.path-half').first()).toContainText('right');
	await instance.evaluate(
		({ BrowserWindow }, paths) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', 'paths', paths),
		[resolve('fixtures/reference/left/assets/preview.png'), resolve('fixtures/reference/right/assets/preview.png')],
	);
	await expect(page.locator('.image-comparison')).toBeVisible();
	await page.waitForFunction(() => [...document.querySelectorAll('.image-stage img')].every((image) => image.complete && image.naturalWidth));
	for (let step = 0; step < 5; step += 1) {
		await page.getByRole('button', { name: '放大图片', exact: true }).click();
	}
	await expect(page.getByRole('button', { name: '200%', exact: true })).toBeVisible();
	await expect
		.poll(() =>
			page
				.locator('.image-half img')
				.first()
				.evaluate((image) => image.getBoundingClientRect().width),
		)
		.toBe(1600);
	await page
		.locator('.image-half')
		.first()
		.evaluate((element) => element.scrollTo({ left: 150, top: 120 }));
	await expect
		.poll(() =>
			page
				.locator('.image-half')
				.nth(1)
				.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop })),
		)
		.toEqual({ left: 150, top: 120 });
	await page
		.locator('.image-half')
		.nth(1)
		.evaluate((element) => element.scrollTo({ left: 90, top: 60 }));
	await expect
		.poll(() =>
			page
				.locator('.image-half')
				.first()
				.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop })),
		)
		.toEqual({ left: 90, top: 60 });
	await page.getByRole('button', { name: '200%', exact: true }).click();
	await page.getByRole('button', { name: '图片分割', exact: true }).click();
	await page.getByRole('slider', { name: '图片分割位置' }).fill('35');
	await page.screenshot({ path: join(review, 'image-wipe.png') });
	const invalid = join(data, 'binary.bin');
	await writeFile(invalid, Buffer.from([0, 1, 2]));
	await instance.evaluate(({ BrowserWindow }, paths) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', 'paths', paths), [invalid]);
	await expect(page.getByRole('alert')).toContainText('二进制');
	await expect(page.locator('.image-comparison')).toBeVisible();
	await page.screenshot({ path: join(review, 'error.png') });
	await page.getByRole('button', { name: '关闭错误提示', exact: true }).click();
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await expect(page.locator('.home-recent-list')).toBeVisible();
	await page.screenshot({ path: join(review, 'welcome-recents.png') });
	await page.locator('.home-recent-list > button').first().click();
	await expect(page.locator('.image-comparison')).toBeVisible();
	assert.deepEqual(errors, [], `Renderer errors: ${errors.join(', ')}`);
	const stored = JSON.parse(await readFile(join(data, 'preferences.json'), 'utf8'));
	assert.equal(stored.preferences.appearance, 'light');
	assert.equal(stored.preferences.fontSize, 14);
	assert.ok(stored.recents.length >= 3);
	console.log(
		'PASS: native Electron startup; comparison; chunk apply; undo/redo across layouts; real save; themes; preferences; minimum window; folder drilldown; swap; image wipe; binary error recovery.',
	);
} finally {
	await instance?.close();
	await rm(data, { recursive: true, force: true });
}
