import { useWorkspace, workspaceStore } from '../state/workspace';
import { activeSession } from '../state/workspace-state';
import { sessionView } from '../state/session';
import { Home } from './Home';
import { SessionTabs } from './shell/SessionTabs';
import { WorkspaceMessages } from './shell/WorkspaceMessages';
import { EntryWorkspace } from './EntryWorkspace';
import { ComparisonWorkspace } from './ComparisonWorkspace';
import { Statusbar } from './Statusbar';

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
