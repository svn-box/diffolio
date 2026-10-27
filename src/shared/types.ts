import type { AppUpdateAction, AppUpdateState } from './app-updates';

export type Appearance = 'system' | 'light' | 'dark';
export type Layout = 'split' | 'unified';

export interface Preferences {
	appearance: Appearance;
	fontSize: number;
	wrap: boolean;
	collapse: boolean;
}

export interface SourceFile {
	id: string;
	name: string;
	path?: string;
	kind: 'text' | 'image';
	content: string;
	bytes: number;
	bom: boolean;
	lineEnding: 'LF' | 'CRLF' | 'CR';
	hash?: string;
	imageUrl?: string;
}

export interface FolderEntry {
	path: string;
	kind: 'file' | 'directory' | 'symlink';
	status: 'equal' | 'modified' | 'left' | 'right' | 'error';
	left?: string;
	right?: string;
	leftSize?: number;
	rightSize?: number;
	error?: string;
}

export interface FolderComparison {
	id: string;
	left: string;
	right: string;
	entries: FolderEntry[];
}

export interface OpenResult {
	files: SourceFile[];
	folder?: FolderComparison;
}

export interface RecentComparison {
	id: string;
	paths: string[];
	name: string;
	kind: 'text' | 'folder' | 'image';
	openedAt: string;
}

export interface DiffolioApi {
	update(action: AppUpdateAction): Promise<AppUpdateState>;
	onUpdate(callback: (state: AppUpdateState) => void): () => void;
	bootstrap(): Promise<{ preferences: Preferences; recents: RecentComparison[] }>;
	open(kind: 'files' | 'folders', multiple?: boolean, taskId?: string): Promise<OpenResult | null>;
	selectFolder(path?: string): Promise<string | null>;
	readPaths(paths: string[], taskId?: string): Promise<OpenResult>;
	clipboard(): Promise<SourceFile>;
	save(content: string, source: SourceFile): Promise<{ path: string } | null>;
	preferences(value: Preferences): Promise<void>;
	remember(paths: string[], kind: RecentComparison['kind']): Promise<RecentComparison[]>;
	clearRecents(): Promise<void>;
	confirmUnsaved(): Promise<'save' | 'discard' | 'cancel'>;
	dirty(value: boolean): void;
	close(): void;
	cancel(taskId: string): void;
	reveal(path: string): Promise<void>;
	filePath(file: File): string;
	onAction(callback: (action: string, paths?: string[]) => void): () => void;
	onProgress(callback: (progress: { taskId: string; count: number }) => void): () => void;
}

export const defaultPreferences: Preferences = { appearance: 'system', fontSize: 12, wrap: false, collapse: false };
