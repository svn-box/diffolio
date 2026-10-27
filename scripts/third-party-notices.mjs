import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const check = process.argv.includes('--check');
assert.ok(
	process.argv.slice(2).every((argument) => argument === '--check'),
	'Only --check is supported.',
);
const root = resolve('.');
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const expected = new Map();
const rows = [];
const licensePattern = /^(licen[sc]e|copying|notice|copyright)([.\-_]|$)/i;

async function include(path, contents) {
	expected.set(path, contents);
	if (check) {
		assert.deepEqual(await readFile(join(root, path)), contents, `${path} is stale; run npm run licenses:generate.`);
	} else {
		await mkdir(resolve(root, path, '..'), { recursive: true });
		await writeFile(join(root, path), contents);
	}
}

for (const [location, metadata] of Object.entries(lock.packages)) {
	if (!location || metadata.dev || metadata.devOptional) {
		continue;
	}
	const directory = join(root, location);
	const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
	assert.equal(installed.version, metadata.version, `${location} differs from the lockfile; run npm ci.`);
	assert.equal(installed.license, metadata.license, `${location} has conflicting license metadata.`);
	const files = (await readdir(directory, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && licensePattern.test(entry.name))
		.sort((a, b) => a.name.localeCompare(b.name, 'en'));
	const notices = await Promise.all(files.map((entry) => readFile(join(directory, entry.name))));
	if (['react-remove-scroll-bar', 'lazy-val'].includes(installed.name) && notices.length === 0) {
		notices.push(await readFile(join(root, `resources/licenses/upstream/${installed.name}-MIT.txt`)));
	}
	assert.ok(notices.length > 0, `${installed.name} has no license text; review the upstream license before regenerating.`);
	assert.ok(metadata.license, `${installed.name} has no declared license.`);
	const links = [];
	for (const contents of notices) {
		const digest = createHash('sha256').update(contents).digest('hex').slice(0, 16);
		const path = `resources/licenses/npm/${digest}.txt`;
		await include(path, contents);
		links.push(`[${installed.name === 'lucide-react' ? 'ISC + MIT (Feather)' : metadata.license}](${path})`);
	}
	rows.push(`| ${installed.name} | ${installed.version} | ${links.join(' · ')} |`);
}

const metadata = JSON.parse(
	execFileSync('cargo', ['metadata', '--locked', '--format-version', '1', '--filter-platform', 'aarch64-apple-darwin', '--manifest-path', 'src-tauri/Cargo.toml'], {
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
	}),
);
const used = new Set(metadata.resolve.nodes.map((node) => node.id));
const rustRows = [];
for (const pkg of metadata.packages.filter((pkg) => pkg.source && used.has(pkg.id)).sort((a, b) => a.name.localeCompare(b.name))) {
	const directory = dirname(pkg.manifest_path);
	const candidates = (await readdir(directory, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && licensePattern.test(entry.name))
		.map((entry) => join(directory, entry.name))
		.sort();
	if (pkg.license_file && !candidates.includes(join(directory, pkg.license_file))) {
		candidates.push(join(directory, pkg.license_file));
	}
	const links = [];
	if (!candidates.length) {
		const license =
			pkg.name === 'alloc-stdlib'
				? 'alloc-stdlib-BSD-3-Clause.txt'
				: pkg.license?.includes('MIT')
					? 'standard-MIT-terms.txt'
					: pkg.license === 'MPL-2.0'
						? 'MPL-2.0.txt'
						: null;
		assert.ok(license, `${pkg.name} ${pkg.version} has no license text; inspect its upstream source.`);
		const headers = [];
		for (const filename of (await readdir(directory, { recursive: true })).sort()) {
			if (filename.endsWith('.rs')) {
				const lines = (await readFile(join(directory, filename), 'utf8')).split('\n').filter((line) => /copyright|SPDX-License-Identifier/i.test(line));
				if (lines.length) {
					headers.push(`${filename}:\n${lines.join('\n')}`);
				}
			}
		}
		const declaration = `Package: ${pkg.name} ${pkg.version}\nRepository: ${pkg.repository}\nLicense declared by upstream: ${pkg.license}\nAuthors (Cargo metadata): ${pkg.authors.join('; ')}\n\nThe published crate omits a standalone license file. Its original Cargo manifest, README and source copyright/license headers are retained below, followed by the declared license's standard terms. No copyright year is inferred.\n\n${await readFile(pkg.manifest_path, 'utf8')}\n\n${pkg.readme ? await readFile(join(directory, pkg.readme), 'utf8') : ''}\n\n${headers.join('\n\n')}\n\n${await readFile(join(root, 'resources/licenses/upstream', license), 'utf8')}`;
		const digest = createHash('sha256').update(declaration).digest('hex').slice(0, 16);
		const path = `resources/licenses/rust/${digest}.txt`;
		await include(path, Buffer.from(declaration));
		links.push(`[declaration, original notices and terms](${path})`);
	}
	for (const file of candidates) {
		const contents = await readFile(file);
		const digest = createHash('sha256').update(contents).digest('hex').slice(0, 16);
		const path = `resources/licenses/rust/${digest}.txt`;
		await include(path, contents);
		links.push(`[${basename(file)}](${path})`);
	}
	rustRows.push(`| ${pkg.name} | ${pkg.version} | ${pkg.license ?? 'See license file'} | ${links.join(' · ')} |`);
	if (pkg.license === 'MPL-2.0') {
		const archive = join(directory, '..', '..', '..', 'cache', basename(dirname(directory)), `${pkg.name}-${pkg.version}.crate`);
		await include(`resources/licenses/sources/${pkg.name}-${pkg.version}.crate`, await readFile(archive));
	}
}
const contents = `# Third-party notices / 第三方声明

Diffolio retains the original licenses and copyrights of the dependencies below. The project's custom license does not restrict rights granted by their original licenses. Full upstream texts are included at the linked local paths.

Diffolio 保留下列依赖的原始许可与版权。本项目自定义许可不限制第三方原许可授予的权利；完整原文附于下列本地链接。

## Frontend dependencies / 前端依赖

All production packages in package-lock.json, including transitive packages, are listed conservatively, even when compilation removes unused code.

| Package / 软件包 | Version / 版本 | License and notices / 许可与声明 |
| --- | --- | --- |
${rows.join('\n')}

## Rust dependencies / Rust 依赖

The locked Cargo dependency graph for macOS Apple Silicon is included conservatively, including its build tools and procedural macros. Cargo.lock pins the exact versions. System frameworks, system WebKit and fonts are supplied by macOS and are not redistributed.

Where upstream crates omit standalone license files, the inventory retains their declared license, authors, original manifest, README and source copyright/license headers alongside the declared license's standard terms. No copyright years are invented. The alloc-stdlib BSD notice comes from its exact upstream [commit](https://github.com/dropbox/rust-alloc-no-stdlib/blob/0a81fd6928ea3b33c8cd484aa4575d50ffb98012/LICENSE). Unmodified source archives for MPL-2.0 crates are included under resources/licenses/sources/; their original MPL terms continue to apply.

下表覆盖 Cargo.lock 中 macOS Apple Silicon 依赖图，包括构建工具与过程宏。系统框架、WebKit 和字体由 macOS 提供，本项目不附带这些系统组件。

| Crate | Version / 版本 | Declared license / 声明许可 | Full texts / 完整原文 |
| --- | --- | --- | --- |
${rustRows.join('\n')}

## Adapted components / 改编组件

Button, Popover, Command and Combobox in src/renderer/src/components/ui/ adapt shadcn/ui patterns with local styling and behavior. The [shadcn MIT license](resources/licenses/upstream/shadcn-ui-MIT.txt), Copyright (c) 2023 shadcn, is retained. Lucide's package notices include MIT notices for Feather-derived icons. react-remove-scroll-bar omits a license file from its npm archive; its [upstream MIT text](resources/licenses/upstream/react-remove-scroll-bar-MIT.txt) is retained from [commit 7301c160](https://github.com/theKashey/react-remove-scroll-bar/blob/7301c160fda44cb8cf2b9fdfde61efad35736196/LICENSE).

上述组件保留 shadcn/ui 的 MIT 许可与版权。Lucide 原文包含源自 Feather 的 MIT 声明。react-remove-scroll-bar 的 npm 包未附许可原文，因此保留上游完整 MIT 文本。

## Scope and distribution / 范围与分发

Diffolio's original code, documentation and artwork use the root LICENSE. This Tauri port preserves the original Diffolio frontend and artwork by Kelvin. It does not include Electron, Chromium, Node.js, Kaleidoscope assets or local replica research. Mentioning a third-party project does not imply affiliation or endorsement.

Diffolio 的原创代码、文档与图形适用根目录 LICENSE。本 Tauri 移植保留 Kelvin 的原有界面及原创图形，不附带 Electron、Chromium、Node.js、Kaleidoscope 素材或本地 replica 研究。

Packaged copies retain LICENSE, this notice and all linked texts under Diffolio.app/Contents/Resources/legal/ with the same relative layout.
`;
await include('THIRD_PARTY_NOTICES.md', Buffer.from(contents));
for (const group of ['npm', 'rust']) {
	const directory = join(root, 'resources/licenses', group);
	await mkdir(directory, { recursive: true });
	for (const filename of await readdir(directory)) {
		const path = `resources/licenses/${group}/${filename}`;
		if (!expected.has(path)) {
			assert.ok(!check, `${path} is obsolete; run npm run licenses:generate.`);
			await rm(join(root, path));
		}
	}
}
console.log(`${check ? 'Verified' : 'Generated'} notices for ${rows.length} npm packages and ${rustRows.length} Rust crates.`);
