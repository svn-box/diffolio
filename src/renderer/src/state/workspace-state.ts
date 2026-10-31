import type { StoreApi } from 'zustand/vanilla';
import type { DiffolioApi, Layout, OpenResult, Preferences, RecentComparison, FolderEntry } from '../../../shared/types';
import type { ComparisonStats } from '@/editor/types';
import type { EntryKind, Session, Side } from '@/state/session';

export interface WorkspaceState {
	sessions: Session[];
	activeId: string;
	preferences: Preferences;
	recents: RecentComparison[];
	home: boolean;
	homePage: 'recents' | 'updates';
	error: string;
	notice: string;
	busy: { id: string; label: string; count?: number } | null;
	initialize(): Promise<void>;
	setPreference(value: Partial<Preferences>): Promise<void>;
	remember(paths: string[], kind: RecentComparison['kind']): Promise<void>;
	clearRecents(): Promise<void>;
	addSession(kind?: EntryKind): string;
	activateSession(id: string): void;
	continueSession(): void;
	showHome(): void;
	showUpdates(): void;
	openSettings(): void;
	setEntryKind(kind: EntryKind): void;
	setLayout(layout: Layout): void;
	startEditing(side?: Side): void;
	swapSources(): void;
	changeContent(id: string, documentId: string, content: string, side?: Side): void;
	updateStats(id: string, documentId: string, stats: ComparisonStats): void;
	saveSession(id: string, side?: Side): Promise<boolean>;
	closeSession(id: string): Promise<void>;
	closeWindow(): Promise<void>;
	acceptOpen(result: OpenResult, side?: Side, example?: boolean, targetId?: string): Promise<void>;
	load(kind: 'files' | 'folders' | 'paths', paths?: string[], side?: Side, targetId?: string): Promise<void>;
	paste(side?: Side): Promise<void>;
	selectFolder(side: Side, droppedPath?: string): Promise<void>;
	openFolderEntry(entry: FolderEntry): Promise<void>;
	cancelTask(): void;
	updateProgress(taskId: string, count: number): void;
	clearError(): void;
	clearNotice(): void;
	fail(reason: unknown): void;
}

export type WorkspaceStore = StoreApi<WorkspaceState>;

export interface WorkspaceContext {
	get: WorkspaceStore['getState'];
	set: WorkspaceStore['setState'];
	api: DiffolioApi;
}

export function activeSession(state: Pick<WorkspaceState, 'sessions' | 'activeId'>): Session {
	return state.sessions.find((session) => session.id === state.activeId) ?? state.sessions[0];
}

export function patchSession({ set }: WorkspaceContext, id: string, patch: Partial<Session>): void {
	set((state) => ({ sessions: state.sessions.map((session) => (session.id === id ? { ...session, ...patch } : session)) }));
}

export function patchDraft(context: WorkspaceContext, id: string, side: Side, patch: Partial<Session['drafts']['a']>): void {
	const session = context.get().sessions.find((item) => item.id === id);
	if (session) {
		patchSession(context, id, { drafts: { ...session.drafts, [side]: { ...session.drafts[side], ...patch } } });
	}
}
