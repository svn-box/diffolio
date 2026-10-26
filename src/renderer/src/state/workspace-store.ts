import { createStore } from 'zustand/vanilla';
import { defaultPreferences, type DiffolioApi } from '../../../shared/types';
import { createCatalogActions } from './catalog-actions';
import { newSession } from './session';
import { createSessionActions } from './session-actions';
import { createSourceActions } from './source-actions';
import type { WorkspaceState } from './workspace-state';

export function createWorkspaceStore(api: DiffolioApi) {
	const session = newSession();
	return createStore<WorkspaceState>()((set, get) => {
		const context = { set, get, api };
		return {
			sessions: [session],
			activeId: session.id,
			preferences: { ...defaultPreferences },
			recents: [],
			home: true,
			inspector: false,
			settings: false,
			error: '',
			notice: '',
			busy: null,
			...createCatalogActions(context),
			...createSessionActions(context),
			...createSourceActions(context),

			setSettings(settings) {
				set({ settings });
			},

			toggleInspector() {
				set((state) => ({ inspector: !state.inspector }));
			},

			clearError() {
				set({ error: '' });
			},

			clearNotice() {
				set({ notice: '' });
			},

			fail(reason) {
				set({ error: (reason instanceof Error ? reason.message : String(reason)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') });
			},
		};
	});
}
