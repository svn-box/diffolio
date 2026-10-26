import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyField, historyKeymap } from '@codemirror/commands';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching } from '@codemirror/language';
import { MergeView, getChunks, unifiedMergeView } from '@codemirror/merge';
import { currentChunkIndex } from '../../../shared/chunks';
import { baseExtensions, markModified } from './extensions';
import type { TextComparisonProps } from './types';

export interface ComparisonEditor {
	view: EditorView;
	left: EditorView | null;
	destroy(): void;
}

export function createComparison(root: HTMLElement, getProps: () => TextComparisonProps): ComparisonEditor {
	const current = getProps();
	const previous = current.snapshots.get(current.id);
	let merging: MergeView | undefined;
	let scrolling = false;

	function report(view: EditorView): void {
		const chunks = getChunks(view.state)?.chunks ?? [];
		const added = chunks.filter((chunk) => chunk.fromA === chunk.toA).length;
		const deleted = chunks.filter((chunk) => chunk.fromB === chunk.toB).length;
		getProps().onStats({
			total: chunks.length,
			added,
			deleted,
			modified: chunks.length - added - deleted,
			current: currentChunkIndex(chunks, view.state.selection.main.head) + 1,
		});
	}

	function extensions(side: 'a' | 'b'): Extension[] {
		return [
			...baseExtensions(side === 'a' ? current.a : current.b, current.preferences),
			highlightActiveLineGutter(),
			bracketMatching(),
			highlightSelectionMatches(),
			search({ top: true }),
			keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
			history(),
			markModified,
			EditorState.readOnly.of(side === 'a' || !current.editing),
			EditorView.editable.of(side === 'b' && current.editing),
			EditorView.contentAttributes.of({ 'aria-label': side === 'a' ? '原始文件 A' : current.editing ? '编辑比较结果' : '对照文件 B', spellcheck: 'false' }),
			side === 'b' && previous ? historyField.init(() => previous.state.field(historyField)) : [],
			EditorView.updateListener.of((update) => {
				if (side !== 'b') {
					return;
				}
				if (update.docChanged) {
					getProps().onChange(update.state.doc.toString());
				}
				current.snapshots.set(current.id, { state: update.state, scroll: merging ? merging.dom.scrollTop : update.view.scrollDOM.scrollTop });
				report(update.view);
			}),
		];
	}

	const selection = previous && previous.state.doc.toString() === current.content ? previous.state.selection : undefined;
	const collapseUnchanged = current.preferences.collapse ? { margin: 3, minSize: 6 } : undefined;
	const diffConfig = { scanLimit: 2000, timeout: 1500 };
	let view: EditorView;
	let left: EditorView | null = null;
	if (current.layout === 'split') {
		merging = new MergeView({
			a: { doc: current.a.content, extensions: extensions('a') },
			b: { doc: current.content, selection, extensions: extensions('b') },
			parent: root,
			highlightChanges: true,
			gutter: true,
			collapseUnchanged,
			diffConfig,
		});
		view = merging.b;
		left = merging.a;
		merging.dom.scrollTop = previous?.scroll ?? 0;

		function sync(from: EditorView, to: EditorView): void {
			if (!scrolling) {
				scrolling = true;
				to.scrollDOM.scrollLeft = from.scrollDOM.scrollLeft;
				scrolling = false;
			}
		}

		merging.a.scrollDOM.addEventListener('scroll', () => sync(merging!.a, merging!.b));
		merging.b.scrollDOM.addEventListener('scroll', () => sync(merging!.b, merging!.a));
	} else {
		view = new EditorView({
			parent: root,
			doc: current.content,
			selection,
			extensions: [
				...extensions('b'),
				unifiedMergeView({ original: current.a.content, mergeControls: false, highlightChanges: true, gutter: true, collapseUnchanged, diffConfig }),
			],
		});
		view.scrollDOM.scrollTop = previous?.scroll ?? 0;
	}
	report(view);
	return {
		view,
		left,

		destroy() {
			current.snapshots.set(current.id, { state: view.state, scroll: merging ? merging.dom.scrollTop : view.scrollDOM.scrollTop });
			if (merging) {
				merging.destroy();
			} else {
				view.destroy();
			}
		},
	};
}
