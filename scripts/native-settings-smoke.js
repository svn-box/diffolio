(async () => {
	const { invoke } = window.__TAURI_INTERNALS__;
	const until = async (read) => {
		const started = Date.now();
		while (Date.now() - started < 10000) {
			if (await read()) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 30));
		}
		throw new Error('Settings condition timed out');
	};
	const button = (name) => [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === name);
	const snapshot = async (name) => {
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		await invoke('smoke_snapshot', { name });
	};
	try {
		await until(() => document.querySelector('.settings-window'));
		if (
			innerWidth !== 568 ||
			document.querySelector('dialog, .settings-footer') ||
			/让工作区适应|为专注的比较而设计|自动换行|折叠不变区域|软件更新|查看更新/.test(document.body.innerText)
		) {
			throw new Error('Settings content or independent window dimensions are wrong');
		}
		await snapshot('settings-light');
		await window.diffolio.showSettings();
		const state = await invoke('smoke_action', { action: 'settings-status' });
		if (state.windowCount !== 2) {
			throw new Error('Repeated Settings creates a duplicate window');
		}
		button('深色').click();
		await until(() => document.documentElement.dataset.appearance === 'dark');
		await snapshot('settings');
		document.querySelector('#settings-tab-general').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		await until(() => document.querySelector('#settings-tab-text').getAttribute('aria-selected') === 'true');
		document.querySelector('[role="combobox"]').click();
		await until(() => [...document.querySelectorAll('[cmdk-item]')].some((element) => element.textContent.trim() === '14 px'));
		[...document.querySelectorAll('[cmdk-item]')].find((element) => element.textContent.trim() === '14 px').click();
		await until(() => document.querySelector('[role="combobox"]').textContent.trim() === '14 px');
		await snapshot('settings-text');
		button('通用').click();
		await window.diffolio.showSettings();
		await invoke('smoke_action', { action: 'minimize-main' });
		await until(async () => (await invoke('smoke_action', { action: 'settings-status' })).mainMinimized);
		await invoke('smoke_action', { action: 'check-updates' });
		await until(async () => {
			const state = await invoke('smoke_action', { action: 'settings-status' });
			return state.mainFocused && !state.mainMinimized;
		});
		await invoke('smoke_settings_report', { report: { success: true, width: innerWidth, height: innerHeight, windowCount: state.windowCount, menuCheckFocused: true } });
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	} catch (error) {
		await invoke('smoke_settings_report', { report: { success: false, error: String(error) } });
	}
})();
