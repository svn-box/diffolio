(async () => {
	const { invoke } = window.__TAURI_INTERNALS__;
	const measurements = [];
	const checks = [];
	const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50))));

	async function measure(state, label = 'main', titleHeight = document.querySelector('.titlebar').getBoundingClientRect().height) {
		await settle();
		const geometry = await invoke('smoke_window_controls', { label });
		const expectedCenter = titleHeight / 2;
		measurements.push({ state, label, expectedCenter, ...geometry });
		if (geometry.buttons.every((button) => Math.abs(button.centerY - expectedCenter) <= 1)) {
			checks.push(`${state}: all native controls align to the titlebar center`);
		}
	}

	function click(name) {
		const button = [...document.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
		if (!button) {
			throw new Error(`Missing button: ${name}`);
		}
		button.click();
	}

	try {
		await measure('welcome');
		document.querySelector('.home-drop').click();
		await measure('new comparison');
		click('返回最近比较');
		await settle();
		click('示例比较');
		await measure('comparison');
		await invoke('smoke_action', { action: 'minimum-window' });
		await measure('minimum window');
		await invoke('smoke_action', { action: 'restore-window' });
		await measure('restored window');
		await window.diffolio.showSettings();
		await measure('settings', 'settings', 36);
		await window.diffolio.preferences({ appearance: 'dark' });
		await measure('dark main');
		await measure('dark settings', 'settings', 36);
		const failed = measurements.filter((item) => item.buttons.some((button) => Math.abs(button.centerY - item.expectedCenter) > 1));
		await invoke('smoke_report', {
			report: { success: !failed.length, checks, measurements, ...(failed.length ? { error: `Native controls are vertically misaligned: ${JSON.stringify(failed)}` } : {}) },
		});
	} catch (error) {
		await invoke('smoke_report', { report: { success: false, checks, measurements, error: String(error) } });
	}
})();
