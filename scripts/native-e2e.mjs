import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const controls = process.argv.includes('--controls');
const output = resolve(controls ? 'work/native-controls' : 'work/native');
await mkdir(output, { recursive: true });
await rm(join(output, 'report.json'), { force: true });
await rm(join(output, 'settings-report.json'), { force: true });
const data = await mkdtemp(join(tmpdir(), 'diffolio-tauri-native-'));

function run(command, args, options = {}) {
	return new Promise((done, reject) => {
		const child = spawn(command, args, { stdio: 'inherit', ...options });
		child.once('error', reject);
		child.once('exit', (code) => (code === 0 ? done() : reject(new Error(`${command} exited ${code}`))));
	});
}

try {
	const release = process.argv.includes('--release');
	await run('cargo', [
		'build',
		'--manifest-path',
		'src-tauri/Cargo.toml',
		'--features',
		release ? 'native-smoke,tauri/custom-protocol' : 'native-smoke',
		...(release ? ['--release'] : []),
	]);
	try {
		await run(resolve(`src-tauri/target/${release ? 'release' : 'debug'}/diffolio-app`), [], {
			env: { ...process.env, DIFFOLIO_DATA_DIR: data, DIFFOLIO_SMOKE_OUTPUT: output, ...(controls ? { DIFFOLIO_SMOKE_CONTROLS: '1' } : {}) },
			timeout: 90000,
		});
	} catch (error) {
		const report = await readFile(join(output, 'report.json'), 'utf8')
			.then(JSON.parse)
			.catch(() => null);
		throw new Error(report?.error ? `Native verification failed: ${report.error}` : 'Native verification exited without a report.', { cause: error });
	}
	const report = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'));
	assert.equal(report.success, true, report.error);
	if (!controls) {
		const saved = await readFile(join(output, 'saved-result.ts'), 'utf8');
		assert.ok(saved.length > 0);
	}
	console.log(`PASS: ${report.checks.length} native ${controls ? 'window-control geometry checks. Report' : 'WebKit / Rust checks. Screenshots'}: ${output}`);
} finally {
	await rm(data, { recursive: true, force: true });
}
