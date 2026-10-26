import { ArrowLeft, Columns2, LayoutList, Info, Settings2, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useWorkspace, workspaceStore } from '../../state/workspace';
import { activeSession } from '../../state/workspace-state';
import { sessionTitle, sessionView } from '../../state/session';
import { IconButton } from '../Primitives';

export function Titlebar() {
	const { ready, paired, previewing, kind, title, folder, example, layout, total } = useWorkspace(
		useShallow((state) => {
			const session = activeSession(state);
			return { ...sessionView(session), title: sessionTitle(session), folder: session.folder, example: session.example, layout: session.layout, total: session.stats.total };
		}),
	);
	const home = useWorkspace((state) => state.home);
	const inspector = useWorkspace((state) => state.inspector);
	const busy = useWorkspace((state) => !!state.busy);
	const { showHome, setLayout, toggleInspector, setSettings, addSession } = workspaceStore.getState();
	return (
		<header className="titlebar">
			{!home && (
				<IconButton label="返回最近比较" onClick={showHome}>
					<ArrowLeft size={17} />
				</IconButton>
			)}
			<div className="window-heading">
				<strong>{home ? '最近比较' : ready || previewing ? title : '新建比较'}</strong>
				{!home && (ready || previewing) && (
					<span>
						{!ready
							? '等待另一个版本'
							: example
								? '示例比较'
								: folder
									? `${folder.entries.filter((item) => item.kind === 'file').length} 个文件`
									: kind === 'image'
										? '图片比较'
										: `${total} 处差异`}
					</span>
				)}
			</div>
			{!home && (
				<div className="titlebar-actions">
					{paired && kind === 'text' && (
						<div className="segmented">
							<IconButton label="双栏布局 ⌘1" active={layout === 'split'} onClick={() => setLayout('split')}>
								<Columns2 size={17} />
							</IconButton>
							<IconButton label="统一布局 ⌘2" active={layout === 'unified'} onClick={() => setLayout('unified')}>
								<LayoutList size={17} />
							</IconButton>
						</div>
					)}
					{ready && (
						<IconButton label="显示文件信息" active={inspector} onClick={toggleInspector}>
							<Info size={18} />
						</IconButton>
					)}
					<IconButton label="设置 ⌘," onClick={() => setSettings(true)}>
						<Settings2 size={17} />
					</IconButton>
					<div className="toolbar-divider" />
					<button className="open-button" aria-label="新建比较 ⌘N" onClick={() => addSession()} disabled={!!busy}>
						<Plus size={16} />
						<span>新建比较</span>
					</button>
				</div>
			)}
		</header>
	);
}
