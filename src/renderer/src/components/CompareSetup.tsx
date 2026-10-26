import { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Clipboard, FilePlus2, FolderOpen, Image } from 'lucide-react';
import type { Preferences, SourceFile } from '../../../shared/types';
import { formatSize, IconButton } from './Primitives';
import { SourcePreview } from './SourcePreview';
import type { EntryKind, Side } from '../state/session';

interface Props {
	kind: EntryKind;
	a?: SourceFile;
	b?: SourceFile;
	folders?: Partial<Record<Side, string>>;
	busy: boolean;
	preferences: Preferences;
	onKind(kind: EntryKind): void;
	onChoose(side: Side): void;
	onPaste(side: Side): void;
	onDrop(side: Side, paths: string[]): void;
}

function FilePreview({ file, preferences, side }: { file: SourceFile; preferences: Preferences; side: Side }) {
	const [failed, setFailed] = useState(false);

	useEffect(() => setFailed(false), [file.id]);

	return file.kind === 'image' ? (
		<div className="source-image-preview">
			{failed ? <p role="alert">无法预览此图片，请更换文件。</p> : <img src={file.imageUrl} alt={file.name} onError={() => setFailed(true)} />}
		</div>
	) : (
		<div className="source-text-preview">
			<SourcePreview file={file} preferences={preferences} label={`${side.toUpperCase()} 内容预览`} />
			{!file.content && (
				<span className="source-empty-note">
					<Check size={14} />
					已加入空文本
				</span>
			)}
		</div>
	);
}

export function CompareSetup({ kind, a, b, folders, busy, preferences, onKind, onChoose, onPaste, onDrop }: Props) {
	const preview = kind === 'files' && !!(a || b);
	return (
		<section className={`compare-setup${preview ? ' is-preview' : ''}`} aria-label="新建比较">
			<div className="setup-heading">
				<h1>选择两个版本</h1>
				<p>{kind === 'folders' ? '分别选择文件夹，可以来自不同位置。' : '加入文本或图片，两个版本就绪后自动比较。'}</p>
			</div>
			<div className="setup-kind segmented" aria-label="比较类型">
				<button aria-pressed={kind === 'files'} onClick={() => onKind('files')} disabled={busy}>
					<FilePlus2 size={14} />
					文件或图片
				</button>
				<button aria-pressed={kind === 'folders'} onClick={() => onKind('folders')} disabled={busy}>
					<FolderOpen size={14} />
					文件夹
				</button>
			</div>
			<div className="input-pair">
				{(['a', 'b'] as const).map((side) => {
					const file = side === 'a' ? a : b;
					const path = folders?.[side];
					const selected = kind === 'folders' ? !!path : !!file;
					const name = kind === 'folders' ? path?.split('/').at(-1) : file?.name;
					const Icon = kind === 'folders' ? FolderOpen : file?.kind === 'image' ? Image : FilePlus2;
					return (
						<div
							className={`input-target${selected ? ' has-source' : ''}`}
							key={side}
							data-side={side}
							onDragOver={(event) => {
								if (event.dataTransfer.types.includes('Files')) {
									event.preventDefault();
									event.stopPropagation();
									event.currentTarget.dataset.dragover = 'true';
								}
							}}
							onDragLeave={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node)) {
									delete event.currentTarget.dataset.dragover;
								}
							}}
							onDrop={(event) => {
								event.preventDefault();
								event.stopPropagation();
								delete event.currentTarget.dataset.dragover;
								if (!busy) {
									onDrop(side, [...event.dataTransfer.files].map((item) => window.diffolio.filePath(item)).filter(Boolean));
								}
							}}
						>
							<div className="input-target-heading">
								<span className="side-tag">{side.toUpperCase()}</span>
								<span title={kind === 'folders' ? path : file?.path}>{preview && file ? file.name : side === 'a' ? '原始版本' : '对照版本'}</span>
								{selected && <Check size={12} aria-label="已加入" />}
								{preview && file && (
									<div className="source-header-actions">
										<small>{formatSize(file.bytes)}</small>
										<IconButton label={`选择${side.toUpperCase()}文件`} onClick={() => onChoose(side)} disabled={busy}>
											<FilePlus2 size={14} />
										</IconButton>
										<IconButton label={`从剪贴板加入${side.toUpperCase()}`} onClick={() => onPaste(side)} disabled={busy}>
											<Clipboard size={13} />
										</IconButton>
									</div>
								)}
							</div>
							{preview && file ? (
								<FilePreview file={file} preferences={preferences} side={side} />
							) : (
								<div className="source-body">
									<Icon size={28} strokeWidth={1.4} />
									<strong>{name ?? (preview ? `加入${side === 'a' ? '原始' : '对照'}版本` : kind === 'folders' ? '文件夹' : '文本或图片')}</strong>
									<span title={path}>{selected ? path : kind === 'folders' ? '将文件夹拖到这里，或从下方选择' : '将内容拖到这里，或选择文件'}</span>
									<div className="source-actions">
										<button
											className="source-choose"
											aria-label={`选择${side.toUpperCase()}${kind === 'folders' ? '文件夹' : '文件'}`}
											onClick={() => onChoose(side)}
											disabled={busy}
										>
											{selected ? '更换文件夹' : kind === 'folders' ? '选择文件夹' : '选择文件'}
										</button>
										{kind === 'files' && (
											<button className="paste-button" aria-label={`从剪贴板加入${side.toUpperCase()}`} onClick={() => onPaste(side)} disabled={busy}>
												<Clipboard size={12} />
												粘贴文本
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
				<ArrowLeftRight className="input-pair-symbol" size={17} aria-hidden="true" />
			</div>
			<p className="setup-hint">{kind === 'folders' ? '也可以将两个文件夹一起拖入窗口。' : '支持 UTF-8 文本、常见图片；原始文件保持只读。'}</p>
		</section>
	);
}
