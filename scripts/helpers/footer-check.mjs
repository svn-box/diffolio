import assert from 'node:assert/strict';
import { expect } from 'playwright/test';
import { join } from 'node:path';

export async function footerGeometry(page) {
	const geometry = await page.evaluate(() => {
		const footer = document.querySelector('.text-statusbar');
		const boxes = ['.footer-display', '.footer-result', '.footer-navigation'].map((selector) => {
			const rect = footer.querySelector(selector).getBoundingClientRect();
			return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, width: rect.width };
		});
		const rect = footer.getBoundingClientRect();
		return { height: rect.height, x: rect.x, right: rect.right, center: rect.x + rect.width / 2, boxes, overflow: document.documentElement.scrollWidth > innerWidth };
	});
	assert.equal(geometry.height, 36, 'Text controls stay in one 36px row.');
	assert.equal(geometry.overflow, false);
	const [left, center, right] = geometry.boxes;
	assert.ok(left.right < center.x && center.right < right.x, 'Footer groups must remain separate.');
	assert.ok(Math.abs(center.x + center.width / 2 - geometry.center) < 1, 'Result actions must stay centered on the comparison surface.');
	assert.ok(left.x >= geometry.x && right.right <= geometry.right, 'Footer controls must fit the window.');
	return geometry;
}

export async function exerciseFooter(page, output, name) {
	await expect(page.locator('.editing-bar')).toHaveCount(0);
	await expect(page.locator('.footer-result button')).toHaveCount(6);
	assert.deepEqual(await page.locator('.footer-result button').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))), [
		'编辑 A',
		'Keep Both (A then B)',
		'Copy A to B',
		'Copy B to A',
		'Keep Both (B then A)',
		'编辑 B',
	]);
	await expect(page.getByRole('button', { name: 'Copy A to B', exact: true })).toBeEnabled();
	await footerGeometry(page);
	for (const label of ['长行自动换行', '折叠不变区域']) {
		const toggle = page.getByRole('button', { name: label, exact: true });
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	}
	await page.getByRole('button', { name: '比较概览', exact: true }).click();
	const overview = page.getByRole('dialog', { name: '比较概览', exact: true });
	await expect(overview).toBeVisible();
	await expect(overview.locator('.diff-summary > span')).toHaveCount(3);
	await expect(overview.locator('.footer-format-list > div')).toHaveCount(2);
	await page.screenshot({ path: join(output, `${name}-footer-overview.png`) });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: '比较概览', exact: true })).toBeFocused();
	await page.getByRole('button', { name: '下一处差异', exact: true }).click();
	await page.getByRole('button', { name: '下一处差异', exact: true }).click();
	await expect(page.locator('.difference-count')).toContainText('2 /');
	await page.getByRole('button', { name: '上一处差异', exact: true }).click();
	await expect(page.locator('.difference-count')).toContainText('1 /');
	await page.setViewportSize({ width: 880, height: 540 });
	await page.getByRole('button', { name: '显示文件信息', exact: true }).click();
	await expect(page.locator('.inspector')).toBeVisible();
	await footerGeometry(page);
	await page.screenshot({ path: join(output, `${name}-footer-minimum-readonly.png`) });
	await page.getByRole('button', { name: '显示文件信息', exact: true }).click();
	await page.setViewportSize({ width: 964, height: 564 });
}

export async function footerAction(page, side, action) {
	await page.getByRole('button', { name: `编辑 ${side}`, exact: true }).click();
	await expect(page.getByRole('dialog', { name: `${side} 编辑操作`, exact: true })).toBeVisible();
	await page.getByRole('button', { name: `${action} ${side}`, exact: true }).click();
	if (action !== '另存') {
		await expect(page.getByRole('textbox', { name: `编辑 ${side} 副本`, exact: true })).toBeFocused();
	}
}

