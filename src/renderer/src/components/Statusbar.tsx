import { Search, WrapText, ListFilter, ShieldCheck, Check, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { useWorkspace, useActiveSession, workspaceStore } from '../state/workspace';
import { sessionView } from '../state/session';
import { useEditorRuntime } from '../editor/EditorRuntime';
import { IconButton } from './Primitives';

export function Statusbar() {
	const session = useActiveSession();
	const preferences = useWorkspace((state) => state.preferences);
	const notice = useWorkspace((state) => state.notice);
	const { compare } = useEditorRuntime();
	const { setPreference, startEditing } = workspaceStore.getState();
	const { paired, kind } = sessionView(session);
	const stats = session.stats;
	return (
		<footer className="statusbar">
			<div className="status-left">
				{paired && kind === 'text' ? (
					<>
						<IconButton label="查找 ⌘F" onClick={() => compare.current?.find()}>
							<Search size={14} />
						</IconButton>
						<IconButton label="长行自动换行" active={preferences.wrap} onClick={() => void setPreference({ wrap: !preferences.wrap })}>
							<WrapText size={15} />
						</IconButton>
						<IconButton label="折叠不变区域" active={preferences.collapse} onClick={() => void setPreference({ collapse: !preferences.collapse })}>
							<ListFilter size={14} />
						</IconButton>
						<span className="status-divider" />
						<span>UTF-8{session.b?.bom ? ' BOM' : ''}</span>
						<span>{session.b?.lineEnding}</span>
					</>
				) : (
					<>
						<ShieldCheck size={13} />
						<span>本地比较</span>
					</>
				)}
			</div>
			<div className="status-center">
				{notice ? (
					<span className="save-notice" role="status">
						<Check size={13} />
						{notice}
					</span>
				) : paired && kind === 'text' ? (
					<div className="diff-summary">
						<span className="added">
							<i />
							{stats.added} 新增
						</span>
						<span className="deleted">
							<i />
							{stats.deleted} 删除
						</span>
						<span className="modified">
							<i />
							{stats.modified} 修改
						</span>
					</div>
				) : null}
			</div>
			<div className="status-right">
				{paired && kind === 'text' && (
					<>
						{!session.editing && (
							<button className="text-button create-result" onClick={() => startEditing()}>
								<Pencil size={12} />
								创建结果
							</button>
						)}
						<span>{stats.total ? `${stats.current} / ${stats.total} 处差异` : '内容相同'}</span>
						<IconButton label="上一处差异" disabled={!stats.total} onClick={() => compare.current?.navigate(-1)}>
							<ArrowUp size={15} />
						</IconButton>
						<IconButton label="下一处差异" disabled={!stats.total} onClick={() => compare.current?.navigate(1)}>
							<ArrowDown size={15} />
						</IconButton>
					</>
				)}
			</div>
		</footer>
	);
}
