import { useActiveSession, useWorkspace, workspaceStore } from '../state/workspace';
import { CompareSetup } from './CompareSetup';

export function EntryWorkspace() {
	const session = useActiveSession();
	const busy = useWorkspace((state) => !!state.busy);
	const preferences = useWorkspace((state) => state.preferences);
	const { setEntryKind, selectFolder, load, paste } = workspaceStore.getState();
	return (
		<CompareSetup
			kind={session.entryKind}
			a={session.a}
			b={session.b}
			folders={session.folderPaths}
			busy={busy}
			preferences={preferences}
			onKind={setEntryKind}
			onChoose={(side) => (session.entryKind === 'folders' ? void selectFolder(side) : void load('files', undefined, side))}
			onPaste={(side) => void paste(side)}
			onDrop={(side, paths) => {
				if (!paths.length) {
					return;
				}
				if (paths.length > 1) {
					void load('paths', paths);
				} else if (session.entryKind === 'folders') {
					void selectFolder(side, paths[0]);
				} else {
					void load('paths', paths, side);
				}
			}}
		/>
	);
}
