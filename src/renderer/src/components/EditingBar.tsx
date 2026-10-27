import { Pencil, ArrowRight, Undo2, Redo2, Save } from 'lucide-react';
import { useActiveSession, workspaceStore } from '@/state/workspace';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { IconButton } from '@/components/Primitives';

export function EditingBar() {
	const session = useActiveSession();
	const { compare } = useEditorRuntime();
	const { saveSession } = workspaceStore.getState();
	const stats = session.stats;
	if (!session.editing) {
		return null;
	}
	return (
		<div className="editing-bar">
			<Pencil size={13} />
			<span>正在编辑结果副本</span>
			<div className="editing-actions">
				<button className="subtle-button" disabled={!stats.total} onClick={() => compare.current?.useA()}>
					<ArrowRight size={13} />
					当前差异采用 A
				</button>
				<IconButton label="撤销编辑 ⌘Z" onClick={() => compare.current?.undo()}>
					<Undo2 size={15} />
				</IconButton>
				<IconButton label="重做编辑 ⌘⇧Z" onClick={() => compare.current?.redo()}>
					<Redo2 size={15} />
				</IconButton>
				<button className="primary-button" onClick={() => void saveSession(session.id)}>
					<Save size={13} />
					另存结果
				</button>
			</div>
		</div>
	);
}
