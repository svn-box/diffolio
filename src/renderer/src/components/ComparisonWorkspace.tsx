import { useActiveSession, useWorkspace, workspaceStore } from '@/state/workspace';
import { sessionView } from '@/state/session';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { Pathbar } from '@/components/Pathbar';
import { FolderCompare } from '@/components/FolderCompare';
import { ImageCompare } from '@/components/ImageCompare';
import { TextCompare } from '@/components/TextCompare';
import { Inspector } from '@/components/Inspector';
import { Statusbar } from '@/components/Statusbar';

export function ComparisonWorkspace() {
	const session = useActiveSession();
	const preferences = useWorkspace((state) => state.preferences);
	const inspector = useWorkspace((state) => state.inspector);
	const { compare, snapshots } = useEditorRuntime();
	const { startEditing, changeContent, updateStats, openFolderEntry } = workspaceStore.getState();
	const { kind } = sessionView(session);
	return (
		<>
			<Pathbar />
			<div className="content-area">
				<div className="content-main">
					<div className="comparison-document">
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
								content={{ a: session.drafts.a.content, b: session.drafts.b.content }}
								editing={{ a: session.drafts.a.editing, b: session.drafts.b.editing }}
								layout={session.layout}
								preferences={preferences}
								snapshots={snapshots}
								onEdit={startEditing}
								onChange={(side, content) => changeContent(session.id, session.documentId, content, side)}
								onStats={(stats) => updateStats(session.id, session.documentId, stats)}
							/>
						)}
					</div>
					<Statusbar />
				</div>
				{inspector && <Inspector />}
			</div>
		</>
	);
}
