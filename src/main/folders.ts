import { randomUUID } from 'node:crypto';
import { readdir, lstat, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileHash } from './files';
import type { FolderComparison, FolderEntry } from '../shared/types';

export async function compareFolders(left: string, right: string, signal: AbortSignal, progress: (count: number) => void): Promise<FolderComparison> {
	const entries: FolderEntry[] = [];
	let count = 0;

	async function visit(relative: string, a?: string, b?: string): Promise<void> {
		signal.throwIfAborted();
		if (++count > 100_000) {
			throw new Error('目录超过首版的 100,000 条扫描限制。请缩小比较范围。');
		}
		if (count % 32 === 0) {
			progress(count);
		}
		const entry: FolderEntry = { path: relative, kind: 'file', status: a && b ? 'equal' : a ? 'left' : 'right', left: a, right: b };
		entries.push(entry);
		try {
			const aInfo = a ? await lstat(a) : undefined;
			const bInfo = b ? await lstat(b) : undefined;
			entry.leftSize = aInfo?.size;
			entry.rightSize = bInfo?.size;
			const info = aInfo ?? bInfo!;
			entry.kind = info.isSymbolicLink() ? 'symlink' : info.isDirectory() ? 'directory' : 'file';
			if (aInfo && bInfo && (aInfo.isDirectory() !== bInfo.isDirectory() || aInfo.isSymbolicLink() !== bInfo.isSymbolicLink())) {
				entry.status = 'modified';
				return;
			}
			if (entry.kind === 'symlink') {
				entry.status = a && b ? ((await readlink(a)) === (await readlink(b)) ? 'equal' : 'modified') : entry.status;
				return;
			}
			if (entry.kind === 'directory') {
				await walk(relative, a, b);
				if (a && b && entries.some((child) => child.path.startsWith(`${relative}/`) && child.status !== 'equal')) {
					entry.status = 'modified';
				}
			} else if (a && b) {
				entry.status = aInfo!.size !== bInfo!.size || (await fileHash(a, signal)) !== (await fileHash(b, signal)) ? 'modified' : 'equal';
			}
		} catch (error) {
			signal.throwIfAborted();
			if (count > 100_000) {
				throw error;
			}
			entry.status = 'error';
			entry.error = error instanceof Error ? error.message : '无法读取';
		}
	}

	async function walk(relative: string, a?: string, b?: string): Promise<void> {
		const aNames = a ? await readdir(a) : [];
		const bNames = b ? await readdir(b) : [];
		const aSet = new Set(aNames);
		const bSet = new Set(bNames);
		const names = [...new Set([...aNames, ...bNames])].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
		for (const name of names) {
			await visit(relative ? `${relative}/${name}` : name, a && aSet.has(name) ? join(a, name) : undefined, b && bSet.has(name) ? join(b, name) : undefined);
		}
	}

	await walk('', left, right);
	signal.throwIfAborted();
	progress(count);
	return { id: randomUUID(), left, right, entries };
}
