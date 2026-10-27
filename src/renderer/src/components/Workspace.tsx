import { useWorkspace, workspaceStore } from '@/state/workspace';
import { activeSession } from '@/state/workspace-state';
import { sessionView } from '@/state/session';
import { Home } from '@/components/Home';
import { SessionTabs } from '@/components/shell/SessionTabs';
import { WorkspaceMessages } from '@/components/shell/WorkspaceMessages';
import { EntryWorkspace } from '@/components/EntryWorkspace';
import { ComparisonWorkspace } from '@/components/ComparisonWorkspace';
import { Statusbar } from '@/components/Statusbar';

function WelcomeWorkspace() {
	const recents = useWorkspace((state) => state.recents);
	const { addSession, load, paste, clearRecents } = workspaceStore.getState();
	return (
		<Home
			recents={recents}
			onNew={() => addSession()}
			onFiles={() => void load('files')}
			onPaste={() => void paste()}
			onRecent={(recent) => void load('paths', recent.paths)}
			onClear={() => void clearRecents()}
		/>
	);
}

export function Workspace() {
	const home = useWorkspace((state) => state.home);
	const ready = useWorkspace((state) => sessionView(activeSession(state)).ready);
	return (
		<main className="workspace">
			{!home && <SessionTabs />}
			<WorkspaceMessages />
			{home ? <WelcomeWorkspace /> : !ready ? <EntryWorkspace /> : <ComparisonWorkspace />}
			{!home && ready && <Statusbar />}
		</main>
	);
}
