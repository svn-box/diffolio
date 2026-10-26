import type { WorkspaceContext, WorkspaceState } from './workspace-state';

type CatalogActions = Pick<WorkspaceState, 'initialize' | 'setPreference' | 'remember' | 'clearRecents'>;

export function createCatalogActions({ get, set, api }: WorkspaceContext): CatalogActions {
	let bootstrap: Promise<void> | undefined;
	let preferenceWrites = Promise.resolve();
	let recentWrites = Promise.resolve();

	function initialize(): Promise<void> {
		bootstrap ??= api
			.bootstrap()
			.then((data) => set(data))
			.catch((reason) => get().fail(reason));
		return bootstrap;
	}

	return {
		initialize,

		setPreference(value) {
			preferenceWrites = preferenceWrites.then(async () => {
				await initialize();
				const next = { ...get().preferences, ...value };
				try {
					await api.preferences(next);
					set({ preferences: next });
				} catch (reason) {
					get().fail(reason);
				}
			});
			return preferenceWrites;
		},

		remember(paths, kind) {
			recentWrites = recentWrites.then(async () => {
				await initialize();
				try {
					set({ recents: await api.remember(paths, kind) });
				} catch (reason) {
					get().fail(reason);
				}
			});
			return recentWrites;
		},

		clearRecents() {
			recentWrites = recentWrites.then(async () => {
				await initialize();
				try {
					await api.clearRecents();
					set({ recents: [] });
				} catch (reason) {
					get().fail(reason);
				}
			});
			return recentWrites;
		},
	};
}
