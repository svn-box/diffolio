import { ArrowRight, ClipboardPlus, Clock3, Columns2, FileDiff, FilePlus2, FolderOpen, Image, Layers3, Plus, Sparkles } from 'lucide-react';
import type { RecentComparison } from '../../../shared/types';
import { Mark } from '@/components/Primitives';

export function WelcomeBackdrop() {
	return (
		<svg className="home-bands" viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
			{[150, 290, 430, 570, 710, 850].map((radius) => (
				<circle key={radius} cx="570" cy="15" r={radius} stroke="white" strokeWidth="63" opacity=".045" />
			))}
			<path d="M670 -100 1090 340H870L560-100ZM1020-100l420 440h-220L910-100Z" fill="white" opacity=".035" />
		</svg>
	);
}

export function HomeNavigation({
	page,
	onRecents,
	onUpdates,
	onNew,
	onExample,
	onContinue,
	activeCount,
}: {
	page: 'recents' | 'updates';
	onRecents(): void;
	onUpdates(): void;
	onNew(): void;
	onExample(): void;
	onContinue(): void;
	activeCount: number;
}) {
	return (
		<nav className="home-navigation" aria-label="欢迎页导航">
			<button className={page === 'recents' ? 'selected' : ''} aria-current={page === 'recents' ? 'page' : undefined} onClick={onRecents}>
				<Clock3 size={18} />
				<span>最近比较</span>
			</button>
			<button onClick={onNew}>
				<Plus size={18} />
				<span>新建比较</span>
				<kbd>⌘N</kbd>
			</button>
			{activeCount > 0 && (
				<button onClick={onContinue} aria-label="继续比较" aria-description={`${activeCount} 个进行中的比较`}>
					<Layers3 size={18} />
					<span>继续比较</span>
					<small>{activeCount}</small>
				</button>
			)}
			<div className="home-nav-separator" />
			<button onClick={onExample}>
				<Columns2 size={18} />
				<span>示例比较</span>
			</button>
			<button className={page === 'updates' ? 'selected' : ''} aria-current={page === 'updates' ? 'page' : undefined} onClick={onUpdates}>
				<Sparkles size={18} />
				<span>更新日志</span>
			</button>
		</nav>
	);
}

export function Home({
	recents,
	onNew,
	onFiles,
	onPaste,
	onRecent,
	onClear,
}: {
	recents: RecentComparison[];
	onNew(): void;
	onFiles(): void;
	onPaste(): void;
	onRecent(recent: RecentComparison): void;
	onClear(): void;
}) {
	return (
		<div className="welcome home-welcome">
			<div className="home-hero">
				<button className="home-drop" onClick={onNew}>
					<Mark size={54} />
					<strong>拖入即可比较</strong>
					<span>两个文件、两张图片，或两个文件夹</span>
				</button>
				<div className="home-quick-actions">
					<button onClick={onPaste} title="从剪贴板开始比较" aria-label="从剪贴板开始比较">
						<ClipboardPlus size={19} />
					</button>
					<span />
					<button onClick={onFiles} title="选择要比较的文件" aria-label="选择要比较的文件">
						<FilePlus2 size={19} />
					</button>
				</div>
			</div>
			<section className="home-recents" aria-label="最近的文件比较">
				{recents.length ? (
					<>
						<div className="home-recent-list">
							{recents.map((recent) => {
								const Icon = recent.kind === 'folder' ? FolderOpen : recent.kind === 'image' ? Image : FileDiff;
								const category = recent.kind === 'folder' ? '文件夹' : recent.kind === 'image' ? '图片' : '文本';
								return (
									<button key={recent.id} onClick={() => onRecent(recent)} title={recent.paths.join('\n')}>
										<Icon size={25} strokeWidth={1.4} />
										<span>
											<strong>{recent.name}</strong>
											<small>
												{category}比较 <i /> {new Date(recent.openedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
											</small>
										</span>
										<ArrowRight size={14} />
									</button>
								);
							})}
						</div>
						<button className="home-clear" onClick={onClear}>
							清空最近记录
						</button>
					</>
				) : (
					<div className="home-empty">
						<Clock3 size={26} strokeWidth={1.3} />
						<strong>还没有最近比较</strong>
						<p>拖入两个版本，或从左侧新建比较。</p>
					</div>
				)}
			</section>
		</div>
	);
}
