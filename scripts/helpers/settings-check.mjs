import { expect } from 'playwright/test';
import { join } from 'node:path';
import assert from 'node:assert/strict';

export async function exerciseUpdates(page, output, name, version) {
	await expect(page.locator('.sidebar-bottom button')).toHaveCount(1);
	await expect(page.locator('.sidebar-bottom')).toHaveText('设置');
	await page.getByRole('button', { name: '更新日志', exact: true }).click();
	await expect(page.locator('.release-notes h1').first()).toHaveText(`Diffolio ${version}`);
	await expect(page.locator('.home-bands')).toHaveCount(0);
	assert.ok(
		(await page.evaluate(() => window.__updateActions)).every((action) => action === 'status'),
		'Opening release notes must not check or download updates.',
	);
	await page.getByRole('button', { name: '检查更新', exact: true }).click();
	await expect(page.getByRole('status')).toHaveText(`当前 ${version} 已是最新版本`);
	await page.screenshot({ path: join(output, `${name}-updates.png`) });
	await page.evaluate(() => window.__setUpdateState({ phase: 'error', message: '无法检查更新，请稍后重试。' }));
	await expect(page.getByRole('status')).toHaveText('无法检查更新，请稍后重试。');
	await expect(page.getByRole('button', { name: '检查更新', exact: true })).toBeEnabled();
	await page.evaluate(() => window.__setUpdateState({ phase: 'downloading', percent: 37, version: '9.0.0' }));
	await expect(page.getByRole('progressbar', { name: '更新下载进度' })).toHaveAttribute('value', '37');
	await expect(page.getByRole('button', { name: '正在下载 37%', exact: true })).toBeDisabled();
	await page.evaluate(() => window.__setUpdateState({ phase: 'idle' }));
	await page.setViewportSize({ width: 880, height: 540 });
	await expect(page.getByRole('button', { name: '检查更新', exact: true })).toBeInViewport();
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
	await page.screenshot({ path: join(output, `${name}-updates-minimum.png`) });
	await page.setViewportSize({ width: 964, height: 564 });
	await page.getByRole('button', { name: '最近比较', exact: true }).click();
}

export async function exerciseSettings(page, output, name) {
	if (name === 'electron') {
		await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
		await page.getByRole('button', { name: '深色', exact: true }).click();
		await page.getByRole('combobox').click();
		await page.getByRole('option', { name: '14 px', exact: true }).click();
		await page.getByRole('button', { name: '关闭设置', exact: true }).click();
		return;
	}
	const popup = page.waitForEvent('popup');
	await page.getByRole('button', { name: '设置 ⌘,', exact: true }).click();
	const settings = await popup;
	await settings.setViewportSize({ width: 568, height: 348 });
	await expect(settings.getByRole('tab', { name: '通用', exact: true })).toHaveAttribute('aria-selected', 'true');
	await expect(settings.locator('dialog, .settings-footer')).toHaveCount(0);
	await expect(settings.locator('body')).not.toContainText(/让工作区适应|为专注的比较而设计|自动换行|折叠不变区域|软件更新|查看更新/);
	await settings.screenshot({ path: join(output, `${name}-settings-light.png`) });
	await settings.getByRole('tab', { name: '通用', exact: true }).focus();
	await settings.keyboard.press('ArrowRight');
	await expect(settings.getByRole('tab', { name: '文本', exact: true })).toBeFocused();
	await settings.getByRole('combobox').click();
	await settings.keyboard.press('Escape');
	await expect(settings.getByRole('combobox')).toBeFocused();
	await settings.getByRole('combobox').click();
	await settings.getByRole('option', { name: '14 px', exact: true }).click();
	await expect(settings.getByRole('combobox')).toHaveText('14 px');
	await settings.screenshot({ path: join(output, `${name}-settings-text.png`) });
	await settings.getByRole('tab', { name: '通用', exact: true }).click();
	await settings.getByRole('button', { name: '深色', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
	await expect(settings.locator('html')).toHaveAttribute('data-appearance', 'dark');
	await settings.screenshot({ path: join(output, `${name}-settings-dark.png`) });
	const closed = settings.waitForEvent('close');
	// The keyup can race the expected popup destruction in WebKit.
	await settings.keyboard.press('Escape').catch(() => {});
	await closed;
	await page.getByRole('button', { name: '返回最近比较', exact: true }).click();
	await page.getByRole('button', { name: '更新日志', exact: true }).click();
	await expect(page.locator('.updates-page')).toBeVisible();
	await page.getByRole('button', { name: '继续比较', exact: true }).click();
	await expect(page.getByRole('textbox', { name: '编辑比较结果', exact: true })).toBeVisible();
}
