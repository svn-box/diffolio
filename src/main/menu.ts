import { app, Menu } from 'electron';

export function installMenu(action: (name: string) => void): void {
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{
				label: 'Diffolio',
				submenu: [
					{ role: 'about' },
					{ type: 'separator' },
					{ label: '设置…', accelerator: 'CmdOrCtrl+,', click: () => action('settings') },
					{ label: '检查更新…', click: () => action('check-updates') },
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
					{ label: '下一个匹配项', accelerator: 'CmdOrCtrl+G', click: () => action('find-next') },
					{ label: '上一个匹配项', accelerator: 'CmdOrCtrl+Shift+G', click: () => action('find-previous') },
					{ type: 'separator' },
					{ role: 'togglefullscreen' },
					...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const }]),
				],
			},
			{ role: 'windowMenu', label: '窗口' },
		]),
	);
}
