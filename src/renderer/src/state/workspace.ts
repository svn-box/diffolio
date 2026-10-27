import { useStore } from 'zustand';
import { createWorkspaceStore } from '@/state/workspace-store';
import { activeSession, type WorkspaceState } from '@/state/workspace-state';

export const workspaceStore = createWorkspaceStore(window.diffolio);

export function useWorkspace<T>(selector: (state: WorkspaceState) => T): T {
	return useStore(workspaceStore, selector);
}

export function useActiveSession() {
	return useWorkspace(activeSession);
}
