import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, chmod, rm, symlink, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { currentHash, decodeText, encodeText, readSource, saveAtomic } from '../src/main/files';
import { compareFolders } from '../src/main/folders';

const temporary: string[] = [];

async function directory(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), 'diffolio-test-'));
	temporary.push(path);
	return path;
}

afterEach(async () => {
	for (const path of temporary.splice(0)) {
		await rm(path, { recursive: true, force: true });
	}
});

describe('UTF-8 source fidelity', () => {
	it.each(['LF', 'CRLF', 'CR'] as const)('preserves BOM, unicode and %s newlines', (lineEnding) => {
		const text = '中文 👨‍👩‍👧‍👦 é\n下一行\n';
		const bytes = encodeText(text, { bom: true, lineEnding });
		expect(decodeText(bytes)).toEqual({ content: text, bom: true, lineEnding });
		expect(encodeText(decodeText(bytes).content, decodeText(bytes))).toEqual(bytes);
	});

	it('rejects binary and invalid UTF-8 without replacing bytes', () => {
		expect(() => decodeText(Buffer.from([0, 1, 2]))).toThrow('二进制');
		expect(() => decodeText(Buffer.from([0xff, 0xfe, 0x61]))).toThrow('UTF-8');
		expect(decodeText(Buffer.alloc(0)).content).toBe('');
	});

	it('reads the source without changing its bytes', async () => {
		const path = join(await directory(), 'input.txt');
		const bytes = Buffer.from('\ufeff原始\r\n版本\r\n');
		await writeFile(path, bytes);
		const result = await readSource(path);
		expect(result.content).toBe('原始\n版本\n');
		expect(result.lineEnding).toBe('CRLF');
		expect(await readFile(path)).toEqual(bytes);
	});
});

describe('result saving', () => {
	it('creates and replaces a result and leaves no temporary files', async () => {
		const folder = await directory();
		const path = join(folder, 'result.txt');
		await saveAtomic(path, Buffer.from('first'), null);
		await saveAtomic(path, Buffer.from('second'), await currentHash(path));
		expect(await readFile(path, 'utf8')).toBe('second');
		expect(await readdir(folder)).toEqual(['result.txt']);
	});

	it('rejects a stale snapshot and preserves externally changed content', async () => {
		const path = join(await directory(), 'result.txt');
		await writeFile(path, 'before');
		const expected = await currentHash(path);
		await writeFile(path, 'external edit');
		await expect(saveAtomic(path, Buffer.from('mine'), expected)).rejects.toThrow('其他程序');
		expect(await readFile(path, 'utf8')).toBe('external edit');
	});

	it('does not replace a file that appeared after choosing a new path', async () => {
		const path = join(await directory(), 'result.txt');
		await writeFile(path, 'new external file');
		await expect(saveAtomic(path, Buffer.from('mine'), null)).rejects.toThrow('其他程序');
		expect(await readFile(path, 'utf8')).toBe('new external file');
	});

	it('rejects read-only targets and symlinks', async () => {
		const folder = await directory();
		const path = join(folder, 'original.txt');
		await writeFile(path, 'original');
		await chmod(path, 0o444);
		await expect(saveAtomic(path, Buffer.from('mine'), await currentHash(path))).rejects.toThrow('可写');
		await chmod(path, 0o600);
		const link = join(folder, 'link.txt');
		await symlink(path, link);
		await expect(saveAtomic(link, Buffer.from('mine'), await currentHash(link))).rejects.toThrow('普通文件');
		expect(await readFile(path, 'utf8')).toBe('original');
	});
});

describe('folder comparison', () => {
	it('pairs the reference tree by actual contents', async () => {
		const result = await compareFolders(resolve('fixtures/reference/left'), resolve('fixtures/reference/right'), new AbortController().signal, () => {});
		const status = Object.fromEntries(result.entries.map((entry) => [entry.path, entry.status]));
		expect(status).toMatchObject({
			'README.txt': 'equal',
			'preferences.ts': 'modified',
			'assets/preview.png': 'modified',
			'legacy.txt': 'left',
			'notes.txt': 'right',
			assets: 'modified',
		});
	});

	it('detects equal-sized content changes and compares links without recursion', async () => {
		const root = await directory();
		const left = join(root, 'left');
		const right = join(root, 'right');
		await mkdir(left);
		await mkdir(right);
		await writeFile(join(left, 'same-size.txt'), 'abc');
		await writeFile(join(right, 'same-size.txt'), 'xyz');
		await symlink('.', join(left, 'cycle'));
		await symlink('.', join(right, 'cycle'));
		const result = await compareFolders(left, right, new AbortController().signal, () => {});
		expect(result.entries).toHaveLength(2);
		expect(result.entries.find((entry) => entry.path === 'same-size.txt')?.status).toBe('modified');
		expect(result.entries.find((entry) => entry.path === 'cycle')).toMatchObject({ kind: 'symlink', status: 'equal' });
	});

	it('honors cancellation rather than returning partial success', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(compareFolders(resolve('fixtures/reference/left'), resolve('fixtures/reference/right'), controller.signal, () => {})).rejects.toThrow();
	});
});
