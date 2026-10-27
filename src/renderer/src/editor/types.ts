import type { EditorState } from '@codemirror/state';
import type { Layout, Preferences, SourceFile } from '../../../shared/types';

export interface ComparisonStats {
	total: number;
	added: number;
	deleted: number;
	modified: number;
	current: number;
}

export const emptyStats: ComparisonStats = { total: 0, added: 0, deleted: 0, modified: 0, current: 0 };

export interface EditorSnapshot {
	state: EditorState;
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
	undo(): void;
	redo(): void;
	useA(): void;
}

export interface TextComparisonProps {
	id: string;
	a: SourceFile;
	b: SourceFile;
	content: string;
	editing: boolean;
	layout: Layout;
	preferences: Preferences;
	snapshots: EditorSnapshots;
	onChange(content: string): void;
	onStats(stats: ComparisonStats): void;
}
