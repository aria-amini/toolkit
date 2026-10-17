import { expect, test } from '@playwright/test'

// Baselines depend on the OS and fonts, so the template ships none. Record
// them once with `BASE_URL=<site url> VISUAL=1 pnpm e2e:update`, commit `e2e/__screenshots__`,
// then delete the skip so CI compares every Preview against them.
test.skip(
	process.env.VISUAL !== '1',
	'Record baselines with VISUAL=1 pnpm e2e:update first.',
)

test('home looks the same', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' })

	await expect(page).toHaveScreenshot('home.png', { fullPage: true })
})
