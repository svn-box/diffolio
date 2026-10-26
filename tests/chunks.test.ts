import { describe, expect, it } from 'vitest';
import { currentChunkIndex } from '../src/shared/chunks';

describe('the current difference used by both labels and block operations', () => {
	const chunks = [
		{ fromB: 10, toB: 20 },
		{ fromB: 40, toB: 50 },
		{ fromB: 80, toB: 80 },
	];

	it('selects the upcoming block on an unchanged line, never the first block', () => {
		expect(currentChunkIndex(chunks, 30)).toBe(1);
		expect(currentChunkIndex(chunks, 65)).toBe(2);
	});

	it('keeps the selected block within changes and at a deletion position', () => {
		expect(currentChunkIndex(chunks, 45)).toBe(1);
		expect(currentChunkIndex(chunks, 80)).toBe(2);
	});

	it('uses the last difference at the end of the document and handles equality', () => {
		expect(currentChunkIndex(chunks, 100)).toBe(2);
		expect(currentChunkIndex(chunks, 0)).toBe(0);
		expect(currentChunkIndex([], 10)).toBe(-1);
	});
});
