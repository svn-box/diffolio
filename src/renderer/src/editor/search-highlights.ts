import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { getSearchQuery } from '@codemirror/search';

function highlights(view: EditorView): DecorationSet {
	const query = getSearchQuery(view.state);
	if (!query.valid) {
		return Decoration.none;
	}
	const marks = [];
	const seen = new Set<string>();
	const selection = view.state.selection.main;
	const margin = Math.max(250, query.search.length);
	for (const range of view.visibleRanges) {
		const cursor = query.getCursor(view.state, Math.max(0, range.from - margin), Math.min(view.state.doc.length, range.to + margin));
		for (let next = cursor.next(); !next.done; next = cursor.next()) {
			const match = next.value;
			const key = `${match.from}:${match.to}`;
			if (match.from === match.to || seen.has(key)) {
				continue;
			}
			seen.add(key);
			const current = match.from === selection.from && match.to === selection.to;
			marks.push(Decoration.mark({ class: `comparison-search-match${current ? ' is-current' : ''}` }).range(match.from, match.to));
		}
	}
	return Decoration.set(marks, true);
}

export const searchHighlights = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = highlights(view);
		}

		update(update: ViewUpdate): void {
			if (update.docChanged || update.viewportChanged || update.selectionSet || getSearchQuery(update.startState) !== getSearchQuery(update.state)) {
				this.decorations = highlights(update.view);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);
