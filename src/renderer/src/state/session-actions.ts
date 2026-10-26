import { emptyStats } from '../editor/types';
import { hasSources, isDirty, leaf, newSession, sessionView, type Session } from './session';
import { activeSession, patchSession, type WorkspaceContext, type WorkspaceState } from './workspace-state';

async function save(context: WorkspaceContext, target: Session): Promise<boolean> {
	const { api, get, set } = context;
	if (!target.b || !target.editing) {
		return true;
	}
	try {
		const result = await api.save(target.content, target.b);
		if (!result) {
			return false;
		}
		if (get().sessions.some((session) => session.id === target.id && session.documentId === target.documentId)) {
			patchSession(context, target.id, { savedContent: target.content, savedPath: result.path });
			set({ notice: `已保存 ${leaf(result.path)}` });
		}
		return true;
	} catch (reason) {
		get().fail(reason);
		return false;
	}
}

export async function permitClose(context: WorkspaceContext, targets: Session[]): Promise<boolean> {
	const changed = targets.filter(isDirty);
	if (changed.length) {
		const choice = await context.api.confirmUnsaved();
		if (choice === 'cancel') {
			return false;
		}
		if (choice === 'save') {
			for (const target of changed) {
				if (!(await save(context, target))) {
					return false;
				}
			}
		}
	}
	// A native dialog may finish after the user has edited or replaced its target.
	return targets.every((target) =>
		context.get().sessions.some((session) => session.id === target.id && session.documentId === target.documentId && session.content === target.content),
	);
}

type SessionActions = Pick<
	WorkspaceState,
	| 'addSession'
	| 'activateSession'
	| 'continueSession'
	| 'showHome'
	| 'setEntryKind'
	| 'setLayout'
	| 'startEditing'
	| 'swapSources'
	| 'changeContent'
	| 'updateStats'
	| 'saveSession'
	| 'closeSession'
	| 'closeWindow'
>;

export function createSessionActions(context: WorkspaceContext): SessionActions {
	const { get, set, api } = context;
	return {
		addSession(entryKind = 'files') {
			const empty = get().sessions.find((session) => !hasSources(session));
			const next = empty ? { ...empty, entryKind } : newSession(entryKind);
			set((state) => ({
				sessions: empty ? state.sessions.map((session) => (session.id === next.id ? next : session)) : [...state.sessions, next],
				activeId: next.id,
				home: false,
				error: '',
			}));
			return next.id;
		},

		activateSession(id) {
			if (get().sessions.some((session) => session.id === id)) {
				set({ activeId: id, home: false });
			}
		},

		continueSession() {
			const current = activeSession(get());
			const previous = hasSources(current) ? current : get().sessions.findLast(hasSources);
			if (previous) {
				get().activateSession(previous.id);
			}
		},

		showHome() {
			set({ home: true, error: '' });
		},

		setEntryKind(entryKind) {
			get().cancelTask();
			patchSession(context, get().activeId, { entryKind });
			set({ error: '' });
		},

		setLayout(layout) {
			patchSession(context, get().activeId, { layout });
		},

		startEditing() {
			const current = activeSession(get());
			if (sessionView(current).paired && current.b?.kind === 'text') {
				patchSession(context, current.id, { editing: true });
			}
		},

		swapSources() {
			const current = activeSession(get());
			if (current.editing || !current.a || !current.b || current.a.kind !== 'text') {
				return;
			}
			patchSession(context, current.id, {
				documentId: crypto.randomUUID(),
				a: current.b,
				b: current.a,
				content: current.a.content,
				savedContent: current.a.content,
				stats: emptyStats,
			});
		},

		changeContent(id, documentId, content) {
			if (get().sessions.some((session) => session.id === id && session.documentId === documentId && session.editing)) {
				patchSession(context, id, { content });
			}
		},

		updateStats(id, documentId, stats) {
			const current = get().sessions.find((session) => session.id === id && session.documentId === documentId);
			if (current && (Object.keys(stats) as (keyof typeof stats)[]).some((key) => stats[key] !== current.stats[key])) {
				patchSession(context, id, { stats });
			}
		},

		async saveSession(id) {
			const target = get().sessions.find((session) => session.id === id);
			return target ? save(context, target) : false;
		},

		async closeSession(id) {
			try {
				const target = get().sessions.find((session) => session.id === id);
				if (!target || !(await permitClose(context, [target]))) {
					return;
				}
				const remaining = get().sessions.filter((session) => session.id !== id);
				const home = !remaining.length;
				if (home) {
					remaining.push(newSession());
				}
				set((state) => ({ sessions: remaining, activeId: state.activeId === id ? remaining.at(-1)!.id : state.activeId, home: home || state.home }));
			} catch (reason) {
				get().fail(reason);
			}
		},

		async closeWindow() {
			try {
				const targets = get().sessions;
				if ((await permitClose(context, targets)) && !get().sessions.some((session) => isDirty(session) && !targets.some((target) => target.id === session.id))) {
					api.close();
				}
			} catch (reason) {
				get().fail(reason);
			}
		},
	};
}
