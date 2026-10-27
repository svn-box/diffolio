import { useAppUpdates } from '../state/app-updates';
import { useWorkspace } from '../state/workspace';
import { isDirty } from '../state/session';

export function AppUpdateSection() {
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
					? '正在下载…'
					: state.phase === 'installing'
						? '正在安装…'
						: '检查更新';
	const description =
		state.phase === 'current'
			? `当前 ${state.currentVersion} 已是最新版本`
			: state.phase === 'available'
				? `发现新版本 ${state.version}`
				: state.phase === 'downloaded'
					? `${state.version} 已下载，重启后完成更新`
					: state.phase === 'downloading'
						? `正在下载 ${state.version} · ${Math.round(state.percent ?? 0)}%`
						: state.phase === 'installing'
							? '正在准备重启，请稍候…'
							: '手动检查，确认后下载和安装。';
	return (
		<section className="app-update-section" aria-label="应用更新">
			<h3>应用更新</h3>
			<div className="app-update-row">
				<p role="status" aria-live="polite">
					{state.message && (!state.blocked || dirty || busy) ? state.message : description}
				</p>
				<button
					className="subtle-button"
					disabled={pending || state.phase === 'disabled' || (downloaded && (dirty || busy))}
					onClick={() => void act(downloaded ? 'install' : available ? 'download' : 'check')}
				>
					{label}
				</button>
			</div>
			{state.phase === 'downloading' && <progress max={100} value={state.percent ?? 0} aria-label="更新下载进度" />}
			<div className="app-update-links">
				<span>{downloaded && dirty ? '请先保存所有未保存的比较结果。' : downloaded && busy ? '请等待当前任务完成后再安装。' : `当前版本 ${state.currentVersion}`}</span>
				<button onClick={() => void act('release')}>查看发布页</button>
			</div>
		</section>
	);
}
