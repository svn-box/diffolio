import { Check, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useWorkspace, useActiveSession } from '@/state/workspace';
import { sessionView } from '@/state/session';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { IconButton } from '@/components/Primitives';
import { DisplayControls } from '@/components/footer/DisplayControls';
import { ResultControls } from '@/components/footer/ResultControls';

export function Statusbar() {
	const session = useActiveSession();
	const notice = useWorkspace((state) => state.notice);
	const { compare } = useEditorRuntime();
	const { paired, kind } = sessionView(session);
	if (!paired || kind !== 'text') {
		return (
			<footer className="statusbar">
				<ShieldCheck size={13} />
				<span>本地比较</span>
			</footer>
		);
	}
	const stats = session.stats;
	return (
		<footer className="statusbar text-statusbar" aria-label="文本比较工具栏">
			<DisplayControls />
			<ResultControls />
			<div className="footer-navigation" role="group" aria-label="差异导航">
				<span className="difference-count">{stats.total ? `${stats.current} / ${stats.total} 处差异` : '内容相同'}</span>
				<IconButton label="上一处差异" disabled={!stats.total} onClick={() => compare.current?.navigate(-1)}>
					<ChevronUp size={17} />
				</IconButton>
				<IconButton label="下一处差异" disabled={!stats.total} onClick={() => compare.current?.navigate(1)}>
					<ChevronDown size={17} />
				</IconButton>
			</div>
			{notice && (
				<div className="save-notice" role="status">
					<Check size={14} />
					<span>{notice}</span>
				</div>
			)}
		</footer>
	);
}
