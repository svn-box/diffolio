import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Minus, Plus, Check, Pencil, Search, AlertTriangle, Link } from 'lucide-react';
import type { FolderComparison, FolderEntry } from '../../../shared/types';
import { formatSize } from './Primitives';

export function FolderCompare({ folder, onOpen }: { folder: FolderComparison; onOpen(entry: FolderEntry): void }) {
	const [query, setQuery] = useState('');
	const [differentOnly, setDifferentOnly] = useState(false);
	const [collapsed, setCollapsed] = useState(new Set<string>());
	const [scroll, setScroll] = useState(0);
	const viewport = useRef<HTMLDivElement>(null);
	const visible = useMemo(
		() =>
			folder.entries.filter(
				(entry) =>
					(!differentOnly || entry.status !== 'equal') &&
					(!query || entry.path.toLowerCase().includes(query.toLowerCase())) &&
					(query || ![...collapsed].some((path) => entry.path.startsWith(`${path}/`))),
			),
		[folder, differentOnly, query, collapsed],
	);
	const start = Math.max(0, Math.floor(scroll / 34) - 8);
	const end = Math.min(visible.length, start + Math.ceil((viewport.current?.clientHeight ?? 850) / 34) + 16);
	const statuses = { equal: '相同', modified: '已修改', left: '仅 A', right: '仅 B', error: '读取失败' };

	function activate(entry: FolderEntry): void {
		if (entry.kind === 'directory') {
			setCollapsed((previous) => {
				const next = new Set(previous);
				if (next.has(entry.path)) {
					next.delete(entry.path);
				} else {
					next.add(entry.path);
				}
				return next;
			});
		} else if (entry.kind === 'file') {
			onOpen(entry);
		}
	}

	return (
		<div className="folder-comparison">
			<div className="folder-controls">
				<label className="inline-search">
					<Search size={14} />
					<input
						aria-label="筛选文件名"
						placeholder="筛选文件名…"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setScroll(0);
							viewport.current?.scrollTo(0, 0);
						}}
					/>
				</label>
				<label className="check-label">
					<input type="checkbox" checked={differentOnly} onChange={(event) => setDifferentOnly(event.target.checked)} />
					只看差异
				</label>
				<span className="muted">{visible.length} 个条目 · 双击文件查看内容</span>
			</div>
			<div className="folder-column-head">
				<span>名称</span>
				<span>大小</span>
				<span>名称</span>
				<span>大小</span>
			</div>
			<div className="folder-scroll" ref={viewport} onScroll={(event) => setScroll(event.currentTarget.scrollTop)}>
				<div style={{ height: visible.length * 34, position: 'relative' }}>
					{visible.slice(start, end).map((entry, index) => {
						const Status =
							entry.status === 'equal'
								? Check
								: entry.status === 'modified'
									? Pencil
									: entry.status === 'left'
										? Minus
										: entry.status === 'right'
											? Plus
											: AlertTriangle;
						const FileIcon = entry.kind === 'directory' ? Folder : entry.kind === 'symlink' ? Link : File;
						const depth = entry.path.split('/').length - 1;
						return (
							<button
								key={entry.path}
								className={`folder-row ${entry.status}`}
								style={{ position: 'absolute', top: (index + start) * 34, width: '100%' }}
								onDoubleClick={() => {
									if (entry.kind === 'file') {
										activate(entry);
									}
								}}
								onClick={(event) => {
									if (entry.kind === 'directory' || event.detail === 0) {
										activate(entry);
									}
								}}
								title={entry.error ?? `${entry.path} · ${statuses[entry.status]}`}
							>
								{(['left', 'right'] as const).map((side) => (
									<span key={side} className={`folder-half ${entry[side] ? '' : 'missing'}`}>
										<span className="folder-name" style={{ paddingLeft: 12 + Math.min(depth, 8) * 16 }}>
											<Status size={12} className="status-symbol" />
											{entry.kind === 'directory' ? (
												collapsed.has(entry.path) ? (
													<ChevronRight size={13} />
												) : (
													<ChevronDown size={13} />
												)
											) : (
												<span className="tree-indent" />
											)}
											<FileIcon size={16} className={entry.kind === 'directory' ? 'folder-icon' : ''} />
											<span>{entry[side] ? entry.path.split('/').at(-1) : '—'}</span>
										</span>
										<span className="folder-size">
											{entry[side] && entry.kind !== 'directory' ? formatSize((side === 'left' ? entry.leftSize : entry.rightSize) ?? 0) : ''}
										</span>
									</span>
								))}
							</button>
						);
					})}
				</div>
				{visible.length === 0 && <div className="no-results">没有匹配的文件，试试调整筛选条件。</div>}
			</div>
		</div>
	);
}
