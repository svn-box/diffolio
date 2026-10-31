export function mockDesktop({ sources, defaults, fixtureRoot, version }) {
	const action = new Set();
	const preferenceListeners = new Set();
	const updateListeners = new Set();
	let preferences = JSON.parse(localStorage.getItem('diffolio-preferences') ?? 'null') ?? { ...defaults };
	let recents = [];
	let updateState = { phase: 'idle', currentVersion: version, revision: 0 };
	window.__updateActions = [];
	window.__revealedPaths = [];
	window.__setUpdateState = (state) => {
		updateState = { currentVersion: version, revision: updateState.revision + 1, ...state };
		updateListeners.forEach((listener) => listener(updateState));
	};
	window.addEventListener('storage', (event) => {
		if (event.key === 'diffolio-preferences') {
			preferences = JSON.parse(event.newValue);
			preferenceListeners.forEach((listener) => listener(preferences));
		}
	});
	window.__sendAction = (name, paths) => action.forEach((callback) => callback(name, paths));
	window.diffolio = {
		showSettings: async () => {
			window.open('/?window=settings', 'diffolio-settings', 'popup,width=568,height=348')?.focus();
		},
		showUpdates: async () => {
			(window.opener ?? window).__sendAction('show-updates');
		},
		onPreferences: (callback) => {
			preferenceListeners.add(callback);
			return () => preferenceListeners.delete(callback);
		},
		bootstrap: async () => ({ preferences, recents }),
		preferences: async (value) => {
			preferences = { ...preferences, ...value };
			localStorage.setItem('diffolio-preferences', JSON.stringify(preferences));
			preferenceListeners.forEach((listener) => listener(preferences));
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
		save: async () => ({ path: window.__savePath ?? '/tmp/result.ts' }),
		confirmUnsaved: async () => 'cancel',
		dirty: () => {},
		close: () => {},
		cancel: () => {},
		reveal: async (path) => {
			window.__revealedPaths.push(path);
		},
		filePath: () => '',
		onAction: (callback) => {
			action.add(callback);
			return () => action.delete(callback);
		},
		onProgress: () => () => {},
		onUpdate: (callback) => {
			updateListeners.add(callback);
			return () => updateListeners.delete(callback);
		},
		update: async (action) => {
			window.__updateActions.push(action);
			if (action === 'check') {
				updateState = { phase: 'current', currentVersion: version, revision: updateState.revision + 1 };
			}
			return updateState;
		},
	};
}
