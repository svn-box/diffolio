import { chromium, webkit, _electron as electron } from 'playwright';
import { expect } from 'playwright/test';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import packageInfo from '../package.json' with { type: 'json' };
import { mockDesktop } from './helpers/mock-desktop.mjs';
import { exerciseSettings, exerciseUpdates } from './helpers/settings-check.mjs';
import { exerciseFooter, exerciseResultFooter, footerGeometry, footerAction } from './helpers/footer-check.mjs';

const output = resolve('work/visual');
const { version } = packageInfo;
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
	if (name !== 'electron') {
		await exerciseUpdates(page, output, name, version);
	}
	await page.locator('.home-drop').click();
	await expect(page.locator('.input-target')).toHaveCount(2);
	await shot('entry');
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await page.getByRole('button', { name: '示例比较', exact: true }).click();
	await expect(page.locator('.cm-editor')).toHaveCount(2);
	await shot('split');
	if (name !== 'electron') {
		await exerciseFooter(page, output, name);
	}
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
	await page.getByRole('button', { name: name === 'electron' ? '创建结果' : '编辑 B', exact: true }).click();
	const editor = page.getByRole('textbox', { name: name === 'electron' ? '编辑比较结果' : '编辑 B 副本', exact: true });
	await editor.focus();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\n迁移验证 👨‍👩‍👧‍👦');
	await expect(editor).toContainText('迁移验证');
	await page.getByRole('button', { name: '统一布局 ⌘2', exact: true }).click();
	await expect(page.getByRole('textbox', { name: name === 'electron' ? '编辑比较结果' : '编辑 B 副本', exact: true })).toContainText('迁移验证');
	await page.getByRole('button', { name: '双栏布局 ⌘1', exact: true }).click();
	if (name === 'electron') {
		await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	} else {
		await footerAction(page, 'B', '撤销');
	}
	await expect(page.getByRole('textbox', { name: name === 'electron' ? '编辑比较结果' : '编辑 B 副本', exact: true })).not.toContainText('迁移验证');
	if (name !== 'electron') {
		await exerciseResultFooter(page, output, name);
	}
	await exerciseSettings(page, output, name);
	if (name !== 'electron') {
		await footerGeometry(page);
	}
	await shot('dark');
	if (name !== 'electron') {
		await sendAction('paths', [join(fixtureRoot, 'text/before.ts'), join(fixtureRoot, 'text/before.ts')]);
		await expect(page.locator('.difference-count')).toHaveText('内容相同');
		await expect(page.getByRole('button', { name: '上一处差异', exact: true })).toBeDisabled();
		await expect(page.getByRole('button', { name: '下一处差异', exact: true })).toBeDisabled();
		await footerGeometry(page);
		await page.screenshot({ path: join(output, `${name}-footer-identical.png`) });
	}
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
			const context = await browser.newContext({ viewport: { width: 964, height: 564 }, deviceScaleFactor: 2, colorScheme: 'light' });
			await context.addInitScript(mockDesktop, { sources, defaults, fixtureRoot, version });
			const page = await context.newPage();
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
				// The unified footer intentionally changes vertical space from the historical Electron baseline.
				if (reports.electron && (selector === '.statusbar' || (selector.startsWith('.cm-merge-') && key === 'height'))) {
					continue;
				}
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
