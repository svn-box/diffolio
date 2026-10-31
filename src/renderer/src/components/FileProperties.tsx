import { useId, useState } from 'react';
import { ArrowUpRight, Info } from 'lucide-react';
import { useActiveSession, workspaceStore } from '@/state/workspace';
import { IconButton } from '@/components/Primitives';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { propertyRows } from '@/components/file-properties';

export function FileProperties() {
	const session = useActiveSession();
	const [open, setOpen] = useState(false);
	const title = useId();
	const paths = session.folder ? [session.folder.left, session.folder.right] : [session.a?.path, session.b?.path];
	const rows = propertyRows(session);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<IconButton label="显示文件信息" active={open}>
					<Info size={18} />
				</IconButton>
			</PopoverTrigger>
			<PopoverContent className="file-properties" side="bottom" align="end" sideOffset={10} collisionPadding={12} aria-labelledby={title}>
				<PopoverArrow className="file-properties-arrow" width={14} height={7} />
				<h2 id={title}>文件属性</h2>
				<div className="property-table-scroll">
					<table aria-label="原始文件属性对照">
						<colgroup>
							<col className="property-label-column" />
							<col />
							<col />
						</colgroup>
						<thead>
							<tr>
								<th scope="col">
									<span className="property-sr-only">属性</span>
								</th>
								<th scope="col">
									<span className="side-tag">A</span>
								</th>
								<th scope="col">
									<span className="side-tag">B</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const different = row.a !== '—' && row.b !== '—' && row.a !== row.b;
								return (
									<tr key={row.label} className={row.mono ? 'property-mono' : undefined}>
										<th scope="row">{row.label}</th>
										<td className={different ? 'property-different' : undefined} title={row.a} aria-label={different ? `${row.a}，与 B 不同` : undefined}>
											{row.a}
										</td>
										<td title={row.b}>{row.b}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				{paths.some(Boolean) && (
					<div className="property-actions">
						<span />
						{paths.map((path, index) => (
							<button
								key={index}
								className="text-button"
								aria-label={`${index ? 'B' : 'A'}：在 Finder 中显示`}
								title={path}
								disabled={!path}
								onClick={() => {
									if (path) {
										void window.diffolio.reveal(path).catch((error) => {
											setOpen(false);
											workspaceStore.getState().fail(error);
										});
									}
								}}
							>
								在 Finder 中显示
								<ArrowUpRight size={12} />
							</button>
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
