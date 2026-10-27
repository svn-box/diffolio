import { create } from 'zustand';
import type { AppUpdateAction, AppUpdateState } from '../../../shared/app-updates';
import { version } from '../../../../package.json';

interface UpdateStore {
	state: AppUpdateState;
	accept(state: AppUpdateState): void;
	act(action: AppUpdateAction): Promise<void>;
}

let requestSequence = 0;

export const useAppUpdates = create<UpdateStore>((set, get) => ({
	state: { phase: 'idle', currentVersion: version, revision: -1 },
	accept(state) {
		if (state.revision >= get().state.revision) {
			set({ state });
		}
	},
	async act(action) {
		const request = ++requestSequence;
		const revision = get().state.revision;
		try {
			get().accept(await window.diffolio.update(action));
		} catch {
			if (request !== requestSequence || revision !== get().state.revision) {
				return;
			}
			const previous = get().state;
			set({ state: { ...previous, phase: previous.phase === 'downloaded' ? 'downloaded' : 'error', message: '更新操作未完成，请重试。', blocked: false } });
		}
	},
}));
