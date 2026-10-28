import type { Text, ChangeSpec } from '@codemirror/state';
import type { Chunk } from '@codemirror/merge';
import type { Side } from '../../../shared/types';

export function mergeChange(a: Text, b: Text, chunk: Pick<Chunk, 'fromA' | 'toA' | 'fromB' | 'toB' | 'changes'>, target: Side, keepBoth: boolean): ChangeSpec {
	if (!keepBoth) {
		// Actual character changes also cover virtual line boundaries with negative chunk offsets.
		return chunk.changes.map((change) =>
			target === 'b'
				? { from: chunk.fromB + change.fromB, to: chunk.fromB + change.toB, insert: a.sliceString(chunk.fromA + change.fromA, chunk.fromA + change.toA) }
				: { from: chunk.fromA + change.fromA, to: chunk.fromA + change.toA, insert: b.sliceString(chunk.fromB + change.fromB, chunk.fromB + change.toB) },
		);
	}
	if (chunk.changes.some((change) => change.fromA < 0 || change.fromB < 0)) {
		const firstChange = chunk.changes[0];
		const lastChange = chunk.changes.at(-1)!;
		const fromA = chunk.fromA + firstChange.fromA;
		const fromB = chunk.fromB + firstChange.fromB;
		const toA = chunk.fromA + lastChange.toA;
		const toB = chunk.fromB + lastChange.toB;
		const first = target === 'b' ? a.sliceString(fromA, toA) : b.sliceString(fromB, toB);
		const second = target === 'b' ? b.sliceString(fromB, toB) : a.sliceString(fromA, toA);
		const separator = first && second && !first.endsWith('\n') && !second.startsWith('\n') ? '\n' : '';
		return { from: target === 'b' ? fromB : fromA, to: target === 'b' ? toB : toA, insert: first + separator + second };
	}
	const hasA = chunk.fromA !== chunk.toA && a.length > 0;
	const hasB = chunk.fromB !== chunk.toB && b.length > 0;
	const textA = a.sliceString(Math.min(chunk.fromA, a.length), Math.min(Math.max(chunk.fromA, chunk.toA - 1), a.length));
	const textB = b.sliceString(Math.min(chunk.fromB, b.length), Math.min(Math.max(chunk.fromB, chunk.toB - 1), b.length));
	const doc = target === 'a' ? a : b;
	const from = target === 'a' ? chunk.fromA : chunk.fromB;
	const to = target === 'a' ? chunk.toA : chunk.toB;
	const parts = target === 'b' ? [hasA ? textA : null, hasB ? textB : null] : [hasB ? textB : null, hasA ? textA : null];
	const retained = parts.filter((part): part is string => part !== null);
	let insert = retained.join('\n');
	// Chunk ends include a virtual line break at EOF; append only when replacing before another line.
	if (retained.length && to <= doc.length) {
		insert += '\n';
	}
	return { from: Math.min(from, doc.length), to: Math.min(to, doc.length), insert };
}
