import { EditorView } from '@codemirror/view';
import { getChunks, uncollapseUnchanged } from '@codemirror/merge';
import type { StateEffect } from '@codemirror/state';

function collapsedEffects(view: EditorView, position: number): StateEffect<unknown>[] {
	const effects: StateEffect<unknown>[] = [];
	for (const source of view.state.facet(EditorView.decorations)) {
		const ranges = typeof source === 'function' ? source(view) : source;
		ranges.between(position, position, (from, to, decoration) => {
			if (from <= position && to >= position && decoration.spec.block && decoration.spec.widget) {
				effects.push(uncollapseUnchanged.of(from));
			}
		});
	}
	return effects;
}

export function revealSearchMatch(view: EditorView, other: EditorView | null, side: 'a' | 'b'): void {
	const position = view.state.selection.main.from;
	if (other) {
		let offset = 0;
		for (const chunk of getChunks(view.state)?.chunks ?? []) {
			if ((side === 'a' ? chunk.fromA : chunk.fromB) >= position) {
				break;
			}
			offset = side === 'a' ? chunk.toB - chunk.toA : chunk.toA - chunk.toB;
		}
		const mapped = Math.max(0, Math.min(other.state.doc.length, position + offset));
		other.dispatch({ effects: collapsedEffects(other, mapped) });
	}
	// Merge folds expand by their starting offset, not by a position inside them.
	view.dispatch({ effects: [...collapsedEffects(view, position), EditorView.scrollIntoView(view.state.selection.main, { y: 'center' })] });
}
