import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import type { SourceFile } from '../shared/types';

export const contentLimit = 16 * 1024 * 1024;

export function hash(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

export function decodeText(bytes: Buffer): Pick<SourceFile, 'content' | 'bom' | 'lineEnding'> {
	if (bytes.includes(0)) {
		throw new Error('这个文件包含二进制内容，暂时无法作为文本打开。');
	}
	let content: string;
	try {
		content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new Error('这个文件不是有效的 UTF-8 文本。请先转换编码后再打开。');
	}
	const lineEnding = content.includes('\r\n') ? 'CRLF' : content.includes('\r') ? 'CR' : 'LF';
	return { content: content.replace(/\r\n?/g, '\n'), bom: bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), lineEnding };
}

export function encodeText(content: string, source: Pick<SourceFile, 'bom' | 'lineEnding'>): Buffer {
	const normalized = content.replace(/\r\n?/g, '\n');
	const eol = source.lineEnding === 'CRLF' ? '\r\n' : source.lineEnding === 'CR' ? '\r' : '\n';
	return Buffer.from(`${source.bom ? '\ufeff' : ''}${normalized.replace(/\n/g, eol)}`, 'utf8');
}

export async function readSource(path: string): Promise<SourceFile> {
	const info = await stat(path);
	if (!info.isFile()) {
		throw new Error('请选择普通文件。');
	}
	if (info.size > contentLimit) {
		throw new Error('首版暂时支持 16 MB 以内的文件，请选择较小的文件。');
	}
	const bytes = await readFile(path);
	if (bytes.length > contentLimit) {
		throw new Error('读取期间文件变大，已停止打开。');
	}
	const extension = extname(path).toLowerCase();
	const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' } as Record<string, string>)[extension];
	const base = { id: randomUUID(), name: basename(path), path, bytes: bytes.length, hash: hash(bytes) };
	if (mime) {
		return { ...base, kind: 'image', content: '', bom: false, lineEnding: 'LF', imageUrl: `data:${mime};base64,${bytes.toString('base64')}` };
	}
	return { ...base, kind: 'text', ...decodeText(bytes) };
}

export async function fileHash(path: string, signal?: AbortSignal): Promise<string> {
	const result = createHash('sha256');
	for await (const chunk of createReadStream(path, { signal })) {
		result.update(chunk);
	}
	return result.digest('hex');
}

export async function currentHash(path: string): Promise<string | null> {
	try {
		return await fileHash(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

export async function saveAtomic(path: string, bytes: Buffer, expected: string | null): Promise<void> {
	let mode = 0o600;
	try {
		const info = await lstat(path);
		if (!info.isFile() || info.isSymbolicLink() || !(info.mode & 0o222)) {
			throw new Error('目标不是可写的普通文件，请另存到其他位置。');
		}
		mode = info.mode & 0o777;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
	if ((await currentHash(path)) !== expected) {
		throw new Error('目标文件已经被其他程序修改。请重新查看文件后再保存。');
	}
	const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
	try {
		const handle = await open(temporary, 'wx', mode);
		try {
			await handle.writeFile(bytes);
			await handle.sync();
		} finally {
			await handle.close();
		}
		if ((await currentHash(path)) !== expected) {
			throw new Error('保存期间目标文件发生变化，已保留磁盘上的版本。请重试另存为。');
		}
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true });
	}
}
