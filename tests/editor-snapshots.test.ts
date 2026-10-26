import { EditorState } from '@codemirror/state';
import { expect, it } from 'vitest';
import { createSnapshotCache } from '../src/renderer/src/editor/snapshots';

it('retains live editor history and rejects cleanup writes from retired documents', () => {
	const ids = new Set(['first', 'second']);
	const snapshots = createSnapshotCache((id) => ids.has(id));
	const snapshot = { state: EditorState.create({ doc: 'draft' }), scroll: 200 };
	snapshots.set('first', snapshot);
	snapshots.set('second', snapshot);
	expect(snapshots.get('first')).toBe(snapshot);
	ids.delete('first');
	snapshots.retain(ids);
	snapshots.set('first', snapshot);
	expect(snapshots.get('first')).toBeUndefined();
	expect(snapshots.get('second')).toBe(snapshot);
});
