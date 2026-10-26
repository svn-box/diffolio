export function currentChunkIndex(chunks: readonly { fromB: number; toB: number }[], position: number): number {
	if (!chunks.length) {
		return -1;
	}
	const next = chunks.findIndex((chunk) => chunk.toB >= position);
	return next < 0 ? chunks.length - 1 : next;
}
