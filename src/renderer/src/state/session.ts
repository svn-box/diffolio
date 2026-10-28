import type { FolderComparison, Layout, SourceFile, Side } from '../../../shared/types';
import { emptyStats, type ComparisonStats } from '@/editor/types';

export type EntryKind = 'files' | 'folders';
export type { Side };

export interface TextDraft {
	editing: boolean;
	content: string;
	savedContent: string;
	savedPath?: string;
}

export function newDraft(content = ''): TextDraft {
	return { editing: false, content, savedContent: content };
}

export interface Session {
	id: string;
	documentId: string;
	a?: SourceFile;
	b?: SourceFile;
	folder?: FolderComparison;
	layout: Layout;
	drafts: Record<Side, TextDraft>;
	stats: ComparisonStats;
	example?: boolean;
	entryKind: EntryKind;
	folderPaths?: Partial<Record<Side, string>>;
}

export function newSession(entryKind: EntryKind = 'files'): Session {
	return { id: crypto.randomUUID(), documentId: crypto.randomUUID(), entryKind, layout: 'split', drafts: { a: newDraft(), b: newDraft() }, stats: emptyStats };
}

export function leaf(path: string): string {
	return path.split('/').filter(Boolean).at(-1) ?? path;
}

export function sessionTitle(session: Session): string {
	return session.folder
		? `${leaf(session.folder.left)} ↔ ${leaf(session.folder.right)}`
		: session.a && session.b
			? session.a.name === session.b.name
				? session.a.name
				: `${session.a.name} ↔ ${session.b.name}`
			: (session.a?.name ?? session.b?.name ?? '新建比较');
}

export function isDirty(session: Session): boolean {
	return isSideDirty(session, 'a') || isSideDirty(session, 'b');
}

export function isSideDirty(session: Session, side: Side): boolean {
	const draft = session.drafts[side];
	return draft.editing && draft.content !== draft.savedContent;
}

export function hasSources(session: Session): boolean {
	return !!(session.a || session.b || session.folder || session.folderPaths?.a || session.folderPaths?.b);
}

export function sessionView(session: Session) {
	const paired = session.entryKind !== 'folders' && !!session.a && !!session.b;
	const previewing = session.entryKind !== 'folders' && !!(session.a || session.b);
	const kind = session.folder ? 'folder' : (session.a?.kind ?? session.b?.kind ?? 'text');
	return { paired, previewing, kind, ready: !!session.folder || paired };
}
