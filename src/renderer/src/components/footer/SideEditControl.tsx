import { useRef, useState } from 'react';
import { Check, Redo2, Save, SquarePen, Undo2 } from 'lucide-react';
import { useActiveSession, useWorkspace, workspaceStore } from '@/state/workspace';
import { isSideDirty, type Side } from '@/state/session';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function SideEditControl({ side }: { side: Side }) {
	const session = useActiveSession();
	const busy = useWorkspace((state) => !!state.busy);
	const { compare } = useEditorRuntime();
	const [open, setOpen] = useState(false);
	const returnToEditor = useRef(false);
	const draft = session.drafts[side];
	const dirty = isSideDirty(session, side);
	const label = side.toUpperCase();
	const status = dirty ? '未保存' : draft.savedPath ? '已保存' : '副本';
	const canUndo = side === 'a' ? session.stats.canUndoA : session.stats.canUndo;
	const canRedo = side === 'a' ? session.stats.canRedoA : session.stats.canRedo;

	function history(action: 'undo' | 'redo'): void {
		returnToEditor.current = true;
		setOpen(false);
		compare.current?.[action](side);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(value) => {
				if (value && (!draft.editing || (side === 'a' && session.layout === 'unified'))) {
					compare.current?.edit(side);
				} else {
					if (value) {
						compare.current?.edit(side);
					}
					setOpen(value);
				}
			}}
		>
			<PopoverTrigger asChild>
				<button
					className={`icon-button footer-edit-button${draft.editing ? ' is-editing' : ''}`}
					data-side={side}
					data-dirty={dirty}
					aria-label={`编辑 ${label}`}
					aria-description={draft.editing ? `${label} 副本，${status}。再次点击打开操作菜单。` : `启用并聚焦 ${label} 副本编辑。`}
					title={draft.editing ? `${label} ${status} · 编辑操作` : `编辑 ${label} 副本`}
					disabled={busy}
				>
					<SquarePen size={15} />
					{dirty && <span className="side-dirty-dot" aria-hidden="true" />}
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="footer-edit-menu"
				side="top"
				align={side === 'a' ? 'start' : 'end'}
				aria-label={`${label} 编辑操作`}
				onCloseAutoFocus={(event) => {
					if (returnToEditor.current) {
						event.preventDefault();
						returnToEditor.current = false;
						compare.current?.edit(side);
					}
				}}
			>
				<div className="side-menu-heading">
					<strong>{label} 副本</strong>
					<span>
						{!dirty && draft.savedPath && <Check size={11} />}
						{status}
					</span>
				</div>
				<button
					onClick={() => {
						returnToEditor.current = true;
						setOpen(false);
					}}
				>
					<SquarePen size={13} />
					继续编辑 {label}
				</button>
				<button aria-label={`撤销 ${label}`} disabled={!canUndo || busy} onClick={() => history('undo')}>
					<Undo2 size={13} />
					撤销<span className="menu-key">⌘Z</span>
				</button>
				<button aria-label={`重做 ${label}`} disabled={!canRedo || busy} onClick={() => history('redo')}>
					<Redo2 size={13} />
					重做<span className="menu-key">⇧⌘Z</span>
				</button>
				<div className="side-menu-divider" />
				<button
					aria-label={`另存 ${label}`}
					disabled={busy}
					onClick={() => {
						setOpen(false);
						void workspaceStore.getState().saveSession(session.id, side);
					}}
				>
					<Save size={13} />
					另存 {label} 副本<span className="menu-key">⌘S</span>
				</button>
			</PopoverContent>
		</Popover>
	);
}
