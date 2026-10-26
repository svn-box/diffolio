import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron';
import { readFile, mkdir, writeFile, rename, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultPreferences, type OpenResult, type Preferences, type RecentComparison, type SourceFile } from '../shared/types';
import { compareFolders } from './folders';
import { contentLimit, currentHash, encodeText, readSource, saveAtomic } from './files';

app.setName('Diffolio');
if (process.env.DIFFOLIO_DATA_DIR) {
	app.setPath('userData', process.env.DIFFOLIO_DATA_DIR);
}
let window: BrowserWindow;
let dirty = false;
let canClose = false;
let preferences = { ...defaultPreferences };
let recents: RecentComparison[] = [];
let storeQueue = Promise.resolve();
const sources = new Map<string, SourceFile>();
const tasks = new Map<string, AbortController>();

function action(name: string, paths?: string[]): void {
	window?.webContents.send('diffolio:action', name, paths);
}

async function persist(): Promise<void> {
	const data = JSON.stringify({ preferences, recents }, null, 2);
	storeQueue = storeQueue
		.catch(() => {})
		.then(async () => {
			const folder = app.getPath('userData');
			await mkdir(folder, { recursive: true });
			await writeFile(join(folder, 'preferences.json.tmp'), data, { mode: 0o600 });
			await rename(join(folder, 'preferences.json.tmp'), join(folder, 'preferences.json'));
		});
	await storeQueue;
}

async function readPaths(input: string[], taskId: string = randomUUID()): Promise<OpenResult> {
	if (!Array.isArray(input) || input.length < 1 || input.length > 2 || input.some((path) => typeof path !== 'string' || !path)) {
		throw new Error('请选择一个或两个文件，或者两个文件夹。');
	}
	const paths = input.map((path) => resolve(path));
	const infos = await Promise.all(paths.map((path) => stat(path)));
	if (infos.some((info) => info.isDirectory())) {
		if (paths.length !== 2 || infos.some((info) => !info.isDirectory())) {
			throw new Error('目录比较需要同时选择两个文件夹。');
		}
		const controller = new AbortController();
		tasks.set(taskId, controller);
		try {
			const folder = await compareFolders(paths[0], paths[1], controller.signal, (count) => window.webContents.send('diffolio:progress', { taskId, count }));
			return { files: [], folder };
		} finally {
			tasks.delete(taskId);
		}
	}
	const files = await Promise.all(paths.map(readSource));
	if (files.length === 2 && files[0].kind !== files[1].kind) {
		throw new Error('请比较相同类型的内容：两个文本文件或两张图片。');
	}
	for (const file of files) {
		sources.set(file.id, file);
	}
	return { files };
}

function registerHandlers(): void {
	ipcMain.handle('diffolio:bootstrap', () => ({ preferences, recents }));
	ipcMain.handle('diffolio:read', (_event, paths: string[], id?: string) => readPaths(paths, id));
	ipcMain.handle('diffolio:open', async (_event, kind: 'files' | 'folders', multiple = true, taskId?: string) => {
		const result = await dialog.showOpenDialog(window, {
			title: kind === 'folders' ? '选择两个要比较的文件夹' : multiple ? '选择要比较的文件' : '选择一个文件',
			properties: kind === 'folders' ? ['openDirectory', 'multiSelections'] : multiple ? ['openFile', 'multiSelections'] : ['openFile'],
		});
		return result.canceled ? null : readPaths(result.filePaths, taskId);
	});
	ipcMain.handle('diffolio:select-folder', async (_event, input?: string) => {
		let path = input;
		if (path === undefined) {
			const result = await dialog.showOpenDialog(window, { title: '选择比较文件夹', properties: ['openDirectory'] });
			if (result.canceled) {
				return null;
			}
			path = result.filePaths[0];
		}
		if (typeof path !== 'string' || !path || !(await stat(path)).isDirectory()) {
			throw new Error('请选择文件夹，或切换到文件比较。');
		}
		return resolve(path);
	});
	ipcMain.handle('diffolio:clipboard', async () => {
		const content = await clipboard.readText();
		if (Buffer.byteLength(content) > contentLimit) {
			throw new Error('剪贴板内容超过 16 MB，请先缩小内容。');
		}
		return { id: randomUUID(), name: '剪贴板文本', kind: 'text', content, bytes: Buffer.byteLength(content), bom: false, lineEnding: 'LF' } satisfies SourceFile;
	});
	ipcMain.handle('diffolio:save', async (_event, content: string, input: SourceFile) => {
		if (typeof content !== 'string' || Buffer.byteLength(content) > contentLimit) {
			throw new Error('结果内容超过首版的 16 MB 保存限制。');
		}
		const source = sources.get(input.id) ?? input;
		if (!['LF', 'CRLF', 'CR'].includes(source.lineEnding) || typeof source.name !== 'string') {
			throw new Error('结果格式无效。');
		}
		const extension = extname(source.name);
		const fileName = `${basename(source.name, extension)}.merged${extension}`;
		const result = await dialog.showSaveDialog(window, {
			title: '另存比较结果',
			defaultPath: source.path ? join(dirname(source.path), fileName) : fileName,
			buttonLabel: '保存结果',
		});
		if (result.canceled || !result.filePath) {
			return null;
		}
		const known = [...sources.values()].find((item) => item.path === result.filePath);
		const expected = known?.hash ?? (await currentHash(result.filePath));
		await saveAtomic(result.filePath, encodeText(content, source), expected);
		return { path: result.filePath };
	});
	ipcMain.handle('diffolio:preferences', async (_event, value: Preferences) => {
		if (!['system', 'light', 'dark'].includes(value.appearance) || !Number.isInteger(value.fontSize) || value.fontSize < 11 || value.fontSize > 20) {
			throw new Error('偏好设置无效。');
		}
		preferences = { appearance: value.appearance, fontSize: value.fontSize, wrap: !!value.wrap, collapse: !!value.collapse };
		nativeTheme.themeSource = preferences.appearance;
		await persist();
	});
	ipcMain.handle('diffolio:remember', async (_event, paths: string[], kind: RecentComparison['kind']) => {
		if (paths.length !== 2 || paths.some((path) => typeof path !== 'string') || !['text', 'folder', 'image'].includes(kind)) {
			return recents;
		}
		recents = recents.filter((item) => item.paths.join('\0') !== paths.join('\0'));
		recents.unshift({ id: randomUUID(), paths, kind, name: `${basename(paths[0])} ↔ ${basename(paths[1])}`, openedAt: new Date().toISOString() });
		recents = recents.slice(0, 15);
		await persist();
		return recents;
	});
	ipcMain.handle('diffolio:clear-recents', async () => {
		recents = [];
		await persist();
	});
	ipcMain.handle('diffolio:unsaved', async () => {
		const result = await dialog.showMessageBox(window, {
			type: 'question',
			message: '保存尚未保存的比较结果？',
			detail: '你可以保存后继续，也可以放弃这些编辑。',
			buttons: ['保存后继续', '放弃修改', '取消'],
			defaultId: 0,
			cancelId: 2,
		});
		return (['save', 'discard', 'cancel'] as const)[result.response];
	});
	ipcMain.handle('diffolio:reveal', (_event, path: string) => {
		if (typeof path === 'string') {
			shell.showItemInFolder(path);
		}
	});
	ipcMain.on('diffolio:dirty', (_event, value: boolean) => {
		dirty = !!value;
		window.setDocumentEdited(dirty);
	});
	ipcMain.on('diffolio:cancel', (_event, id: string) => tasks.get(id)?.abort());
	ipcMain.on('diffolio:close', () => {
		canClose = true;
		window.close();
	});
}

