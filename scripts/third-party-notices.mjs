import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const check = process.argv.includes('--check');
assert.ok(
	process.argv.slice(2).every((argument) => argument === '--check'),
	'Only --check is supported.',
);
const root = resolve('.');
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const definition = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
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
	const files = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile() && licensePattern.test(entry.name));
	const notices = await Promise.all(files.map((entry) => readFile(join(directory, entry.name))));
	if (installed.name === 'react-remove-scroll-bar' && notices.length === 0) {
		notices.push(await readFile(join(root, 'resources/licenses/upstream/react-remove-scroll-bar-MIT.txt')));
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

const electron = JSON.parse(await readFile(join(root, 'node_modules/electron/package.json'), 'utf8'));
assert.equal(electron.version, definition.devDependencies.electron, 'Electron version differs from package.json.');
await include('resources/licenses/electron-MIT.txt', await readFile(join(root, 'node_modules/electron/dist/LICENSE')));
const contents = `# Third-party notices / 第三方声明

Diffolio includes third-party software and adapted components listed below. They retain their original licenses and copyrights. Diffolio's custom license does not restrict rights granted by these third-party licenses. Full license and copyright texts are included at the linked local paths, including Lucide's MIT notices for Feather-derived icons and the complete Apache 2.0 license for class-variance-authority.

Diffolio 使用下列第三方软件与改编组件，其版权和许可归各自权利人所有。Diffolio 的自定义许可不限制第三方原许可授予的权利。下列本地链接保留完整许可与版权文本，包括 Lucide 中源自 Feather 的 MIT 声明，以及 class-variance-authority 的完整 Apache 2.0 条款。

## Application dependencies / 应用依赖

This inventory conservatively covers every production dependency in package-lock.json, including transitive dependencies; some may be removed from a particular bundle during compilation. Development-only tools are not part of this inventory. Their licenses remain in their own installed packages.

清单覆盖 package-lock.json 中的全部生产依赖与传递依赖；部分依赖可能在具体构建中被移除。仅用于开发的工具不在本清单中，其许可保留在各自安装包内。

| Package / 软件包 | Version / 版本 | Full license and notices / 完整许可与声明 |
| --- | --- | --- |
${rows.join('\n')}

## Adapted components / 改编组件

The Button, Popover, Command, and Combobox components in src/renderer/src/components/ui/ adapt shadcn/ui component patterns, with local layout, styling, and behavior changes. The upstream [MIT license](resources/licenses/upstream/shadcn-ui-MIT.txt), Copyright (c) 2023 shadcn, is preserved. [Upstream source](https://github.com/shadcn-ui/ui).

上述 UI 组件参考并改编了 shadcn/ui，包含本项目的布局、样式和交互调整，保留其 MIT 许可与版权声明。

react-remove-scroll-bar declares MIT in its package metadata and README but omits a license file from its npm archive. Its [upstream MIT text](resources/licenses/upstream/react-remove-scroll-bar-MIT.txt) is retained from [upstream commit 7301c160fda44cb8cf2b9fdfde61efad35736196](https://github.com/theKashey/react-remove-scroll-bar/blob/7301c160fda44cb8cf2b9fdfde61efad35736196/LICENSE).

react-remove-scroll-bar 的 npm 包声明 MIT，但未附许可文件，因此同时保留上游仓库的完整 MIT 文本。

## Electron runtime / Electron 运行时

The macOS application embeds Electron ${electron.version}. Its [MIT license](resources/licenses/electron-MIT.txt) is included here. Electron's runtime also contains Chromium, Node.js, V8, and other third-party components with separate licenses. The exact runtime distribution supplies the full aggregate notices as LICENSES.chromium.html; electron-builder preserves that file and LICENSE.electron.txt in Diffolio.app/Contents/Resources/. Preserve both files when redistributing the app. This npm inventory does not replace those runtime notices.

macOS 应用内嵌 Electron ${electron.version}，其 MIT 许可见上方链接。Chromium、Node.js、V8 等运行时组件的完整声明由对应 Electron 发行包提供，打包后保留在应用 Contents/Resources/ 下的 LICENSES.chromium.html 和 LICENSE.electron.txt。再次分发时须一并保留；本依赖清单不替代运行时声明。

## Scope and distribution / 范围与分发

Diffolio's original code, documentation, and artwork are covered by the root LICENSE. System fonts and macOS interface conventions do not imply redistribution of Apple font files or assets. Kaleidoscope is a design reference; its proprietary assets and local research are not licensed or distributed by this project. Mentioning a third-party project does not imply affiliation or endorsement.

Diffolio 的原创代码、文档和图形适用根目录 LICENSE。系统字体和 macOS 界面约定不表示本项目分发 Apple 字体或素材。Kaleidoscope 为设计参考，其专有素材与本地研究不属于本项目授权和分发内容。提及第三方项目不代表存在关联或获得背书。

Packaged copies include LICENSE, this notice, and the linked license texts under Diffolio.app/Contents/Resources/legal/. Relative links within that directory preserve the repository layout.

应用包在 Contents/Resources/legal/ 中附带本项目许可、本声明与链接的完整许可文本，目录内保留可离线阅读的相对链接。
`;
await include('THIRD_PARTY_NOTICES.md', Buffer.from(contents));

const generatedDirectory = join(root, 'resources/licenses/npm');
for (const filename of await readdir(generatedDirectory)) {
	const path = `resources/licenses/npm/${filename}`;
	if (!expected.has(path)) {
		assert.ok(!check, `${path} is obsolete; run npm run licenses:generate.`);
		await rm(join(root, path));
	}
}
console.log(`${check ? 'Verified' : 'Generated'} notices for ${rows.length} production packages, shadcn/ui, and Electron ${electron.version}.`);
