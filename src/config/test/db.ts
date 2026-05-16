// oxlint-disable no-empty-pattern
import { setupServer, SetupServer } from 'msw/node'
import { resolve } from 'node:path'
import { test as baseTest } from 'vitest'
import type { TestAPI } from 'vitest'
import type { Database } from './database'
import { seedDatabase } from './database'
import { findHandlerPath } from './internal'

const DEFAULT_SCHEMA_PATH = 'src/db/tables.ts'
const DEFAULT_MIGRATIONS_PATH = 'src/db/migrations'
const DEFAULT_IMAGE = 'postgres:17'

export interface DbFixture {
	server: SetupServer
	_cleanup: void
	db: Database
	seedFunction: (db: Database) => Promise<void>
}

let mswServer: SetupServer | undefined

async function ensureMswServer(): Promise<SetupServer> {
	if (!mswServer) {
		const { default: handlers } = await import(findHandlerPath())
		mswServer = setupServer(...handlers)
	}
	return mswServer
}

let extended = baseTest.extend<DbFixture>({
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
	seedFunction: [async ({}, use) => use(async () => {}), { scope: 'file' }],
	db: [
		async ({ seedFunction }: Pick<DbFixture, 'seedFunction'>, use) => {
			const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
			const { drizzle } = await import('drizzle-orm/node-postgres')
			const { Wait } = await import('testcontainers')
			const { Pool } = await import('pg')

			const schemaPath = resolve(process.cwd(), DEFAULT_SCHEMA_PATH)
			const migrationsFolder = resolve(process.cwd(), DEFAULT_MIGRATIONS_PATH)

			const container = await new PostgreSqlContainer(DEFAULT_IMAGE)
				.withWaitStrategy(Wait.forHealthCheck())
				.start()
			const db = drizzle({
				client: new Pool({ connectionString: container.getConnectionUri() }),
			}) as Database

			try {
				await seedDatabase(db, { schemaPath, migrationsFolder, seedFunction })
				await use(db)
			} finally {
				await db.$client.end()
				await container.stop()
			}
		},
		{ scope: 'file' },
	],
})

export { afterEach, beforeEach, describe, expect, vi } from 'vitest'

export const test = extended as TestAPI<DbFixture>

export function initDb(seedFunction: (db: Database) => Promise<void>) {
	extended = extended.override({
		seedFunction: [async ({}, use) => use(seedFunction), { scope: 'file' }],
	}) as typeof extended
}
