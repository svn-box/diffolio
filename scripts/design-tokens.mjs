import { readFile, writeFile, mkdir } from 'node:fs/promises';

const css = await readFile('src/renderer/src/tokens.css', 'utf8');
const light = Object.fromEntries([...css.split(":root[data-appearance='dark']")[0].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2]]));
const dark = Object.fromEntries(
	[
		...css
			.split(":root[data-appearance='dark']")[1]
			.split('@media')[0]
			.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g),
	].map((match) => [match[1], match[2]]),
);
const colors = {};
const pairs = [];

for (const [theme, values] of [
	['light', light],
	['dark', dark],
]) {
	for (const [name, value] of Object.entries(values)) {
		colors[`${theme}-${name}`] = value;
	}
	for (const background of ['bg', 'surface', 'chrome', 'sidebar', 'accent-soft', 'diff-added', 'diff-deleted', 'diff-modified']) {
		for (const foreground of ['text', 'text-muted']) {
			pairs.push([`${theme}-${foreground}`, `${theme}-${background}`]);
		}
	}
	for (const background of ['bg', 'diff-added', 'diff-deleted', 'diff-modified']) {
		for (const foreground of ['syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-property']) {
			pairs.push([`${theme}-${foreground}`, `${theme}-${background}`]);
		}
	}
	for (const foreground of ['accent', 'success', 'danger', 'modified']) {
		pairs.push([`${theme}-${foreground}`, `${theme}-bg`]);
	}
	for (const background of ['diff-added-strong', 'diff-deleted-strong', 'diff-modified-strong']) {
		pairs.push([`${theme}-text`, `${theme}-${background}`]);
	}
	pairs.push([`${theme}-on-accent`, `${theme}-accent`], [`${theme}-accent`, `${theme}-accent-soft`], [`${theme}-border-input`, `${theme}-bg`, 'ui']);
}

function luminance(hex) {
	const channels = [1, 3, 5]
		.map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
		.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

const results = pairs.map(([foreground, background, type]) => {
	const a = luminance(colors[foreground]);
	const b = luminance(colors[background]);
	const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
	return { foreground, background, ratio: Number(ratio.toFixed(2)), pass: ratio >= (type === 'ui' ? 3 : 4.5) };
});
await mkdir('replica/design', { recursive: true });
await writeFile(
	'replica/design/tokens.json',
	JSON.stringify(
		{
			color: colors,
			pairs,
			font: { sans: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', mono: 'SFMono-Regular, Menlo, Consolas, monospace' },
			space: [0, 4, 8, 12, 16, 20, 24, 32],
			radius: { control: 7, dialog: 15 },
			layout: {
				toolbar: 52,
				sidebar: 180,
				sidebarScope: 'welcome',
				comparisonSidebar: 0,
				tabs: 31,
				tabsVisibility: 'multiple-sessions',
				paths: 30,
				status: 28,
				welcomeStage: 195,
				setupInputsWidth: 632,
			},
		},
		null,
		2,
	) + '\n',
);
await writeFile('replica/design/tokens.css', css);
await writeFile('replica/design/tailwind-map.json', JSON.stringify(Object.fromEntries(Object.keys(light).map((name) => [name, `var(--${name})`])), null, 2) + '\n');
await writeFile('replica/design/contrast.json', JSON.stringify({ pairs: results.length, failures: results.filter((result) => !result.pass).length, results }, null, 2) + '\n');
for (const result of results.filter((result) => !result.pass)) {
	console.error('FAIL', result.foreground, 'on', result.background, result.ratio);
}
console.log(`${results.length} contrast pairs, ${results.filter((result) => !result.pass).length} AA failures`);
if (results.some((result) => !result.pass)) {
	process.exitCode = 1;
}
