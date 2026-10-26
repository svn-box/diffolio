import type { OpenResult, SourceFile } from '../../../shared/types';
import { emptyStats } from '../editor/types';
import { newSession, type Session, type Side } from './session';
import { permitClose } from './session-actions';
import { patchSession, type WorkspaceContext, type WorkspaceState } from './workspace-state';

type SourceActions = Pick<WorkspaceState, 'acceptOpen' | 'load' | 'paste' | 'selectFolder' | 'openFolderEntry' | 'cancelTask' | 'updateProgress'>;

function withSources(target: Session, result: OpenResult, side?: Side, example = false): Session {
	const reset = { documentId: crypto.randomUUID(), editing: false, savedPath: undefined, stats: emptyStats, example };
	if (result.folder) {
		return {
			...target,
			...reset,
			a: undefined,
			b: undefined,
			entryKind: 'folders',
			folder: result.folder,
			folderPaths: { a: result.folder.left, b: result.folder.right },
			content: '',
			savedContent: '',
		};
	}
	const a = side === 'b' ? target.a : result.files[0];
	const b = side === 'a' ? target.b : side === 'b' ? result.files[0] : result.files[1];
	if (a && b && a.kind !== b.kind) {
		throw new Error('请选择相同类型的两个文件。');
	}
	return { ...target, ...reset, a, b, entryKind: 'files', folder: undefined, content: b?.content ?? '', savedContent: b?.content ?? '' };
}

export function createSourceActions(context: WorkspaceContext): SourceActions {
	const { get, set, api } = context;
	let inputVersion = 0;

	async function accept(result: OpenResult, request: { targetId: string; version: number; side?: Side; example?: boolean; taskId?: string }): Promise<void> {
		const { targetId, version, example = false, taskId } = request;
		let side = request.side;
		const current = get().sessions.find((session) => session.id === targetId);
		if (version !== inputVersion || !current || (!result.folder && !result.files.length)) {
			return;
		}
		if (!side && !result.folder && result.files.length === 1 && !current.folder && !!current.a !== !!current.b) {
			side = current.a ? 'b' : 'a';
		}
		if (side && !(await permitClose(context, [current]))) {
			return;
		}
		if (
			version !== inputVersion ||
			(taskId && get().busy?.id !== taskId) ||
			!get().sessions.some((session) => session.id === current.id && session.documentId === current.documentId)
		) {
			return;
		}
		const target = !side && ((current.a && current.b) || current.folder) ? newSession() : current;
		const next = withSources(target, result, side, example);
		set((state) => ({
			sessions: state.sessions.some((session) => session.id === next.id)
				? state.sessions.map((session) => (session.id === next.id ? next : session))
				: [...state.sessions, next],
			activeId: next.id,
			home: false,
			error: '',
			notice: '',
		}));
		const paths = next.folder ? [next.folder.left, next.folder.right] : next.a?.path && next.b?.path ? [next.a.path, next.b.path] : [];
		if (paths.length === 2) {
			await get().remember(paths, next.folder ? 'folder' : next.a!.kind);
		}
	}

	return {
		async acceptOpen(result, side, example = false, targetId = get().activeId) {
			get().cancelTask();
			await accept(result, { side, example, targetId, version: inputVersion });
		},

		async load(kind, paths, side, targetId = get().activeId) {
			get().cancelTask();
			const version = inputVersion;
			const target = get().sessions.find((session) => session.id === targetId);
			if (!target) {
				return;
			}
			const id = crypto.randomUUID();
			set({ busy: { id, label: kind === 'folders' ? '正在比较文件夹…' : '正在读取文件…' }, error: '' });
			try {
				const result = kind === 'paths' ? await api.readPaths(paths ?? [], id) : await api.open(kind, !side, id);
				if (get().busy?.id === id && result && get().sessions.some((session) => session.id === targetId && session.documentId === target.documentId)) {
					await accept(result, { side, targetId, taskId: id, version });
				}
			} catch (reason) {
				if (get().busy?.id === id) {
					get().fail(reason);
				}
			} finally {
				if (get().busy?.id === id) {
					set({ busy: null });
				}
			}
		},

		async paste(side) {
			get().cancelTask();
			const version = inputVersion;
			const targetId = get().activeId;
			const target = get().sessions.find((session) => session.id === targetId)!;
			try {
				const file = await api.clipboard();
				if (version === inputVersion && get().sessions.some((session) => session.id === targetId && session.documentId === target.documentId)) {
					await accept({ files: [file] }, { side, targetId, version });
				}
			} catch (reason) {
				if (version === inputVersion) {
					get().fail(reason);
				}
			}
		},

		async selectFolder(side, droppedPath) {
			get().cancelTask();
			const version = inputVersion;
			const targetId = get().activeId;
			const documentId = get().sessions.find((session) => session.id === targetId)!.documentId;
			try {
				const path = await api.selectFolder(droppedPath);
				const current = get().sessions.find((session) => session.id === targetId && session.documentId === documentId);
				if (version !== inputVersion || !path || !current || current.entryKind !== 'folders') {
					return;
				}
				const folderPaths = { ...current.folderPaths, [side]: path };
				patchSession(context, targetId, { folderPaths });
				set({ error: '' });
				if (folderPaths.a && folderPaths.b) {
					await get().load('paths', [folderPaths.a, folderPaths.b], undefined, targetId);
				}
			} catch (reason) {
				if (version === inputVersion) {
					get().fail(reason);
				}
			}
		},

		async openFolderEntry(entry) {
			get().cancelTask();
			const version = inputVersion;
			if (entry.error) {
				get().fail(entry.error);
				return;
			}
			const targetId = get().activeId;
			const documentId = get().sessions.find((session) => session.id === targetId)!.documentId;
			try {
				const result = await api.readPaths([entry.left, entry.right].filter((path): path is string => !!path));
				if (result.files.length === 1) {
					if (result.files[0].kind === 'image') {
						throw new Error('这张图片只存在于一侧，请在 Finder 中查看原文件。');
					}
					const empty: SourceFile = { id: crypto.randomUUID(), name: '此侧不存在', kind: 'text', content: '', bytes: 0, bom: false, lineEnding: 'LF' };
					result.files = entry.left ? [result.files[0], empty] : [empty, result.files[0]];
				}
				if (version === inputVersion && get().sessions.some((session) => session.id === targetId && session.documentId === documentId)) {
					await accept(result, { targetId, version });
				}
			} catch (reason) {
				if (version === inputVersion) {
					get().fail(reason);
				}
			}
		},

		cancelTask() {
			inputVersion += 1;
			const task = get().busy;
			if (task) {
				set({ busy: null });
				api.cancel(task.id);
			}
		},

		updateProgress(taskId, count) {
			const busy = get().busy;
			if (busy?.id === taskId) {
				set({ busy: { ...busy, count } });
			}
		},
	};
}
