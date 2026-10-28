import { EditorView } from '@codemirror/view';
import { isolateHistory, redo, undo } from '@codemirror/commands';
import { getChunks } from '@codemirror/merge';
import { Text } from '@codemirror/state';
import { currentChunkIndex } from '../../../shared/chunks';
import type { Side } from '../../../shared/types';
import { mergeChange } from '@/editor/merge-change';
import type { ComparisonEditor } from '@/editor/create-comparison';
import type { TextCompareHandle, TextComparisonProps } from '@/editor/types';

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
			const side = runtime.side();
			const active = side === 'a' && left ? left : view;
			const position = active.state.selection.main.head;
			const start = (chunk: (typeof chunks)[number]) => (side === 'a' ? chunk.fromA : chunk.fromB);
			let index = direction > 0 ? chunks.findIndex((chunk) => start(chunk) > position) : chunks.findLastIndex((chunk) => start(chunk) < position);
			if (index < 0) {
				index = direction > 0 ? 0 : chunks.length - 1;
			}
			const chunk = chunks[index];
			for (const [editor, from] of [
				[left, chunk.fromA],
				[view, chunk.fromB],
			] as const) {
				if (editor) {
					const anchor = Math.min(from, editor.state.doc.length);
					editor.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) });
				}
			}
			runtime.selectSide(side);
			active.focus();
		},

		find() {
			get().editor?.search.open();
		},

		searchNext(direction) {
			get().editor?.search.navigate(direction);
		},

		edit(side) {
			const { editor, props } = get();
			if (editor) {
				editor.selectSide(side);
				props.onEdit(side);
				(side === 'a' ? (editor.left ?? editor.view) : editor.view).focus();
				editor.selectSide(side);
			}
		},

		undo(side) {
			const runtime = get().editor;
			const view = side === 'a' ? runtime?.left : runtime?.view;
			if (view) {
				runtime!.selectSide(side);
				undo(view);
				view.focus();
			}
		},

		redo(side) {
			const runtime = get().editor;
			const view = side === 'a' ? runtime?.left : runtime?.view;
			if (view) {
				runtime!.selectSide(side);
				redo(view);
				view.focus();
			}
		},

		merge(action) {
			const { editor, props } = get();
			if (!editor) {
				return;
			}
			const target: Side = action.endsWith('b-a') ? 'a' : 'b';
			const destination = target === 'a' ? editor.left : editor.view;
			if (!destination) {
				return;
			}
			const chunks = getChunks(editor.view.state)?.chunks ?? [];
			const side = editor.side();
			const active = side === 'a' ? editor.left! : editor.view;
			const ranges = side === 'a' ? chunks.map((chunk) => ({ fromB: chunk.fromA, toB: chunk.toA })) : chunks;
			const chunk = chunks[currentChunkIndex(ranges, active.state.selection.main.head)];
			if (!chunk) {
				return;
			}
			const a = editor.left?.state.doc ?? Text.of(props.content.a.split('\n'));
			const changes = mergeChange(a, editor.view.state.doc, chunk, target, action.startsWith('keep'));
			props.onEdit(target);
			editor.selectSide(target);
			destination.dispatch({ changes, annotations: isolateHistory.of('full'), userEvent: 'input.merge' });
			destination.focus();
		},
	};
}
