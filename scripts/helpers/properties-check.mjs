import assert from 'node:assert/strict';
import { expect } from 'playwright/test';
import { join } from 'node:path';

export async function exerciseProperties(page, output, name, kind) {
	const trigger = page.getByRole('button', { name: '显示文件信息', exact: true });
	const dialog = page.getByRole('dialog', { name: '文件属性', exact: true });
	const row = (label) => dialog.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
	const before = await page.locator('.content-main').boundingBox();
	await trigger.click();
	await expect(dialog).toBeVisible();
	assert.deepEqual(await page.locator('.content-main').boundingBox(), before, 'Properties must not resize the comparison.');
	await expect(dialog.getByRole('columnheader')).toHaveCount(3);
	await expect(row('权限')).toContainText(kind === 'folder' ? '—' : '-rw-r--r--');
	await expect(row('编码')).toHaveCount(kind === 'text' ? 1 : 0);
	await expect(row('大小')).toHaveCount(kind === 'folder' ? 0 : 1);
	if (kind === 'folder') {
		await expect(row('项目数')).toContainText('2');
	} else {
		await expect(row('修改时间')).toContainText('2026/10/26');
	}
	await dialog.getByRole('button', { name: 'A：在 Finder 中显示', exact: true }).click();
	assert.ok((await page.evaluate(() => window.__revealedPaths)).at(-1));
	await page.screenshot({ path: join(output, `${name}-properties-${kind}.png`) });
	const bounds = await dialog.boundingBox();
	const viewport = page.viewportSize();
	assert.ok(bounds.x >= 12 && bounds.x + bounds.width <= viewport.width - 12 && bounds.y + bounds.height <= viewport.height - 12);
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
	if (kind === 'text') {
		await page.evaluate(() => window.diffolio.preferences({ appearance: 'light' }));
		await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
		await trigger.click();
		await page.screenshot({ path: join(output, `${name}-properties-light.png`) });
		await page.keyboard.press('Escape');
		await page.setViewportSize({ width: 880, height: 540 });
		await page.evaluate(async () => {
			const { workspaceStore } = await import('/src/state/workspace.ts');
			workspaceStore.setState((state) => ({
				sessions: state.sessions.map((session) =>
					session.id !== state.activeId ? session : { ...session, a: { ...session.a, name: '很长的文件名称_' + 'comparison'.repeat(30) + '.ts' } },
				),
			}));
		});
		await trigger.click();
		await expect(row('名称').getByRole('cell').first()).toHaveAttribute('title', /很长的文件名称/);
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
		await page.screenshot({ path: join(output, `${name}-properties-minimum-long.png`) });
		await page.keyboard.press('Escape');
		await page.setViewportSize({ width: 964, height: 564 });
		await page.evaluate(() => window.diffolio.preferences({ appearance: 'dark' }));
	}
	await trigger.click();
	await page.locator('.window-heading').click();
	await expect(dialog).toHaveCount(0);
}
