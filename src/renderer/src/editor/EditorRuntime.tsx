import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { workspaceStore } from '@/state/workspace';
import { createSnapshotCache } from '@/editor/snapshots';
import type { EditorSnapshots, TextCompareHandle } from '@/editor/types';

interface EditorRuntime {
	compare: RefObject<TextCompareHandle | null>;
	snapshots: EditorSnapshots;
}

const Context = createContext<EditorRuntime | null>(null);

export function EditorRuntimeProvider({ children }: { children: ReactNode }) {
	const compare = useRef<TextCompareHandle>(null);
	const snapshots = useMemo(() => createSnapshotCache((id) => workspaceStore.getState().sessions.some((session) => session.documentId === id)), []);
	const value = useMemo(() => ({ compare, snapshots }), [snapshots]);

	useEffect(() => workspaceStore.subscribe((state) => snapshots.retain(new Set(state.sessions.map((session) => session.documentId)))), [snapshots]);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useEditorRuntime(): EditorRuntime {
	const runtime = useContext(Context);
	if (!runtime) {
		throw new Error('Editor controls require EditorRuntimeProvider.');
	}
	return runtime;
}
