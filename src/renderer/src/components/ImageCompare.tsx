import { useEffect, useRef, useState } from 'react';
import { Columns2, SquareSplitHorizontal, Minus, Plus } from 'lucide-react';
import type { SourceFile } from '../../../shared/types';
import { IconButton } from './Primitives';

export function ImageCompare({ a, b }: { a: SourceFile; b: SourceFile }) {
	const [mode, setMode] = useState('split');
	const [amount, setAmount] = useState(50);
	const [zoom, setZoom] = useState(0);
	const [sizes, setSizes] = useState<{ width: number; height: number }[]>([]);
	const halves = useRef<(HTMLDivElement | null)[]>([]);
	const pendingScroll = useRef(new WeakMap<HTMLElement, { left: number; top: number }>());

	function syncScroll(from: HTMLDivElement, to: HTMLDivElement | null | undefined): void {
		const expected = pendingScroll.current.get(from);
		pendingScroll.current.delete(from);
		if (!to || (expected?.left === from.scrollLeft && expected.top === from.scrollTop)) {
			return;
		}
		if (to.scrollLeft !== from.scrollLeft || to.scrollTop !== from.scrollTop) {
			to.scrollTo({ left: from.scrollLeft, top: from.scrollTop });
			// Ignore the resulting scroll event, including offsets clamped by a smaller image.
			pendingScroll.current.set(to, { left: to.scrollLeft, top: to.scrollTop });
		}
	}

	useEffect(() => {
		let active = true;
		void Promise.all(
			[a, b].map(
				(file) =>
					new Promise<{ width: number; height: number }>((resolve) => {
						const image = new window.Image();
						image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
						image.onerror = () => resolve({ width: 0, height: 0 });
						image.src = file.imageUrl!;
					}),
			),
		).then((values) => {
			if (active) {
				setSizes(values);
			}
		});
		return () => {
			active = false;
		};
	}, [a, b]);

	const matching = sizes.length === 2 && sizes[0].width > 0 && sizes[0].width === sizes[1].width && sizes[0].height === sizes[1].height;
	const failed = sizes.some((size) => !size.width);
	return (
		<div className="image-comparison">
			<div className="image-controls">
				<div className="segmented">
					<IconButton label="图片并排" active={mode === 'split'} onClick={() => setMode('split')}>
						<Columns2 size={16} />
					</IconButton>
					<IconButton label="图片分割" disabled={!matching} active={mode === 'wipe'} onClick={() => setMode('wipe')}>
						<SquareSplitHorizontal size={16} />
					</IconButton>
				</div>
				<span>共享缩放</span>
				<IconButton label="缩小图片" disabled={zoom === 25} onClick={() => setZoom(zoom ? Math.max(25, zoom - 25) : 75)}>
					<Minus size={14} />
				</IconButton>
				<button className="zoom-reset" onClick={() => setZoom(0)}>
					{zoom ? `${zoom}%` : '适应'}
				</button>
				<IconButton label="放大图片" disabled={zoom >= 200} onClick={() => setZoom(zoom ? Math.min(200, zoom + 25) : 100)}>
					<Plus size={14} />
				</IconButton>
				{mode === 'wipe' && (
					<label className="wipe-control">
						A<input aria-label="图片分割位置" type="range" min="0" max="100" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />B
					</label>
				)}
			</div>
			{failed ? (
				<div className="no-results" role="alert">
					无法解码这张图片，请确认文件格式与内容一致。
				</div>
			) : (
				<>
					{sizes.length === 2 && !matching && <div className="message loading">两张图片尺寸不同，仅提供并排查看，避免分割时误对齐。</div>}
					<div className={`image-stage ${mode}`}>
						{mode === 'split' ? (
							[a, b].map((file, index) => (
								<div
									className="image-half"
									key={file.id}
									ref={(element) => {
										halves.current[index] = element;
									}}
									onScroll={(event) => syncScroll(event.currentTarget, halves.current[1 - index])}
								>
									<img
										src={file.imageUrl}
										alt={file.name}
										style={{ width: zoom ? ((sizes[index]?.width ?? 800) * zoom) / 100 : 'auto', maxWidth: zoom ? 'none' : '100%' }}
									/>
								</div>
							))
						) : (
							<div className="wipe-stage" style={{ width: zoom ? (sizes[0].width * zoom) / 100 : sizes[0]?.width, maxWidth: zoom ? 'none' : 'calc(100% - 70px)' }}>
								<img src={b.imageUrl} alt={`B · ${b.name}`} />
								<img className="wipe-original" src={a.imageUrl} alt={`A · ${a.name}`} style={{ clipPath: `inset(0 ${100 - amount}% 0 0)` }} />
								<span className="wipe-divider" style={{ left: `${amount}%` }} />
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
