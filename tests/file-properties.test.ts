import { describe, expect, it } from 'vitest';
import { propertyRows } from '@/components/file-properties';
import { source, workspace } from './helpers/workspace';

describe('original input properties', () => {
	it('keeps original bytes, encoding and metadata separate from both editable drafts', async () => {
		const { actions, current } = workspace();
		const original = {
			...source('before.ts', 'first\nsecond'),
			path: '/tmp/before.ts',
			bom: true,
			lineEnding: 'CRLF' as const,
			metadata: { modifiedAt: '2026-10-26T04:16:20.458Z', permissions: '-rw-r--r--' },
		};
		await actions.acceptOpen({ files: [original, source('after.ts', '')] });
		const before = propertyRows(current());
		actions.startEditing('a');
		actions.changeContent(current().id, current().documentId, 'a\nb\nc\nd', 'a');
		expect(propertyRows(current())).toEqual(before);
		expect(before.find((row) => row.label === '编码')).toMatchObject({ a: 'Unicode (UTF-8) · BOM', b: 'Unicode (UTF-8)' });
		expect(before.find((row) => row.label === '权限')).toMatchObject({ a: '-rw-r--r--', b: '—' });
		expect(before.find((row) => row.label === '创建时间')).toMatchObject({ a: '—', b: '—' });
		expect(before.find((row) => row.label === '修改时间')?.a).toContain('2026/10/26');
	});

	it('omits text-only fields for images and does not invent filesystem metadata', async () => {
		const { actions, current } = workspace();
		await actions.acceptOpen({ files: ['a.png', 'b.png'].map((name) => ({ ...source(name), kind: 'image' as const, metadata: { modifiedAt: 'invalid' } })) });
		const rows = propertyRows(current());
		expect(rows.map((row) => row.label)).not.toContain('编码');
		expect(rows.map((row) => row.label)).not.toContain('行数');
		expect(rows.find((row) => row.label === '类型')).toMatchObject({ a: 'PNG 图片', b: 'PNG 图片' });
		expect(rows.find((row) => row.label === '修改时间')).toMatchObject({ a: '—', b: '—' });
	});

	it('counts each folder side without showing directory inode size as recursive file size', async () => {
		const { actions, current } = workspace();
		await actions.acceptOpen({
			files: [],
			folder: {
				id: 'folder',
				left: '/tmp/left',
				right: '/tmp/right',
				entries: [
					{ path: 'one.txt', kind: 'file', status: 'equal', left: '/tmp/left/one.txt', right: '/tmp/right/one.txt' },
					{ path: 'two.txt', kind: 'file', status: 'left', left: '/tmp/left/two.txt' },
				],
			},
		});
		const rows = propertyRows(current());
		expect(rows.find((row) => row.label === '名称')).toMatchObject({ a: 'left', b: 'right' });
		expect(rows.find((row) => row.label === '项目数')).toMatchObject({ a: '2', b: '1' });
		expect(rows.map((row) => row.label)).not.toContain('大小');
		expect(rows.map((row) => row.label)).not.toContain('换行符');
	});
});
