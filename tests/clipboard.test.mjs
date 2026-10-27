import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupClipboard, restoreClipboard } from '../scripts/helpers/clipboard.mjs';

const key = 'diffolioClipboardRegression';

class ClipboardItem {
	constructor(values) {
		if (!Object.keys(values).length) {
			throw new TypeError("Failed to construct 'ClipboardItem': at least one MIME type is required.");
		}
		this.values = values;
		this.types = Object.keys(values);
	}

	async getType(type) {
		return this.values[type];
	}
}

function context(initial) {
	let items = initial;
	return {
		ClipboardItem,
		clipboard: {
			read: vi.fn(async () => items),
			write: vi.fn(async (next) => {
				items = next;
			}),
			clear: vi.fn(() => {
				items = [];
			}),
		},
	};
}

afterEach(() => {
	delete globalThis[key];
});

describe('Electron clipboard backup and restoration', () => {
	it.each([
		{ name: 'no items', items: [] },
		{ name: 'one empty native item', items: [{ types: [] }] },
		{ name: 'multiple empty native items', items: [{ types: [] }, { types: [] }] },
	])('restores an empty clipboard without constructing an empty ClipboardItem: $name', async ({ items }) => {
		const api = context(items);
		await backupClipboard(api, key);
		await api.clipboard.write([new ClipboardItem({ 'text/plain': new Blob(['test content']) })]);
		await restoreClipboard(api, key);
		expect(await api.clipboard.read()).toEqual([]);
	});

	it('preserves text, rich text, binary data and multiple items alongside empty entries', async () => {
		const text = new Blob(['原始内容'], { type: 'text/plain' });
		const html = new Blob(['<b>原始内容</b>'], { type: 'text/html' });
		const image = new Blob([new Uint8Array([0, 16, 255])], { type: 'image/png' });
		const api = context([{ types: [] }, new ClipboardItem({ 'text/plain': text, 'text/html': html }), new ClipboardItem({ 'image/png': image })]);
		await backupClipboard(api, key);
		await api.clipboard.write([]);
		await restoreClipboard(api, key);
		const result = await api.clipboard.read();
		expect(result).toHaveLength(2);
		expect(result[0].types).toEqual(['text/plain', 'text/html']);
		expect(await (await result[0].getType('text/plain')).text()).toBe('原始内容');
		expect(await (await result[0].getType('text/html')).text()).toBe('<b>原始内容</b>');
		expect(new Uint8Array(await (await result[1].getType('image/png')).arrayBuffer())).toEqual(new Uint8Array([0, 16, 255]));
		expect(api.clipboard.clear).not.toHaveBeenCalled();
	});

	it('leaves clipboard content untouched if backing up a payload fails', async () => {
		const original = [
			{
				types: ['text/plain'],
				getType: async () => {
					throw new Error('Cannot read payload');
				},
			},
		];
		const api = context(original);
		await expect(backupClipboard(api, key)).rejects.toThrow('Cannot read payload');
		await restoreClipboard(api, key);
		expect(await api.clipboard.read()).toBe(original);
		expect(api.clipboard.write).not.toHaveBeenCalled();
		expect(api.clipboard.clear).not.toHaveBeenCalled();
	});

	it('does not erase later content when cleanup is called twice', async () => {
		const api = context([]);
		await backupClipboard(api, key);
		await restoreClipboard(api, key);
		const next = [new ClipboardItem({ 'text/plain': new Blob(['later']) })];
		await api.clipboard.write(next);
		await restoreClipboard(api, key);
		expect(await api.clipboard.read()).toBe(next);
	});
});
