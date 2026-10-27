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
	assert.ok(Math.abs(center.x + center.width / 2 - geometry.center) < 1, 'Result actions must stay centered on the full workspace.');
	assert.ok(left.x >= geometry.x && right.right <= geometry.right, 'Footer controls must fit the window.');
	return geometry;
}

export async function exerciseFooter(page, output, name) {
	await expect(page.locator('.editing-bar')).toHaveCount(0);
	await expect(page.getByRole('button', { name: '当前差异采用 A', exact: true })).toBeDisabled();
	await expect(page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true })).toBeDisabled();
	await expect(page.getByRole('button', { name: '另存结果', exact: true })).toBeDisabled();
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

export async function exerciseResultFooter(page, output, name) {
	const editor = page.getByRole('textbox', { name: '编辑比较结果', exact: true });
	const before = await editor.textContent();
	await page.getByRole('button', { name: '当前差异采用 A', exact: true }).click();
	await expect(editor).not.toHaveText(before);
	await expect(page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true })).toBeEnabled();
	await expect(page.locator('.footer-result-state')).toHaveText('未保存');
	await page.screenshot({ path: join(output, `${name}-footer-editing-light.png`) });
	await page.getByRole('button', { name: '撤销编辑 ⌘Z', exact: true }).click();
	await expect(editor).toHaveText(before);
	await expect(page.getByRole('button', { name: '重做编辑 ⌘⇧Z', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '重做编辑 ⌘⇧Z', exact: true }).click();
	await expect(editor).not.toHaveText(before);
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
	await page.getByRole('button', { name: '另存结果', exact: true }).click();
	await expect(page.locator('.save-notice')).toContainText('已保存');
	await expect(page.locator('.footer-result-state')).toHaveText('已保存');
	await footerGeometry(page);
	const feedback = await page.locator('.save-notice').boundingBox();
	assert.ok(feedback.x >= 0 && feedback.x + feedback.width <= 880, 'Long save names must fit above the footer.');
	await page.screenshot({ path: join(output, `${name}-footer-save-long.png`) });
	await page.getByRole('button', { name: '显示文件信息', exact: true }).click();
	await page.setViewportSize({ width: 964, height: 564 });
}
