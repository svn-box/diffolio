import { Settings2 } from 'lucide-react';
import { exampleFiles } from '../../../../shared/demo';
import { useWorkspace, workspaceStore } from '@/state/workspace';
import { hasSources } from '@/state/session';
import { HomeNavigation } from '@/components/Home';
import { IconButton, Mark } from '@/components/Primitives';

export function HomeSidebar() {
	const activeCount = useWorkspace((state) => state.sessions.filter(hasSources).length);
	const { addSession, acceptOpen, continueSession, setSettings, fail } = workspaceStore.getState();
	return (
		<aside className="sidebar" aria-label="欢迎页">
			<HomeNavigation
				onNew={() => addSession()}
				onExample={() => void acceptOpen({ files: exampleFiles() }, undefined, true).catch(fail)}
				activeCount={activeCount}
				onContinue={continueSession}
			/>
			<div className="sidebar-bottom">
				<span>
					<Mark size={15} />
					Diffolio
				</span>
				<IconButton label="设置 ⌘," onClick={() => setSettings(true)}>
					<Settings2 size={16} />
				</IconButton>
			</div>
		</aside>
	);
}
