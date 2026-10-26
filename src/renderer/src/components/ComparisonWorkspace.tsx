import { useActiveSession, useWorkspace, workspaceStore } from '../state/workspace';
import { sessionView } from '../state/session';
import { useEditorRuntime } from '../editor/EditorRuntime';
import { Pathbar } from './Pathbar';
import { FolderCompare } from './FolderCompare';
import { ImageCompare } from './ImageCompare';
import { TextCompare } from './TextCompare';
import { Inspector } from './Inspector';
import { EditingBar } from './EditingBar';

export function ComparisonWorkspace() {
	const session = useActiveSession();
	const preferences = useWorkspace((state) => state.preferences);
	const inspector = useWorkspace((state) => state.inspector);
	const { compare, snapshots } = useEditorRuntime();
	const { changeContent, updateStats, openFolderEntry } = workspaceStore.getState();
	const { kind } = sessionView(session);
	return (
		<>
			<Pathbar />
			<div className="content-area">
				<div className="content-main">
					{session.folder ? (
						<FolderCompare key={session.documentId} folder={session.folder} onOpen={(entry) => void openFolderEntry(entry)} />
					) : kind === 'image' ? (
						<ImageCompare key={session.documentId} a={session.a!} b={session.b!} />
					) : (
						<TextCompare
							key={session.documentId}
							ref={compare}
							id={session.documentId}
							a={session.a!}
							b={session.b!}
							content={session.content}
							editing={session.editing}
							layout={session.layout}
							preferences={preferences}
							snapshots={snapshots}
							onChange={(content) => changeContent(session.id, session.documentId, content)}
							onStats={(stats) => updateStats(session.id, session.documentId, stats)}
						/>
					)}
				</div>
				{inspector && <Inspector />}
			</div>
			<EditingBar />
		</>
	);
}
