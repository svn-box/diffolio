import type { FolderComparison, Layout, SourceFile } from '../../../shared/types';
import { emptyStats, type ComparisonStats } from '@/editor/types';

export type EntryKind = 'files' | 'folders';
export type Side = 'a' | 'b';

export interface Session {
	id: string;
	documentId: string;
	a?: SourceFile;
	b?: SourceFile;
	folder?: FolderComparison;
	layout: Layout;
	editing: boolean;
	content: string;
	savedContent: string;
	stats: ComparisonStats;
	example?: boolean;
	savedPath?: string;
	entryKind: EntryKind;
	folderPaths?: Partial<Record<Side, string>>;
}

export function newSession(entryKind: EntryKind = 'files'): Session {
	return { id: crypto.randomUUID(), documentId: crypto.randomUUID(), entryKind, layout: 'split', editing: false, content: '', savedContent: '', stats: emptyStats };
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
	return session.editing && session.content !== session.savedContent;
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
