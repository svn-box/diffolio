import { ChevronUp, ListFilter, Search, WrapText } from 'lucide-react';
import { useActiveSession, useWorkspace, workspaceStore } from '@/state/workspace';
import { useEditorRuntime } from '@/editor/EditorRuntime';
import { IconButton } from '@/components/Primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DisplayControls() {
	const session = useActiveSession();
	const preferences = useWorkspace((state) => state.preferences);
	const { setPreference } = workspaceStore.getState();
	const { compare } = useEditorRuntime();
	return (
		<div className="footer-display" role="group" aria-label="显示选项">
			<IconButton label="查找 ⌘F" onClick={() => compare.current?.find()}>
				<Search size={15} />
			</IconButton>
			<IconButton label="长行自动换行" active={preferences.wrap} onClick={() => void setPreference({ wrap: !preferences.wrap })}>
				<WrapText size={16} />
			</IconButton>
			<IconButton label="折叠不变区域" active={preferences.collapse} onClick={() => void setPreference({ collapse: !preferences.collapse })}>
				<ListFilter size={15} />
			</IconButton>
			<span className="footer-divider" aria-hidden="true" />
			<Popover>
				<PopoverTrigger asChild>
					<button className="footer-overview-trigger" aria-label="比较概览" title="差异统计与文本格式">
						概览
						<ChevronUp size={12} />
					</button>
				</PopoverTrigger>
				<PopoverContent className="footer-overview" side="top" align="start" aria-label="比较概览">
					<h3>差异统计</h3>
					<div className="diff-summary">
						<span className="added">{session.stats.added} 新增</span>
						<span className="deleted">{session.stats.deleted} 删除</span>
						<span className="modified">{session.stats.modified} 修改</span>
					</div>
					<dl className="footer-format-list">
						{[session.a!, session.b!].map((file, index) => (
							<div key={index}>
								<dt>{index ? 'B' : 'A'}</dt>
								<dd>
									UTF-8{file.bom ? ' BOM' : ''}
									<span>{file.lineEnding}</span>
								</dd>
							</div>
						))}
					</dl>
				</PopoverContent>
			</Popover>
		</div>
	);
}
