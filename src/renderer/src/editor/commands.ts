import { EditorView } from '@codemirror/view';
import { redo, undo } from '@codemirror/commands';
import { getChunks, rejectChunk } from '@codemirror/merge';
import { currentChunkIndex } from '../../../shared/chunks';
import type { ComparisonEditor } from './create-comparison';
import type { TextCompareHandle, TextComparisonProps } from './types';

export function createEditorCommands(get: () => { editor: ComparisonEditor | null; props: TextComparisonProps }): TextCompareHandle {
	return {
		navigate(direction) {
			const runtime = get().editor;
			if (!runtime) {
				return;
			}
			const { view, left } = runtime;
			const chunks = getChunks(view.state)?.chunks ?? [];
			if (!chunks.length) {
				return;
			}
			const position = view.state.selection.main.head;
			let index = direction > 0 ? chunks.findIndex((chunk) => chunk.fromB > position) : chunks.findLastIndex((chunk) => chunk.fromB < position);
			if (index < 0) {
				index = direction > 0 ? 0 : chunks.length - 1;
			}
			const chunk = chunks[index];
			const anchor = Math.min(chunk.fromB, view.state.doc.length);
			view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) });
			left?.dispatch({ effects: EditorView.scrollIntoView(Math.min(chunk.fromA, left.state.doc.length), { y: 'center' }) });
			view.focus();
		},

		find() {
			get().editor?.search.open();
		},

		searchNext(direction) {
			get().editor?.search.navigate(direction);
		},

		undo() {
			const view = get().editor?.view;
			if (view) {
				undo(view);
			}
		},

		redo() {
			const view = get().editor?.view;
			if (view) {
				redo(view);
			}
		},

		useA() {
			const { editor, props } = get();
			if (!editor || !props.editing) {
				return;
			}
			const { view, left } = editor;
			const chunks = getChunks(view.state)?.chunks ?? [];
			const chunk = chunks[currentChunkIndex(chunks, view.state.selection.main.head)];
			if (!chunk) {
				return;
			}
			if (props.layout === 'unified') {
				rejectChunk(view, chunk.fromB);
				return;
			}
			const text = left!.state.doc;
			let insert = text.sliceString(chunk.fromA, Math.max(chunk.fromA, chunk.toA - 1));
			if (chunk.fromA !== chunk.toA && chunk.toB <= view.state.doc.length) {
				insert += '\n';
			}
			view.dispatch({ changes: { from: Math.min(chunk.fromB, view.state.doc.length), to: Math.min(chunk.toB, view.state.doc.length), insert }, userEvent: 'input.merge' });
		},
	};
}
