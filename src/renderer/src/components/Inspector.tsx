import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useActiveSession } from '@/state/workspace';
import { formatSize } from '@/components/Primitives';

export function Inspector() {
	const session = useActiveSession();
	return (
		<aside className="inspector">
			<h2>比较信息</h2>
			{session.folder ? (
				<>
					<h3>文件夹</h3>
					<p>{session.folder.entries.length} 个条目</p>
					<p>按内容校验文件</p>
				</>
			) : (
				[session.a!, session.b!].map((file, index) => (
					<section key={index}>
						<h3>
							<span className="side-tag">{index ? 'B' : 'A'}</span>
							{file.name}
						</h3>
						<dl>
							<dt>大小</dt>
							<dd>{formatSize(file.bytes)}</dd>
							<dt>类型</dt>
							<dd>{file.kind === 'image' ? '图片' : 'UTF-8 文本'}</dd>
							{file.kind === 'text' && (
								<>
									<dt>行数</dt>
									<dd>{file.content.split('\n').length}</dd>
									<dt>换行</dt>
									<dd>{file.lineEnding}</dd>
									<dt>BOM</dt>
									<dd>{file.bom ? '有' : '无'}</dd>
								</>
							)}
						</dl>
						{file.path && (
							<button className="text-button" onClick={() => void window.diffolio.reveal(file.path!)}>
								在 Finder 中显示
								<ArrowRight size={12} />
							</button>
						)}
					</section>
				))
			)}
			<div className="inspector-note">
				<LockKeyhole size={14} />
				<p>
					原始文件保持只读。
					<br />
					编辑内容另存为结果文件。
				</p>
			</div>
		</aside>
	);
}
