import { ArrowRight, Check, FilePenLine, Pencil, Redo2, Save, Undo2 } from 'lucide-react';
import { useActiveSession, useWorkspace, workspaceStore } from '@/state/workspace';
import { isDirty } from '@/state/session';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { IconButton } from '@/components/Primitives';

export function ResultControls() {
	const session = useActiveSession();
	const busy = useWorkspace((state) => !!state.busy);
	const { compare } = useEditorRuntime();
	const { startEditing, saveSession } = workspaceStore.getState();
	const dirty = isDirty(session);
	const saved = !!session.savedPath && !dirty;
	return (
		<div className="footer-result" role="group" aria-label="结果操作">
			<div className="footer-result-identity">
				{session.editing ? (
					<span
						className={`footer-result-state${dirty ? ' is-dirty' : saved ? ' is-saved' : ''}`}
						title={dirty ? '结果副本有未保存修改' : (session.savedPath ?? '正在编辑独立的结果副本')}
					>
						{dirty ? <span className="result-dirty-dot" /> : saved ? <Check size={13} /> : <FilePenLine size={13} />}
						{dirty ? '未保存' : saved ? '已保存' : '结果副本'}
					</span>
				) : (
					<button className="footer-create-result" aria-label="创建结果" disabled={busy} onClick={startEditing}>
						<Pencil size={13} />
						创建结果
					</button>
				)}
			</div>
			<span className="footer-divider" aria-hidden="true" />
			<button
				className="footer-use-a"
				aria-label="当前差异采用 A"
				title="当前差异采用 A"
				disabled={!session.editing || !session.stats.total || busy}
				onClick={() => compare.current?.useA()}
			>
				<ArrowRight size={14} />
				采用 A
			</button>
			<IconButton label="撤销编辑 ⌘Z" disabled={!session.editing || !session.stats.canUndo || busy} onClick={() => compare.current?.undo()}>
				<Undo2 size={15} />
			</IconButton>
			<IconButton label="重做编辑 ⌘⇧Z" disabled={!session.editing || !session.stats.canRedo || busy} onClick={() => compare.current?.redo()}>
				<Redo2 size={15} />
			</IconButton>
			<span className="footer-divider" aria-hidden="true" />
			<button className="footer-save-result" aria-label="另存结果" title="另存结果" disabled={!session.editing || busy} onClick={() => void saveSession(session.id)}>
				<Save size={14} />
				另存
			</button>
		</div>
	);
}
