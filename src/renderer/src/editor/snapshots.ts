import type { EditorSnapshot, EditorSnapshots } from '@/editor/types';

export function createSnapshotCache(isCurrent: (id: string) => boolean): EditorSnapshots & { retain(ids: Set<string>): void } {
	const snapshots = new Map<string, EditorSnapshot>();
	return {
		get(id) {
			return snapshots.get(id);
		},

		set(id, snapshot) {
			// Cleanup from an unmounted editor must not resurrect a closed document.
			if (isCurrent(id)) {
				snapshots.set(id, snapshot);
			}
		},

		retain(ids) {
			for (const id of snapshots.keys()) {
				if (!ids.has(id)) {
					snapshots.delete(id);
				}
			}
		},
	};
}