async function draftContent(page, side) {
	return page.evaluate(async (side) => {
		const { workspaceStore } = await import('/src/state/workspace.ts');
		const state = workspaceStore.getState();
		return state.sessions.find((session) => session.id === state.activeId).drafts[side].content;
	}, side);
}

export async function exerciseResultFooter(page, output, name) {
	const a = page.locator('.cm-merge-a .cm-content');
	const b = page.locator('.cm-merge-b .cm-content');
	const originalA = await draftContent(page, 'a');
	const originalB = await draftContent(page, 'b');
	for (const [label, target] of [
		['Copy A to B', 'B'],
		['Keep Both (A then B)', 'B'],
		['Copy B to A', 'A'],
		['Keep Both (B then A)', 'A'],
	]) {
		await page.getByRole('button', { name: label, exact: true }).click();
		await expect.poll(() => draftContent(page, target.toLowerCase())).not.toBe(target === 'A' ? originalA : originalB);
		await expect(page.locator(`.footer-edit-button[data-side="${target.toLowerCase()}"]`)).toHaveAttribute('data-dirty', 'true');
		await footerAction(page, target, '撤销');
		await expect.poll(() => draftContent(page, 'a')).toBe(originalA);
		await expect.poll(() => draftContent(page, 'b')).toBe(originalB);
	}
	await footerAction(page, 'B', '重做');
	await expect.poll(() => draftContent(page, 'b')).not.toBe(originalB);
	await a.focus();
	await page.keyboard.press('Meta+End');
	await page.keyboard.insertText('\nA 独立副本 🔎');
	await expect(a).toContainText('A 独立副本');
	const editedB = await draftContent(page, 'b');
	await page.getByRole('button', { name: '统一布局 ⌘2', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copy B to A', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: '编辑 A', exact: true }).click();
	await expect(page.locator('.cm-editor')).toHaveCount(2);
	await expect(a).toContainText('A 独立副本');
	await footerAction(page, 'A', '撤销');
	await expect.poll(() => draftContent(page, 'a')).toBe(originalA);
	await expect.poll(() => draftContent(page, 'b')).toBe(editedB);
	await page.screenshot({ path: join(output, `${name}-footer-editing-light.png`) });
	await page.getByRole('button', { name: '编辑 B', exact: true }).click();
	await expect(page.getByRole('button', { name: '撤销 B', exact: true })).toBeEnabled();
	await expect(page.getByRole('button', { name: '重做 B', exact: true })).toBeDisabled();
	await page.screenshot({ path: join(output, `${name}-footer-edit-menu.png`) });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: '编辑 B', exact: true })).toBeFocused();
	await page.setViewportSize({ width: 880, height: 540 });
	await page.getByRole('button', { name: '显示文件信息', exact: true }).click();
	await footerGeometry(page);
	await page.screenshot({ path: join(output, `${name}-footer-minimum-editing.png`) });
	await page.evaluate(() => window.diffolio.preferences({ appearance: 'dark' }));
	await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
	await page.screenshot({ path: join(output, `${name}-footer-minimum-dark.png`) });
	await page.evaluate(() => window.diffolio.preferences({ appearance: 'light' }));
	await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
	await page.evaluate(() => {
		window.__savePath = `/tmp/${'result'.repeat(40)}.ts`;
	});
	await footerAction(page, 'B', '另存');
	await expect(page.locator('.save-notice')).toContainText('已保存 B');
	await expect(page.locator('.footer-edit-button[data-side="b"]')).toHaveAttribute('data-dirty', 'false');
	await footerGeometry(page);
	const feedback = await page.locator('.save-notice').boundingBox();
	assert.ok(feedback.x >= 0 && feedback.x + feedback.width <= 690, 'Save feedback must fit the comparison surface.');
	await page.screenshot({ path: join(output, `${name}-footer-save-long.png`) });
	await page.getByRole('button', { name: '显示文件信息', exact: true }).click();
	await page.setViewportSize({ width: 964, height: 564 });
}
