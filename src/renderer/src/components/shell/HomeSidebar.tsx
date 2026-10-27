import { Settings2 } from 'lucide-react';
import { exampleFiles } from '../../../../shared/demo';
import { useWorkspace, workspaceStore } from '@/state/workspace';
import { hasSources } from '@/state/session';
import { HomeNavigation } from '@/components/Home';

export function HomeSidebar() {
	const activeCount = useWorkspace((state) => state.sessions.filter(hasSources).length);
	const homePage = useWorkspace((state) => state.homePage);
	const { addSession, acceptOpen, continueSession, openSettings, showHome, showUpdates, fail } = workspaceStore.getState();
	return (
		<aside className="sidebar" aria-label="欢迎页">
			<HomeNavigation
				page={homePage}
				onRecents={showHome}
				onUpdates={showUpdates}
				onNew={() => addSession()}
				onExample={() => void acceptOpen({ files: exampleFiles() }, undefined, true).catch(fail)}
				activeCount={activeCount}
				onContinue={continueSession}
			/>
			<div className="sidebar-bottom">
				<button className="sidebar-settings" aria-label="设置 ⌘," onClick={openSettings}>
					<Settings2 size={16} />
					设置
				</button>
			</div>
		</aside>
	);
}
