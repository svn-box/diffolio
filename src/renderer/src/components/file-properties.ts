import type { FileMetadata, SourceFile } from '../../../shared/types';
import { leaf, type Session } from '@/state/session';

export interface PropertyRow {
	label: string;
	a: string;
	b: string;
	mono?: boolean;
}

function date(value?: string | null): string {
	if (!value || !Number.isFinite(Date.parse(value))) {
		return '—';
	}
	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		fractionalSecondDigits: 3,
		hour12: false,
	}).format(new Date(value));
}

function fileType(file: SourceFile): string {
	const extension = file.name.split('.').at(-1)?.toLowerCase();
	const types: Record<string, string> = {
		ts: 'TypeScript',
		tsx: 'TypeScript JSX',
		js: 'JavaScript',
		jsx: 'JavaScript JSX',
		json: 'JSON',
		md: 'Markdown',
		html: 'HTML',
		css: 'CSS',
		rs: 'Rust',
		py: 'Python',
		txt: '文本文件',
		png: 'PNG 图片',
		jpg: 'JPEG 图片',
		jpeg: 'JPEG 图片',
		webp: 'WebP 图片',
		gif: 'GIF 图片',
	};
	return types[extension ?? ''] ?? (file.kind === 'image' ? '图片' : '文本文件');
}

function metadataRows(a?: FileMetadata, b?: FileMetadata): PropertyRow[] {
	return [
		{ label: '修改时间', a: date(a?.modifiedAt), b: date(b?.modifiedAt) },
		{ label: '创建时间', a: date(a?.createdAt), b: date(b?.createdAt) },
		{ label: '权限', a: a?.permissions ?? '—', b: b?.permissions ?? '—', mono: true },
	];
}

export function propertyRows(session: Session): PropertyRow[] {
	if (session.folder) {
		const folder = session.folder;
		return [
			{ label: '名称', a: leaf(folder.left), b: leaf(folder.right) },
			{ label: '类型', a: '文件夹', b: '文件夹' },
			{ label: '项目数', a: String(folder.entries.filter((entry) => entry.left).length), b: String(folder.entries.filter((entry) => entry.right).length) },
			...metadataRows(folder.leftMetadata, folder.rightMetadata),
		];
	}
	const a = session.a!;
	const b = session.b!;
	const text = a.kind === 'text' && b.kind === 'text';
	const encoding = (file: SourceFile) => `Unicode (UTF-8)${file.bom ? ' · BOM' : ''}`;
	return [
		{ label: '名称', a: a.name, b: b.name },
		{ label: '大小', a: `${a.bytes.toLocaleString('zh-CN')} 字节`, b: `${b.bytes.toLocaleString('zh-CN')} 字节` },
		{ label: '类型', a: fileType(a), b: fileType(b) },
		...metadataRows(a.metadata, b.metadata),
		...(text
			? [
					{ label: '编码', a: encoding(a), b: encoding(b) },
					{ label: '换行符', a: a.lineEnding, b: b.lineEnding },
				]
			: []),
	];
}
