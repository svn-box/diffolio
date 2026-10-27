import { chromium, webkit, _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('work/visual');
await mkdir(output, { recursive: true });
const fixtureRoot = resolve('fixtures/reference');
const paths = ['text/before.ts', 'text/after.ts', 'left/assets/preview.png', 'right/assets/preview.png'];
const sources = Object.fromEntries(
	await Promise.all(
		paths.map(async (name) => {
			const bytes = await readFile(join(fixtureRoot, name));
			const image = name.endsWith('.png');
			return [
				join(fixtureRoot, name),
				{
					id: name,
					name: name.split('/').at(-1),
					path: join(fixtureRoot, name),
					kind: image ? 'image' : 'text',
					content: image ? '' : bytes.toString('utf8'),
					bytes: bytes.length,
					bom: false,
					lineEnding: 'LF',
					...(image ? { imageUrl: `data:image/png;base64,${bytes.toString('base64')}` } : {}),
				},
			];
		}),
	),
);
const defaults = { appearance: 'light', fontSize: 12, wrap: false, collapse: false };

function mockDesktop({ sources, defaults, fixtureRoot }) {
	const action = new Set();
	let preferences = { ...defaults };
	let recents = [];
	window.__sendAction = (name, paths) => action.forEach((callback) => callback(name, paths));
	window.diffolio = {
		bootstrap: async () => ({ preferences, recents }),
		preferences: async (value) => {
			preferences = value;
		},
		remember: async () => recents,
		clearRecents: async () => {
			recents = [];
		},
		open: async () => null,
		readPaths: async (paths) => {
			if (paths[0] === fixtureRoot + '/left') {
				return {
					files: [],
					folder: {
						id: 'folder',
						left: paths[0],
						right: paths[1],
						entries: [
							{ path: 'preferences.ts', kind: 'file', status: 'modified', left: paths[0] + '/preferences.ts', right: paths[1] + '/preferences.ts' },
							{ path: 'README.txt', kind: 'file', status: 'equal', left: paths[0] + '/README.txt', right: paths[1] + '/README.txt' },
						],
					},
				};
			}
			return { files: paths.map((path) => sources[path]) };
		},
		selectFolder: async (path) => path ?? null,
		clipboard: async () => ({ id: 'clipboard', name: '剪贴板文本', content: '', bytes: 0, kind: 'text', bom: false, lineEnding: 'LF' }),
		save: async () => ({ path: '/tmp/result.ts' }),
		confirmUnsaved: async () => 'cancel',
		dirty: () => {},
		close: () => {},
		cancel: () => {},
		reveal: async () => {},
		filePath: () => '',
		onAction: (callback) => {
			action.add(callback);
			return () => action.delete(callback);
		},
		onProgress: () => () => {},
		onUpdate: () => () => {},
		update: async () => ({ phase: 'disabled', currentVersion: '0.1.1', revision: 0, message: '此预览版暂未配置更新源，请手动安装新版本。' }),
	};
}

async function geometry(page) {
	return page.evaluate(() =>
		Object.fromEntries(
			['.titlebar', '.sidebar', '.home-hero', '.input-pair', '.pathbar', '.comparison-searchbar', '.cm-merge-a', '.cm-merge-b', '.statusbar'].flatMap((selector) => {
				const element = document.querySelector(selector);
				if (!element) {
					return [];
				}
				const rect = element.getBoundingClientRect();
				return [[selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }]];
			}),
		),
	);
}

