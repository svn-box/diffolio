import { MoreHorizontal, Play } from 'lucide-react';
import { useActiveSession, useWorkspace } from '@/state/workspace';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { IconButton } from '@/components/Primitives';
import { SideEditControl } from '@/components/footer/SideEditControl';

export function ResultControls() {
	const session = useActiveSession();
	const busy = useWorkspace((state) => !!state.busy);
	const { compare } = useEditorRuntime();
	const disabled = !session.stats.total || busy;
	const reverseDisabled = disabled || session.layout === 'unified';
	return (
		<div className="footer-result" role="group" aria-label="块操作">
			<SideEditControl side="a" />
			<IconButton label="Keep Both (A then B)" title="保留双方：A 在前、B 在后，写入 B 副本" disabled={disabled} onClick={() => compare.current?.merge('keep-a-b')}>
				<MoreHorizontal size={15} />
			</IconButton>
			<IconButton label="Copy A to B" title="复制当前差异 A → B" disabled={disabled} onClick={() => compare.current?.merge('copy-a-b')}>
				<Play size={13} fill="currentColor" />
			</IconButton>
			<IconButton
				label="Copy B to A"
				title={session.layout === 'unified' ? '切换双栏后复制 B → A' : '复制当前差异 B → A'}
				disabled={reverseDisabled}
				onClick={() => compare.current?.merge('copy-b-a')}
			>
				<Play size={13} fill="currentColor" className="reverse-merge-icon" />
			</IconButton>
			<IconButton
				label="Keep Both (B then A)"
				title="保留双方：B 在前、A 在后，写入 A 副本（双栏）"
				disabled={reverseDisabled}
				onClick={() => compare.current?.merge('keep-b-a')}
			>
				<MoreHorizontal size={15} />
			</IconButton>
			<SideEditControl side="b" />
		</div>
	);
}
