import { useEffect, useState } from 'react';
import { FileDiff } from 'lucide-react';
import { useWorkspace, workspaceStore } from '@/state/workspace';
import { EditorRuntimeProvider } from '@/editor/EditorRuntime';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { WelcomeBackdrop } from '@/components/Home';
import { Titlebar } from '@/components/shell/Titlebar';
import { HomeSidebar } from '@/components/shell/HomeSidebar';
import { Workspace } from '@/components/Workspace';
import { SettingsDialog } from '@/components/SettingsDialog';

function AppWindow() {
	const home = useWorkspace((state) => state.home);
	const [dragging, setDragging] = useState(false);
	const { load } = workspaceStore.getState();
	useAppLifecycle();
	useEffect(() => {
		const drag = (event: Event) => setDragging((event as CustomEvent<boolean>).detail);
		const error = (event: Event) => workspaceStore.getState().fail((event as CustomEvent<string>).detail);
		window.addEventListener('diffolio-drag', drag);
		window.addEventListener('diffolio-error', error);
		return () => {
			window.removeEventListener('diffolio-drag', drag);
			window.removeEventListener('diffolio-error', error);
		};
	}, []);

	return (
		<div
			className={`app-shell${home ? ' is-home' : ''}`}
			onDropCapture={() => setDragging(false)}
			onDragOver={(event) => {
				event.preventDefault();
				if (event.dataTransfer.types.includes('Files')) {
					setDragging(true);
				}
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node)) {
					setDragging(false);
				}
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDragging(false);
				if (workspaceStore.getState().busy) {
					return;
				}
				const paths = [...event.dataTransfer.files].map((file) => window.diffolio.filePath(file)).filter(Boolean);
				if (paths.length) {
					void load('paths', paths);
				}
			}}
		>
			{home && <WelcomeBackdrop />}
			<Titlebar />
			<div className="app-body">
				{home && <HomeSidebar />}
				<Workspace />
			</div>
			{dragging && (
				<div className="drop-overlay">
					<FileDiff size={38} />
					<strong>松开文件，开始比较</strong>
					<span>两个文本、两张图片，或两个文件夹</span>
				</div>
			)}
			<SettingsDialog />
		</div>
	);
}

export function App() {
	return (
		<EditorRuntimeProvider>
			<AppWindow />
		</EditorRuntimeProvider>
	);
}
