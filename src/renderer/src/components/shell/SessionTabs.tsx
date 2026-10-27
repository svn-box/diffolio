import { FileDiff, X, Plus } from 'lucide-react';
import { useWorkspace, useActiveSession, workspaceStore } from '@/state/workspace';
import { sessionTitle, isDirty } from '@/state/session';
import { IconButton } from '@/components/Primitives';

export function SessionTabs() {
	const sessions = useWorkspace((state) => state.sessions);
	const session = useActiveSession();
	const { activateSession, closeSession, addSession } = workspaceStore.getState();
	if (sessions.length < 2) {
		return null;
	}
	return (
		<div className="tabbar">
			<div className="tabs" role="tablist" aria-label="比较会话">
				{sessions.map((item) => (
					<div key={item.id} className={`tab ${item.id === session.id ? 'selected' : ''}`}>
						<button
							role="tab"
							aria-selected={item.id === session.id}
							onClick={() => {
								activateSession(item.id);
							}}
						>
							<FileDiff size={14} />
							<span>{sessionTitle(item)}</span>
							{item.example && <small>示例</small>}
							{isDirty(item) && <i className="dirty-dot" />}
						</button>
						<IconButton label={`关闭 ${sessionTitle(item)}`} onClick={() => void closeSession(item.id)}>
							<X size={12} />
						</IconButton>
					</div>
				))}
			</div>
			<IconButton label="添加比较" onClick={() => addSession()}>
				<Plus size={16} />
			</IconButton>
		</div>
	);
}
