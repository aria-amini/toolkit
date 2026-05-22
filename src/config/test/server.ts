// oxlint-disable no-empty-pattern
import { setupServer, type SetupServer } from 'msw/node'
import { test as baseTest } from 'vite-plus/test'
import type { TestAPI } from 'vite-plus/test'
import { findHandlerPath } from './internal'

export interface MswServerFixture {
	server: SetupServer
	_cleanup: void
}

let mswServer: SetupServer | undefined

async function ensureMswServer(): Promise<SetupServer> {
	if (!mswServer) {
		const { default: handlers } = await import(findHandlerPath())
		mswServer = setupServer(...handlers)
	}
	return mswServer
}

const extended = baseTest.extend<MswServerFixture>({
	server: [
		async ({}, use) => {
			const server = await ensureMswServer()
			server.listen({ onUnhandledRequest: 'bypass' })
			await use(server)
			server.close()
		},
		{ auto: true, scope: 'worker' },
	],
	_cleanup: [
		async ({ server }, use) => {
			await use()
			server.resetHandlers()
		},
		{ auto: true },
	],
})

export { afterEach, beforeEach, describe, expect, vi } from 'vite-plus/test'

// Vitest's extend() returns an internal CustomAPI type rather than TestAPI.
export const test = extended as TestAPI<MswServerFixture>
