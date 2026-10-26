import { LoaderCircle, X } from 'lucide-react';
import { useWorkspace, workspaceStore } from '../../state/workspace';
import { IconButton } from '../Primitives';

export function WorkspaceMessages() {
	const error = useWorkspace((state) => state.error);
	const busy = useWorkspace((state) => state.busy);
	const { clearError, cancelTask } = workspaceStore.getState();
	return (
		<>
			{error && (
				<div className="message error" role="alert">
					<span>{error}</span>
					<IconButton label="关闭错误提示" onClick={clearError}>
						<X size={14} />
					</IconButton>
				</div>
			)}
			{busy && (
				<div className="message loading" role="status">
					<LoaderCircle size={15} className="spinning" />
					<span>
						{busy.label}
						{busy.count ? ` 已检查 ${busy.count} 项` : ''}
					</span>
					<button className="text-button" onClick={cancelTask}>
						取消
					</button>
				</div>
			)}
		</>
	);
}
