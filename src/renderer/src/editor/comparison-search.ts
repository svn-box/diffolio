import { EditorView, keymap, type ViewUpdate } from '@codemirror/view';
import { search, SearchQuery, setSearchQuery, findNext, findPrevious } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import { searchHighlights } from './search-highlights';
import { revealSearchMatch } from './reveal-search-match';

export interface ComparisonSearchState {
	open: boolean;
	text: string;
	side: 'a' | 'b';
	caseSensitive: boolean;
	wholeWord: boolean;
	regexp: boolean;
	total: number;
	current: number;
	limited: boolean;
	invalid: boolean;
	focus: number;
}

export const initialSearchState: ComparisonSearchState = {
	open: false,
	text: '',
	side: 'b',
	caseSensitive: false,
	wholeWord: false,
	regexp: false,
	total: 0,
	current: 0,
	limited: false,
	invalid: false,
	focus: 0,
};

export class ComparisonSearch {
	private state = { ...initialSearchState };
	private views: { a: EditorView | null; b: EditorView | null } = { a: null, b: null };
	private matches: { from: number; to: number }[] = [];
	private lastSide: 'a' | 'b' = 'b';
	private onChange: (state: ComparisonSearchState) => void;

	constructor(onChange: (state: ComparisonSearchState) => void) {
		this.onChange = onChange;
	}

	attach(a: EditorView | null, b: EditorView): void {
		this.views = { a, b };
		if (!a) {
			this.state.side = 'b';
		}
		this.apply();
	}

	detach(): void {
		this.views = { a: null, b: null };
	}

	extensions(side: 'a' | 'b'): Extension[] {
		return [
			search(),
			searchHighlights,
			keymap.of([
				{
					key: 'Mod-f',
					run: () => {
						this.open(side);
						return true;
					},
				},
				{
					key: 'Mod-g',
					run: () => {
						this.navigate(1);
						return true;
					},
					shift: () => {
						this.navigate(-1);
						return true;
					},
				},
				{
					key: 'Escape',
					run: () => {
						if (!this.state.open) {
							return false;
						}
						this.close();
						return true;
					},
				},
			]),
			EditorView.domEventHandlers({
				focus: () => {
					this.lastSide = side;
				},
			}),
			EditorView.updateListener.of((update) => this.update(update)),
		];
	}

	open(side = this.state.open ? this.state.side : this.lastSide): void {
		this.state.side = this.views[side] ? side : 'b';
		const view = this.views[this.state.side];
		const selection = view?.state.selection.main;
		if (!this.state.open && !this.state.text && selection && !selection.empty && selection.to - selection.from < 500) {
			this.state.text = view!.state.sliceDoc(selection.from, selection.to);
		}
		this.state.open = true;
		this.state.focus += 1;
		this.apply();
	}

	close(): void {
		this.state.open = false;
		this.apply();
		this.views[this.state.side]?.focus();
	}

	change(patch: Partial<Pick<ComparisonSearchState, 'text' | 'side' | 'caseSensitive' | 'wholeWord' | 'regexp'>>): void {
		this.state = { ...this.state, ...patch };
		if (!this.views[this.state.side]) {
			this.state.side = 'b';
		}
		this.apply();
		const first = this.matches[0];
		const view = this.views[this.state.side];
		if (first && view) {
			view.dispatch({ selection: { anchor: first.from, head: first.to } });
			revealSearchMatch(view, this.views[this.state.side === 'a' ? 'b' : 'a'], this.state.side);
		}
	}

	navigate(direction: number): void {
		if (!this.state.open) {
			this.open();
		}
		const view = this.views[this.state.side];
		if (view && this.state.total > 0 && !this.state.invalid) {
			(direction > 0 ? findNext : findPrevious)(view);
			revealSearchMatch(view, this.views[this.state.side === 'a' ? 'b' : 'a'], this.state.side);
		}
	}

	private apply(): void {
		const query = new SearchQuery({ search: this.state.open ? this.state.text : '', ...this.state, literal: true });
		this.state.invalid = !!this.state.text && !query.valid;
		for (const side of ['a', 'b'] as const) {
			this.views[side]?.dispatch({ effects: setSearchQuery.of(side === this.state.side ? query : new SearchQuery({ search: '' })) });
		}
		this.count();
		this.publish();
	}

	private update(update: ViewUpdate): void {
		if (update.view !== this.views[this.state.side] || !this.state.open) {
			return;
		}
		if (update.docChanged) {
			this.count();
		}
		if (update.docChanged || update.selectionSet) {
			this.publish();
		}
	}

	private count(): void {
		this.matches = [];
		this.state.limited = false;
		const view = this.views[this.state.side];
		if (view && this.state.open && this.state.text && !this.state.invalid) {
			const query = new SearchQuery({ search: this.state.text, ...this.state, literal: true });
			const cursor = query.getCursor(view.state);
			for (let next = cursor.next(); !next.done; next = cursor.next()) {
				if (this.matches.length === 10000) {
					this.state.limited = true;
					break;
				}
				this.matches.push(next.value);
			}
		}
		this.state.total = this.matches.length;
	}

	private publish(): void {
		const selection = this.views[this.state.side]?.state.selection.main;
		this.state.current = selection ? this.matches.findIndex((match) => match.from === selection.from && match.to === selection.to) + 1 : 0;
		this.onChange({ ...this.state });
	}
}
