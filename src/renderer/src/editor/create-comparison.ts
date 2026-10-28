import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyField, historyKeymap, undoDepth, redoDepth } from '@codemirror/commands';
import { highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching } from '@codemirror/language';
import { MergeView, getChunks, unifiedMergeView } from '@codemirror/merge';
import { currentChunkIndex } from '../../../shared/chunks';
import { baseExtensions, markModified } from '@/editor/extensions';
import type { TextComparisonProps } from '@/editor/types';
import type { ComparisonSearch } from '@/editor/comparison-search';
import type { Side } from '../../../shared/types';

export interface ComparisonEditor {
	view: EditorView;
	left: EditorView | null;
	search: ComparisonSearch;
	side(): Side;
	selectSide(side: Side): void;
	destroy(): void;
}

export function createComparison(root: HTMLElement, getProps: () => TextComparisonProps, search: ComparisonSearch): ComparisonEditor {
	const current = getProps();
	const previous = current.snapshots.get(current.id);
	let merging: MergeView | undefined;
	let scrolling = false;
	let view: EditorView;
	let left: EditorView | null = null;
	let activeSide = current.layout === 'unified' ? ('b' as Side) : (previous?.side ?? 'b');

	function report(): void {
		if (!view) {
			return;
		}
		const chunks = getChunks(view.state)?.chunks ?? [];
		const added = chunks.filter((chunk) => chunk.fromA === chunk.toA).length;
		const deleted = chunks.filter((chunk) => chunk.fromB === chunk.toB).length;
		const active = activeSide === 'a' && left ? left : view;
		const ranges = activeSide === 'a' ? chunks.map((chunk) => ({ fromB: chunk.fromA, toB: chunk.toA })) : chunks;
		const leftState = left?.state ?? previous?.leftState;
		getProps().onStats({
			total: chunks.length,
			added,
			deleted,
			modified: chunks.length - added - deleted,
			current: currentChunkIndex(ranges, active.state.selection.main.head) + 1,
			canUndo: undoDepth(view.state) > 0,
			canRedo: redoDepth(view.state) > 0,
			canUndoA: !!leftState && undoDepth(leftState) > 0,
			canRedoA: !!leftState && redoDepth(leftState) > 0,
			activeSide,
		});
	}

	function snapshot(): void {
		if (view) {
			current.snapshots.set(current.id, {
				state: view.state,
				leftState: left?.state ?? previous?.leftState,
				side: activeSide,
				focused: view.hasFocus || !!left?.hasFocus,
				scroll: merging ? merging.dom.scrollTop : view.scrollDOM.scrollTop,
			});
		}
	}

	function extensions(side: 'a' | 'b'): Extension[] {
		const restored = side === 'a' ? previous?.leftState : previous?.state;
		return [
			...baseExtensions(side === 'a' ? current.a : current.b, current.preferences),
			highlightActiveLineGutter(),
			bracketMatching(),
			highlightSelectionMatches(),
			...search.extensions(side),
			keymap.of([...defaultKeymap, ...historyKeymap]),
			history(),
			markModified,
			EditorState.readOnly.of(!current.editing[side]),
			EditorView.editable.of(current.editing[side]),
			EditorView.contentAttributes.of({
				'aria-label': current.editing[side] ? `编辑 ${side.toUpperCase()} 副本` : `原始文件 ${side.toUpperCase()}`,
				spellcheck: 'false',
				tabindex: '0',
			}),
			restored ? historyField.init(() => restored.field(historyField)) : [],
			EditorView.updateListener.of((update) => {
				if (update.view.hasFocus && (update.focusChanged || update.selectionSet)) {
					activeSide = side;
				}
				if (update.docChanged) {
					getProps().onChange(side, update.state.doc.toString());
				}
				snapshot();
				report();
			}),
		];
	}

	const selection = previous && previous.state.doc.toString() === current.content.b ? previous.state.selection : undefined;
	const selectionA = previous?.leftState?.doc.toString() === current.content.a ? previous.leftState.selection : undefined;
	const collapseUnchanged = current.preferences.collapse ? { margin: 3, minSize: 6 } : undefined;
	const diffConfig = { scanLimit: 2000, timeout: 1500 };
	if (current.layout === 'split') {
		merging = new MergeView({
			a: { doc: current.content.a, selection: selectionA, extensions: extensions('a') },
			b: { doc: current.content.b, selection, extensions: extensions('b') },
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
			doc: current.content.b,
			selection,
			extensions: [
				...extensions('b'),
				unifiedMergeView({ original: current.content.a, mergeControls: false, highlightChanges: true, gutter: true, collapseUnchanged, diffConfig }),
			],
		});
		view.scrollDOM.scrollTop = previous?.scroll ?? 0;
	}
	search.attach(left, view);
	if (previous?.focused) {
		(activeSide === 'a' && left ? left : view).focus();
	}
	report();
	return {
		view,
		left,
		search,
		side: () => activeSide,

		selectSide(side) {
			activeSide = side;
			report();
		},

		destroy() {
			search.detach();
			snapshot();
			if (merging) {
				merging.destroy();
			} else {
				view.destroy();
			}
		},
	};
}
