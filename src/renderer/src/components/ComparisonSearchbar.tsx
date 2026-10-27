import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Search, SlidersHorizontal } from 'lucide-react';
import { ComparisonSearch, type ComparisonSearchState } from '../editor/comparison-search';
import { IconButton } from './Primitives';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function ComparisonSearchbar({ state, controller, unified }: { state: ComparisonSearchState; controller: ComparisonSearch; unified: boolean }) {
	const input = useRef<HTMLInputElement>(null);
	useEffect(() => {
		input.current?.focus();
		input.current?.select();
	}, [state.focus]);
	const side = state.side.toUpperCase();
	const status = !state.text
		? '输入关键词'
		: state.invalid
			? '正则表达式无效'
			: !state.total
				? `${side} 中无匹配项`
				: state.limited
					? '超过 10,000 处匹配'
					: `${state.current || '—'} / ${state.total} 处匹配`;
	return (
		<div
			className="comparison-searchbar"
			role="search"
			aria-label="比较内搜索"
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					controller.close();
				}
				if ((event.key === 'Enter' && event.target === input.current) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g')) {
					event.preventDefault();
					controller.navigate(event.shiftKey ? -1 : 1);
				}
			}}
		>
			<label className="comparison-search-field">
				<Search size={13} aria-hidden="true" />
				<input
					ref={input}
					type="text"
					aria-label="搜索比较内容"
					placeholder="搜索"
					value={state.text}
					aria-invalid={state.invalid}
					spellCheck={false}
					onChange={(event) => controller.change({ text: event.target.value })}
				/>
			</label>
			<div className="search-scope" role="group" aria-label="搜索范围">
				{(['a', 'b'] as const).map((value) => (
					<button
						key={value}
						aria-label={`搜索 ${value.toUpperCase()}`}
						aria-pressed={state.side === value}
						disabled={unified && value === 'a'}
						title={unified && value === 'a' ? '切换到双栏布局后搜索 A' : `在 ${value.toUpperCase()} 中搜索`}
						onClick={() => controller.change({ side: value })}
					>
						{value.toUpperCase()}
					</button>
				))}
			</div>
			<div className="search-navigation" role="group" aria-label="匹配项导航">
				<IconButton label="上一个匹配项 ⇧Enter" disabled={!state.total || state.invalid} onClick={() => controller.navigate(-1)}>
					<ArrowUp size={14} />
				</IconButton>
				<IconButton label="下一个匹配项 Enter" disabled={!state.total || state.invalid} onClick={() => controller.navigate(1)}>
					<ArrowDown size={14} />
				</IconButton>
			</div>
			<span className={`search-match-count${state.invalid ? ' invalid' : ''}`} role="status" aria-live="polite">
				{status}
			</span>
			<Popover>
				<PopoverTrigger asChild>
					<button className="icon-button" aria-label="搜索选项" title="搜索选项">
						<SlidersHorizontal size={14} />
					</button>
				</PopoverTrigger>
				<PopoverContent align="end" className="search-options" onEscapeKeyDown={(event) => event.stopPropagation()}>
					{(
						[
							['caseSensitive', '区分大小写'],
							['wholeWord', '完整单词'],
							['regexp', '正则表达式'],
						] as const
					).map(([key, label]) => (
						<label key={key}>
							<input type="checkbox" checked={state[key]} onChange={(event) => controller.change({ [key]: event.target.checked })} />
							{label}
						</label>
					))}
				</PopoverContent>
			</Popover>
			<button className="search-done" onClick={() => controller.close()}>
				完成
			</button>
		</div>
	);
}