async function exercise(page, name, sendAction) {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const metrics = {};
	const shot = async (state) => {
		await page.screenshot({ path: join(output, `${name}-${state}.png`) });
		metrics[state] = await geometry(page);
	};
	await expect(page.getByRole('button', { name: '示例比较', exact: true })).toBeVisible();
	await shot('welcome');
	await page.locator('.home-drop').click();
	await expect(page.locator('.input-target')).toHaveCount(2);
	await shot('entry');
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await page.getByRole('button', { name: '示例比较', exact: true }).click();
	await expect(page.locator('.cm-editor')).toHaveCount(2);
	await shot('split');
	await page.getByRole('button', { name: '查找 ⌘F', exact: true }).click();
	const input = page.getByRole('textbox', { name: '搜索比较内容', exact: true });
	const status = page.locator('.search-match-count');
	await input.fill('studio');
	await expect(status).toHaveText('1 / 2 处匹配');
	const a = await page.locator('.cm-merge-a .cm-content').boundingBox();
	const b = await page.locator('.cm-merge-b .cm-content').boundingBox();
	assert.ok(Math.abs(a.y - b.y) < 1, `${name}: search must preserve pane alignment`);
	await page.getByRole('button', { name: '搜索 A', exact: true }).click();
	await expect(status).toHaveText('1 / 3 处匹配');
	await input.press('Enter');
	await expect(status).toHaveText('2 / 3 处匹配');
	await input.press('Shift+Enter');
	await expect(status).toHaveText('1 / 3 处匹配');
	await page.getByRole('button', { name: '搜索选项', exact: true }).click();
	await page.getByRole('checkbox', { name: '正则表达式', exact: true }).check();
	await page.keyboard.press('Escape');
	await input.fill('[');
	await expect(status).toHaveText('正则表达式无效');
	await page.getByRole('button', { name: '搜索选项', exact: true }).click();
	await page.getByRole('checkbox', { name: '正则表达式', exact: true }).uncheck();
	await page.keyboard.press('Escape');
	await input.fill('studio');
	await shot('search');
	await page.getByRole('button', { name: '创建结果', exact: true }).click();
	const editor = page.getByRole('textbox', { name: '编辑比较结果', exact: true });
	await editor.focus();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n迁移验证 👨‍👩‍👧‍👦');
	await expect(editor).toContainText('迁移验证');
	await page.getByRole('button', { name: '统一布局 ⌘2', exact: true }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).toContainText('迁移验证');
	await page.getByRole('button', { name: '双栏布局 ⌘1', exact: true }).click();
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).not.toContainText('迁移验证');
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	await page.getByRole('button', { name: '深色', exact: true }).click();
	await page.getByRole('combobox').click();
	await page.getByRole('option', { name: '14 px', exact: true }).click();
	await expect(page.getByRole('combobox')).toHaveText('14 px');
	await page.getByRole('button', { name: '关闭设置', exact: true }).click();
	await shot('dark');
	await sendAction('paths', [join(fixtureRoot, 'left/assets/preview.png'), join(fixtureRoot, 'right/assets/preview.png')]);
	await expect(page.locator('.image-comparison')).toBeVisible();
	await shot('image');
	await sendAction('paths', [join(fixtureRoot, 'left'), join(fixtureRoot, 'right')]);
	await expect(page.locator('.folder-comparison')).toBeVisible();
	await shot('folder');
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	assert.deepEqual(errors, [], `${name}: unexpected renderer errors`);
	return metrics;
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '1421'], { stdio: 'ignore' });
const reports = {};
try {
	for (let attempt = 0; ; attempt++) {
		try {
			if ((await fetch('http://127.0.0.1:1421')).ok) {
				break;
			}
		} catch {}
		assert.ok(attempt < 100, 'Vite server failed to start');
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	for (const [name, engine] of [
		['chromium', chromium],
		['webkit', webkit],
	]) {
		const browser = await engine.launch();
		try {
			const page = await browser.newPage({ viewport: { width: 964, height: 564 }, deviceScaleFactor: 2, colorScheme: 'light' });
			await page.addInitScript(mockDesktop, { sources, defaults, fixtureRoot });
			await page.goto('http://127.0.0.1:1421');
			reports[name] = await exercise(page, name, (name, paths) => page.evaluate(({ name, paths }) => window.__sendAction(name, paths), { name, paths }));
		} finally {
			await browser.close();
		}
	}
	const baseline = process.argv[process.argv.indexOf('--baseline') + 1];
	if (process.argv.includes('--baseline')) {
		const data = await mkdtemp(join(tmpdir(), 'diffolio-electron-baseline-'));
		await writeFile(join(data, 'preferences.json'), JSON.stringify({ preferences: defaults, recents: [] }));
		const require = createRequire(join(resolve(baseline), 'package.json'));
		const app = await electron.launch({
			executablePath: require('electron'),
			args: [join(resolve(baseline), 'out/main/index.js')],
			env: { ...process.env, DIFFOLIO_DATA_DIR: data },
		});
		try {
			const page = await app.firstWindow();
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
			reports.electron = await exercise(page, 'electron', (action, paths) =>
				app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].webContents.send('diffolio:action', value.action, value.paths), { action, paths }),
			);
		} finally {
			await app.close();
			await rm(data, { recursive: true, force: true });
		}
	}
	await writeFile(join(output, 'geometry.json'), JSON.stringify(reports, null, 2));
	const reference = reports.electron ?? reports.chromium;
	for (const [state, selectors] of Object.entries(reference)) {
		for (const [selector, rect] of Object.entries(selectors)) {
			const other = reports.webkit[state][selector];
			for (const key of ['x', 'y', 'width', 'height']) {
				// Headless Chromium uses overlay scrollbars; the native Electron baseline uses the macOS scrollbars, like WebKit.
				if (!reports.electron && selector.startsWith('.cm-merge-') && (key === 'x' || key === 'width')) {
					continue;
				}
				assert.ok(Math.abs(rect[key] - other[key]) < 2, `${state} ${selector}.${key}: reference ${rect[key]}, WebKit ${other[key]}`);
			}
		}
	}
	console.log(`PASS: Chromium + WebKit comparison, search, Unicode editing, undo across layouts, themes, shadcn combobox, image and folder screens. ${output}`);
} finally {
	server.kill('SIGTERM');
}
