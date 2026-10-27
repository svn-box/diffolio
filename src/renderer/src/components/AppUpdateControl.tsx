import { ExternalLink, LoaderCircle } from 'lucide-react';
import { useAppUpdates } from '@/state/app-updates';
import { useWorkspace } from '@/state/workspace';
import { isDirty } from '@/state/session';
import { IconButton } from '@/components/Primitives';

export function AppUpdateControl() {
	const state = useAppUpdates((store) => store.state);
	const act = useAppUpdates((store) => store.act);
	const dirty = useWorkspace((store) => store.sessions.some(isDirty));
	const busy = useWorkspace((store) => !!store.busy);
	const pending = ['checking', 'downloading', 'installing'].includes(state.phase);
	const downloaded = state.phase === 'downloaded';
	const available = !!state.version && ['available', 'error'].includes(state.phase);
	const label = downloaded
		? '重启并安装'
		: available
			? '下载更新'
			: state.phase === 'checking'
				? '正在检查…'
				: state.phase === 'downloading'
					? `正在下载 ${Math.round(state.percent ?? 0)}%`
					: state.phase === 'installing'
						? '正在安装…'
						: '检查更新';
	return (
		<div className="update-controls">
			<button
				className="update-check-button"
				disabled={pending || state.phase === 'disabled' || (downloaded && (dirty || busy))}
				onClick={() => void act(downloaded ? 'install' : available ? 'download' : 'check')}
			>
				{pending && <LoaderCircle size={13} className="spinning" />}
				{label}
			</button>
			<IconButton label="查看发布页" onClick={() => void act('release')}>
				<ExternalLink size={16} />
			</IconButton>
		</div>
	);
}
