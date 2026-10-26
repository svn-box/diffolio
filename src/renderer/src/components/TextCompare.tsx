import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createComparison, type ComparisonEditor } from '../editor/create-comparison';
import { createEditorCommands } from '../editor/commands';
import type { TextCompareHandle, TextComparisonProps } from '../editor/types';

export const TextCompare = forwardRef<TextCompareHandle, TextComparisonProps>(function TextCompare(props, ref) {
	const container = useRef<HTMLDivElement>(null);
	const editor = useRef<ComparisonEditor | null>(null);
	const latest = useRef(props);
	latest.current = props;

	useImperativeHandle(ref, () => createEditorCommands(() => ({ editor: editor.current, props: latest.current })), []);

	useEffect(() => {
		const current = createComparison(container.current!, () => latest.current);
		editor.current = current;
		return () => {
			current.destroy();
			editor.current = null;
		};
	}, [props.id, props.layout, props.editing, props.preferences.fontSize, props.preferences.wrap, props.preferences.collapse]);

	return <div ref={container} className={`text-comparison ${props.layout}`} data-testid="text-comparison" />;
});