async function createWindow(): Promise<void> {
	canClose = false;
	dirty = false;
	window = new BrowserWindow({
		width: 964,
		height: 564,
		minWidth: 880,
		minHeight: 540,
		title: 'Diffolio',
		titleBarStyle: 'hiddenInset',
		trafficLightPosition: { x: 18, y: 18 },
		backgroundColor: nativeTheme.shouldUseDarkColors ? '#222225' : '#faf9f7',
		vibrancy: 'sidebar',
		visualEffectState: 'followWindow',
		webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
	});
	window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
	window.webContents.on('will-navigate', (event) => event.preventDefault());
	window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
	window.on('close', (event) => {
		if (dirty && !canClose) {
			event.preventDefault();
			action('close-window');
		}
	});
	window.on('closed', () => {
		for (const task of tasks.values()) {
			task.abort();
		}
	});
	if (process.env.ELECTRON_RENDERER_URL) {
		await window.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		await window.loadFile(join(__dirname, '../renderer/index.html'));
	}
}

app.whenReady()
	.then(async () => {
		try {
			const stored = JSON.parse(await readFile(join(app.getPath('userData'), 'preferences.json'), 'utf8'));
			preferences = { ...defaultPreferences, ...stored.preferences };
			recents = Array.isArray(stored.recents) ? stored.recents.slice(0, 15) : [];
		} catch {
			/* First launch uses local defaults. */
		}
		nativeTheme.themeSource = preferences.appearance;
		registerHandlers();
		Menu.setApplicationMenu(
			Menu.buildFromTemplate([
				{
					label: 'Diffolio',
					submenu: [
						{ role: 'about' },
						{ type: 'separator' },
						{ label: '设置…', accelerator: 'CmdOrCtrl+,', click: () => action('settings') },
						{ type: 'separator' },
						{ role: 'hide' },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' },
						{ role: 'quit' },
					],
				},
				{
					label: '文件',
					submenu: [
						{ label: '新建比较', accelerator: 'CmdOrCtrl+N', click: () => action('new') },
						{ label: '打开文件…', accelerator: 'CmdOrCtrl+O', click: () => action('open') },
						{ label: '比较文件夹…', accelerator: 'CmdOrCtrl+Shift+O', click: () => action('folders') },
						{ type: 'separator' },
						{ label: '保存结果…', accelerator: 'CmdOrCtrl+S', click: () => action('save') },
						{ label: '另存结果…', accelerator: 'CmdOrCtrl+Shift+S', click: () => action('save') },
						{ label: '关闭比较', accelerator: 'CmdOrCtrl+W', click: () => action('close-tab') },
					],
				},
				{ role: 'editMenu', label: '编辑' },
				{
					label: '显示',
					submenu: [
						{ label: '双栏布局', accelerator: 'CmdOrCtrl+1', click: () => action('split') },
						{ label: '统一布局', accelerator: 'CmdOrCtrl+2', click: () => action('unified') },
						{ label: '查找', accelerator: 'CmdOrCtrl+F', click: () => action('find') },
						{ type: 'separator' },
						{ role: 'togglefullscreen' },
						...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const }]),
					],
				},
				{ role: 'windowMenu', label: '窗口' },
			]),
		);
		await createWindow();
		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				void createWindow();
			}
		});
	})
	.catch((error) => {
		dialog.showErrorBox('Diffolio 无法启动', String(error));
		app.quit();
	});
