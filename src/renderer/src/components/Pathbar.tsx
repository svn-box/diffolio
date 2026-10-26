import { Pencil, Folder, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useActiveSession, workspaceStore } from '../state/workspace';
import { leaf, sessionView } from '../state/session';
import { IconButton, formatSize } from './Primitives';

export function Pathbar() {
	const session = useActiveSession();
	const { kind } = sessionView(session);
	const { swapSources } = workspaceStore.getState();
	return (
		<div className={`pathbar ${session.layout === 'unified' && kind === 'text' ? 'unified' : ''}`}>
			{(['a', 'b'] as const).map((side) => {
				const file = session[side];
				const path = session.folder ? (side === 'a' ? session.folder.left : session.folder.right) : file?.path;
				return (
					<div key={side} className="path-half">
						<span className={`side-tag ${session.editing && side === 'b' ? 'result-tag' : ''}`}>
							{session.editing && side === 'b' ? <Pencil size={11} /> : side.toUpperCase()}
						</span>
						<Folder size={13} />
						<span className="path-parent" title={path}>
							{path ? path.split('/').slice(0, -1).at(-1) : session.example ? '示例' : '文本片段'}
						</span>
						<ChevronDown size={10} className="path-chevron" />
						<strong title={path ?? file?.name}>{session.folder ? leaf(path!) : session.editing && side === 'b' ? `${file!.name} · 结果` : file?.name}</strong>
						{file && <span className="path-size">{formatSize(file.bytes)}</span>}
					</div>
				);
			})}
			{kind === 'text' && (
				<IconButton label="交换 A 和 B" disabled={session.editing} onClick={swapSources}>
					<ArrowLeftRight size={13} />
				</IconButton>
			)}
		</div>
	);
}
