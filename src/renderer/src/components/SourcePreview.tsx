import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { Preferences, SourceFile } from '../../../shared/types';
import { baseExtensions } from '@/editor/extensions';

export function SourcePreview({ file, preferences, label }: { file: SourceFile; preferences: Preferences; label: string }) {
	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const view = new EditorView({
			parent: container.current!,
			doc: file.content,
			extensions: [
				...baseExtensions(file, preferences),
				EditorState.readOnly.of(true),
				EditorView.editable.of(false),
				EditorView.contentAttributes.of({ 'aria-label': label }),
			],
		});
		return () => view.destroy();
	}, [file.id, file.content, file.name, preferences.fontSize, preferences.wrap, label]);

	return <div className="text-comparison source-preview" ref={container} />;
}
