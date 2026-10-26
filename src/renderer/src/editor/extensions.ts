import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, lineNumbers, drawSelection } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { getChunks } from '@codemirror/merge';
import type { Preferences, SourceFile } from '../../../shared/types';

const syntax = HighlightStyle.define([
	{ tag: tags.keyword, color: 'var(--syntax-keyword)' },
	{ tag: [tags.string, tags.regexp], color: 'var(--syntax-string)' },
	{ tag: [tags.number, tags.bool, tags.null], color: 'var(--syntax-number)' },
	{ tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: 'var(--syntax-function)' },
	{ tag: [tags.comment], color: 'var(--text-muted)', fontStyle: 'italic' },
	{ tag: [tags.propertyName, tags.attributeName], color: 'var(--syntax-property)' },
]);

function language(name: string): Extension {
	const extension = name.split('.').at(-1)?.toLowerCase();
	if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(extension ?? '')) {
		return javascript({ typescript: extension?.startsWith('ts'), jsx: extension?.endsWith('x') });
	}
	if (extension === 'json') {
		return json();
	}
	if (extension === 'css') {
		return css();
	}
	if (extension === 'html' || extension === 'svg') {
		return html();
	}
	if (extension === 'md') {
		return markdown();
	}
	return [];
}

function modifiedDecorations(view: EditorView): DecorationSet {
	const data = getChunks(view.state);
	const builder = new RangeSetBuilder<Decoration>();
	if (!data) {
		return builder.finish();
	}
	for (const chunk of data.chunks) {
		if (chunk.fromA === chunk.toA || chunk.fromB === chunk.toB) {
			continue;
		}
		const from = data.side === 'a' ? chunk.fromA : chunk.fromB;
		const end = Math.min(data.side === 'a' ? chunk.toA : chunk.toB, view.state.doc.length);
		for (let position = from; position < end;) {
			const line = view.state.doc.lineAt(position);
			builder.add(line.from, line.from, Decoration.line({ class: 'diff-modified' }));
			position = line.to + 1;
		}
	}
	return builder.finish();
}

export const markModified = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = modifiedDecorations(view);
		}

		update(update: ViewUpdate): void {
			this.decorations = modifiedDecorations(update.view);
		}
	},
	{ decorations: (value) => value.decorations },
);

export function baseExtensions(file: SourceFile, preferences: Preferences): Extension[] {
	return [
		lineNumbers(),
		drawSelection(),
		syntaxHighlighting(syntax),
		language(file.name),
		EditorView.theme({ '&': { fontSize: `${preferences.fontSize}px` }, '.cm-scroller': { fontFamily: 'var(--font-mono)' } }),
		preferences.wrap ? EditorView.lineWrapping : [],
	];
}
