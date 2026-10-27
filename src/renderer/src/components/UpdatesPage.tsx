import { Fragment } from 'react';
import { version } from '../../../../package.json';
import { useAppUpdates } from '@/state/app-updates';
import { useWorkspace } from '@/state/workspace';
import { isDirty } from '@/state/session';

const notes = Object.entries(import.meta.glob<string>('../../../../docs/releases/*.md', { query: '?raw', import: 'default', eager: true }))
	.map(([path, contents]) => ({
		version: path.split('/').at(-1)!.replace('.md', ''),
		contents:
			contents
				.split(/^## (?:简体中文|中文)\s*$/m)[1]
				?.split(/^## /m)[0]
				?.trim() ?? '',
	}))
	.filter((note) => /^\d+\.\d+\.\d+$/.test(note.version) && note.contents)
	.sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }));

function InlineText({ text }: { text: string }) {
	return (
		<>
			{text
				.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
				.map((part, index) =>
					part.startsWith('**') ? (
						<strong key={index}>{part.slice(2, -2)}</strong>
					) : part.startsWith('`') ? (
						<code key={index}>{part.slice(1, -1)}</code>
					) : (
						<Fragment key={index}>{part}</Fragment>
					),
				)}
		</>
	);
}

export function UpdatesPage() {
	const state = useAppUpdates((store) => store.state);
	const dirty = useWorkspace((store) => store.sessions.some(isDirty));
	const busy = useWorkspace((store) => !!store.busy);
	const status =
		state.phase === 'downloaded' && dirty
			? '请先保存所有未保存的比较结果。'
			: state.phase === 'downloaded' && busy
				? '请等待当前任务完成后再安装。'
				: state.message && (!state.blocked || dirty || busy)
					? state.message
					: state.phase === 'current'
						? `当前 ${state.currentVersion} 已是最新版本`
						: state.phase === 'available'
							? `发现新版本 ${state.version}`
							: state.phase === 'downloaded'
								? `${state.version} 已下载`
								: state.phase === 'error'
									? '无法检查更新，请重试。'
									: '';
	return (
		<section className="updates-page" aria-label="更新日志">
			{status && (
				<div className={`update-status${state.phase === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
					{status}
				</div>
			)}
			{state.phase === 'downloading' && <progress className="update-progress" max={100} value={state.percent ?? 0} aria-label="更新下载进度" />}
			<div className="release-history">
				{notes.map((note) => (
					<article className="release-notes" key={note.version}>
						<div className="release-heading">
							<h1>
								Diffolio <span>{note.version}</span>
							</h1>
							{note.version === version && <span className="release-current">当前版本</span>}
						</div>
						{note.contents.split(/\n\s*\n/).map((block, index) =>
							block.startsWith('### ') ? (
								<h2 key={index}>{block.slice(4)}</h2>
							) : block.startsWith('- ') ? (
								<ul key={index}>
									{block.split('\n').map((line, item) => (
										<li key={item}>
											<InlineText text={line.replace(/^- /, '')} />
										</li>
									))}
								</ul>
							) : (
								<p key={index}>
									<InlineText text={block} />
								</p>
							),
						)}
					</article>
				))}
			</div>
		</section>
	);
}
