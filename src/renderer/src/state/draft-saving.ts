import { isSideDirty, leaf, type Session, type Side } from '@/state/session';
import { patchDraft, type WorkspaceContext } from '@/state/workspace-state';

export async function saveDrafts(context: WorkspaceContext, target: Session, side?: Side): Promise<boolean> {
	const sides: Side[] = side ? [side] : (['a', 'b'] as const).filter((item) => isSideDirty(target, item));
	for (const item of sides) {
		if (!context.get().sessions.some((session) => session.id === target.id && session.documentId === target.documentId)) {
			return false;
		}
		const draft = target.drafts[item];
		const source = target[item];
		if (!source || !draft.editing) {
			continue;
		}
		try {
			const result = await context.api.save(draft.content, source);
			if (!result) {
				return false;
			}
			if (context.get().sessions.some((session) => session.id === target.id && session.documentId === target.documentId)) {
				patchDraft(context, target.id, item, { savedContent: draft.content, savedPath: result.path });
				context.set({ notice: `已保存 ${item.toUpperCase()} · ${leaf(result.path)}` });
			}
		} catch (reason) {
			context.get().fail(reason);
			return false;
		}
	}
	return true;
}
