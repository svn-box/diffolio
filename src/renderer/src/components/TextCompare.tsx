import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { createComparison, type ComparisonEditor } from '@/editor/create-comparison';
import { createEditorCommands } from '@/editor/commands';
import type { TextCompareHandle, TextComparisonProps } from '@/editor/types';
import { ComparisonSearch, initialSearchState } from '@/editor/comparison-search';
import { ComparisonSearchbar } from '@/components/ComparisonSearchbar';

export const TextCompare = forwardRef<TextCompareHandle, TextComparisonProps>(function TextCompare(props, ref) {
	const container = useRef<HTMLDivElement>(null);
	const editor = useRef<ComparisonEditor | null>(null);
	const latest = useRef(props);
	const [search, setSearch] = useState(initialSearchState);
	const controller = useMemo(() => new ComparisonSearch(setSearch), []);
	latest.current = props;

	useImperativeHandle(ref, () => createEditorCommands(() => ({ editor: editor.current, props: latest.current })), []);

	useEffect(() => {
		const current = createComparison(container.current!, () => latest.current, controller);
		editor.current = current;
		return () => {
			current.destroy();
			editor.current = null;
		};
	}, [props.id, props.layout, props.editing.a, props.editing.b, props.preferences.fontSize, props.preferences.wrap, props.preferences.collapse, controller]);

	return (
		<div className="text-comparison-workspace">
			{search.open && <ComparisonSearchbar state={search} controller={controller} unified={props.layout === 'unified'} />}
			<div ref={container} className={`text-comparison ${props.layout}`} data-testid="text-comparison" />
		</div>
	);
});
