// oxlint-disable typescript-eslint/triple-slash-reference
/// <reference path="../virtual-modules.d.ts" />
// oxlint-disable no-empty-pattern
import { setupWorker, type SetupWorker } from 'msw/browser'
import { test as baseTest } from 'vitest'
import type { TestAPI } from 'vitest'

export interface MswBrowserFixture {
	worker: SetupWorker
	_cleanup: void
}

let workerSingleton: SetupWorker | undefined

async function ensureWorker(): Promise<SetupWorker> {
	if (!workerSingleton) {
		const { default: handlers } = await import('@test/handlers')
		workerSingleton = setupWorker(...handlers)
	}
	return workerSingleton
}

const extended = baseTest.extend<MswBrowserFixture>({
	worker: [
		async ({}, use) => {
			const worker = await ensureWorker()
			await worker.start({ quiet: true, onUnhandledRequest: 'bypass' })
			await use(worker)
			worker.stop()
		},
		{ auto: true, scope: 'worker' },
	],
	_cleanup: [
		async ({ worker }, use) => {
			await use()
			worker.resetHandlers()
		},
		{ auto: true },
	],
})

export { afterEach, beforeEach, describe, expect, vi } from 'vitest'

export const test = extended as TestAPI<MswBrowserFixture>
