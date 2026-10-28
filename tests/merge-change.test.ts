import { describe, expect, it } from 'vitest';
import { Text, ChangeSet } from '@codemirror/state';
import { Chunk } from '@codemirror/merge';
import { mergeChange } from '@/editor/merge-change';
import type { Side } from '../src/shared/types';

function merge(a: string, b: string, target: Side, keep = false): string {
	const left = Text.of(a.split('\n'));
	const right = Text.of(b.split('\n'));
	const chunk = Chunk.build(left, right)[0];
	const doc = target === 'a' ? left : right;
	return ChangeSet.of(mergeChange(left, right, chunk, target, keep), doc.length)
		.apply(doc)
		.toString();
}

describe('directional block decisions', () => {
	it.each([
		['head\nA\ntail\n', 'head\nB\ntail\n'],
		['A', 'B'],
		['A\n', 'B\n'],
		['', 'B'],
		['A', ''],
		['head\nA\ntail', 'head\ntail'],
		['head\ntail', 'head\nB\ntail'],
		['head\nA', 'head\n'],
		['head\n', 'head\nB'],
		['你好 👨‍👩‍👧‍👦\n', '你好 é\n'],
		['\nA', '\n\nA'],
		['\nA', '\nB\n\nA'],
		['\n', '\n\n'],
		['head\n\nA', 'head\n\n\nA'],
	])('copies only the selected block in either direction: %j / %j', (a, b) => {
		expect(merge(a, b, 'b')).toBe(a);
		expect(merge(a, b, 'a')).toBe(b);
	});

	it('keeps both block orders without duplicating surrounding lines', () => {
		expect(merge('head\nA\ntail\n', 'head\nB\ntail\n', 'b', true)).toBe('head\nA\nB\ntail\n');
		expect(merge('head\nA\ntail\n', 'head\nB\ntail\n', 'a', true)).toBe('head\nB\nA\ntail\n');
		expect(merge('A', 'B', 'b', true)).toBe('A\nB');
		expect(merge('A', 'B', 'a', true)).toBe('B\nA');
	});

	it('preserves empty lines and does not invent text for a missing side', () => {
		expect(merge('head\n\ntail', 'head\nB\ntail', 'b', true)).toBe('head\n\nB\ntail');
		expect(merge('A', '', 'b', true)).toBe('A');
		expect(merge('', 'B', 'a', true)).toBe('B');
		expect(merge('\nA', '\n\nA', 'b', true)).toBe('\n\nA');
		expect(merge('\nA', '\n\nA', 'a', true)).toBe('\n\nA');
		expect(merge('\nA', '\nB\n\nA', 'a', true)).toBe('\nB\n\nA');
	});
});
