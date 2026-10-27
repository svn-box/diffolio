(async () => {
	const { invoke } = window.__TAURI_INTERNALS__;
	const checks = [];
	const metrics = {};
	const assert = (condition, message) => {
		if (!condition) {
			throw new Error(message);
		}
		checks.push(message);
	};
	const until = async (read, label) => {
		const started = Date.now();
		while (Date.now() - started < 10000) {
			const result = await read();
			if (result) {
				return result;
			}
			await new Promise((resolve) => setTimeout(resolve, 30));
		}
		throw new Error(`Timeout: ${label}`);
	};
	const button = (name) => [...document.querySelectorAll('button')].find((element) => element.getAttribute('aria-label') === name || element.textContent.trim() === name);
	const click = async (name) => (await until(() => button(name), name)).click();
	const snapshot = async (name) => {
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		await invoke('smoke_snapshot', { name });
	};
	const input = (element, value) => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	};
	try {
		await window.diffolio.preferences({ appearance: 'light', fontSize: 12, wrap: false, collapse: false });
		document.documentElement.dataset.appearance = 'light';
		await until(() => button('示例比较'), 'welcome');
		metrics.viewport = { width: innerWidth, height: innerHeight, scale: devicePixelRatio, url: location.href };
		assert(innerWidth === 964 && innerHeight === 564, 'Native window preserves the 964 × 564 content area');
		await snapshot('welcome');
		document.querySelector('.home-drop').click();
		await until(() => document.querySelector('.input-target'), 'entry');
		await snapshot('entry');
		await click('返回最近比较');
		await click('示例比较');
		await until(() => document.querySelectorAll('.cm-editor').length === 2, 'split editors');
		await click('查找 ⌘F');
		const field = await until(() => document.querySelector('[aria-label="搜索比较内容"]'), 'search');
		input(field, 'studio');
		await until(() => document.querySelector('.search-match-count')?.textContent === '1 / 2 处匹配', 'B results');
		assert(!document.querySelector('.cm-search'), 'Search uses the shared comparison bar');
		const a = document.querySelector('.cm-merge-a .cm-content').getBoundingClientRect();
		const b = document.querySelector('.cm-merge-b .cm-content').getBoundingClientRect();
		metrics.editorOffset = Math.abs(a.y - b.y);
		assert(metrics.editorOffset < 1, 'Opening search keeps A and B aligned');
		await click('搜索 A');
		await until(() => document.querySelector('.search-match-count')?.textContent === '1 / 3 处匹配', 'A results');
		await invoke('smoke_action', { action: 'find' });
		assert(button('搜索 A').getAttribute('aria-pressed') === 'true', 'Native Find menu preserves the selected search scope');
		await snapshot('search-light');
		await click('创建结果');
		await click('当前差异采用 A');
		await until(async () => (await invoke('smoke_action', { action: 'status' })).dirty, 'native dirty state');
		await invoke('smoke_action', { action: 'request-close' });
		await new Promise((resolve) => setTimeout(resolve, 200));
		const guarded = await invoke('smoke_action', { action: 'status' });
		assert(guarded.visible && guarded.dirty && !guarded.canClose, 'Native close is cancelled while unsaved results remain');
		await click('另存结果');
		await until(() => document.querySelector('.save-notice')?.textContent.includes('已保存'), 'saved result');
		assert(true, 'Result saves through the real Tauri bridge and Rust atomic writer');
		await click('统一布局 ⌘2');
		await until(() => document.querySelectorAll('.cm-editor').length === 1, 'unified');
		await click('双栏布局 ⌘1');
		await until(() => document.querySelectorAll('.cm-editor').length === 2, 'split restored');
		assert(true, 'Split and unified editors switch without losing state');
		await click('设置 ⌘,');
		await click('深色');
		await until(() => document.documentElement.dataset.appearance === 'dark', 'dark theme');
		await snapshot('settings');
		await click('关闭设置');
		await snapshot('search-dark');
		const base = window.__DIFFOLIO_SMOKE__.root + '/../fixtures/reference';
		const result = await window.diffolio.readPaths([base + '/text/before.ts', base + '/text/after.ts']);
		assert(result.files.length === 2 && result.files.every((source) => source.kind === 'text'), 'Native IPC reads actual text fixtures');
		const folder = await window.diffolio.readPaths([base + '/left', base + '/right']);
		assert(
			folder.folder.entries.some((entry) => entry.path === 'assets/preview.png' && entry.status === 'modified'),
			'Rust folder comparison hashes actual image contents',
		);
		const selected = await window.diffolio.selectFolder(base + '/left');
		assert(selected.endsWith('/left'), 'Folder path validation uses the real native backend');
		const images = await window.diffolio.readPaths([base + '/left/assets/preview.png', base + '/right/assets/preview.png']);
		assert(
			images.files.every((source) => source.kind === 'image' && source.imageUrl.startsWith('data:image/png;')),
			'Native image inputs retain their data and MIME type',
		);
		let invalid = false;
		try {
			await window.diffolio.readPaths([base + '/text/before.ts', base + '/left/assets/preview.png']);
		} catch {
			invalid = true;
		}
		assert(invalid, 'Mixed text/image comparisons are rejected');
		const taskId = crypto.randomUUID();
		await invoke('cancel', { id: taskId });
		let cancelled = false;
		try {
			await window.diffolio.readPaths([base + '/left', base + '/right'], taskId);
		} catch (error) {
			cancelled = String(error).includes('取消');
		}
		assert(cancelled, 'A cancellation arriving before the worker starts is retained');
		await invoke('smoke_action', { action: 'paths', paths: [base + '/left', base + '/right'] });
		await until(() => document.querySelector('.folder-comparison'), 'native folder workspace');
		await snapshot('folder');
		await invoke('smoke_action', { action: 'paths', paths: [base + '/left/assets/preview.png', base + '/right/assets/preview.png'] });
		await until(() => document.querySelector('.image-comparison'), 'native image workspace');
		await snapshot('image');
		await click('新建比较 ⌘N');
		await until(() => document.querySelector('[data-side="a"]'), 'native drop targets');
		for (const [side, path] of [
			['a', base + '/text/before.ts'],
			['b', base + '/text/after.ts'],
		]) {
			const rect = document.querySelector(`[data-side="${side}"]`).getBoundingClientRect();
			await invoke('smoke_action', {
				action: 'drop',
				paths: [path],
				position: { x: (rect.x + rect.width / 2) * devicePixelRatio, y: (rect.y + rect.height / 2) * devicePixelRatio },
			});
			await until(() => (side === 'a' ? document.querySelector('.source-text-preview') : document.querySelector('.cm-mergeView')), `native ${side} drop`);
		}
		assert(true, 'Native drop events hit-test A/B and load actual files through Rust');
		const update = await window.diffolio.update('status');
		assert(update.phase === 'disabled' && update.message.includes('更新源'), 'Preview never installs an Electron release as a Tauri update');
		assert(document.documentElement.scrollWidth <= innerWidth, 'Native WebKit layout stays within the window');
		await invoke('smoke_report', { report: { success: true, checks, metrics, userAgent: navigator.userAgent } });
	} catch (error) {
		await invoke('smoke_report', {
			report: {
				success: false,
				checks,
				metrics,
				error: String(error),
				buttons: [...document.querySelectorAll('button')].map((button) => button.getAttribute('aria-label') || button.textContent.trim()),
			},
		});
	}
})();
