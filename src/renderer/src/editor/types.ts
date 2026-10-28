import type { EditorState } from '@codemirror/state';
import type { Layout, Preferences, SourceFile, Side } from '../../../shared/types';

export interface ComparisonStats {
	total: number;
	added: number;
	deleted: number;
	modified: number;
	current: number;
	canUndo: boolean;
	canRedo: boolean;
	canUndoA: boolean;
	canRedoA: boolean;
	activeSide: Side;
}

export const emptyStats: ComparisonStats = {
	total: 0,
	added: 0,
	deleted: 0,
	modified: 0,
	current: 0,
	canUndo: false,
	canRedo: false,
	canUndoA: false,
	canRedoA: false,
	activeSide: 'b',
};

export interface EditorSnapshot {
	state: EditorState;
	leftState?: EditorState;
	side?: Side;
	focused?: boolean;
	scroll: number;
}

export interface EditorSnapshots {
	get(id: string): EditorSnapshot | undefined;
	set(id: string, snapshot: EditorSnapshot): void;
}

export interface TextCompareHandle {
	navigate(direction: number): void;
	find(): void;
	searchNext(direction: number): void;
	edit(side: Side): void;
	undo(side: Side): void;
	redo(side: Side): void;
	merge(action: 'copy-a-b' | 'copy-b-a' | 'keep-a-b' | 'keep-b-a'): void;
}

export interface TextComparisonProps {
	id: string;
	a: SourceFile;
	b: SourceFile;
	content: Record<Side, string>;
	editing: Record<Side, boolean>;
	layout: Layout;
	preferences: Preferences;
	snapshots: EditorSnapshots;
	onEdit(side: Side): void;
	onChange(side: Side, content: string): void;
	onStats(stats: ComparisonStats): void;
}
