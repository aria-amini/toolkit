import { setupServer, SetupServer } from 'msw/node'
import { resolve } from 'node:path'
import { test as baseTest } from 'vite-plus/test'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'

const DEFAULT_SCHEMA_PATH = 'src/db/tables.ts'
const DEFAULT_MIGRATIONS_PATH = 'src/db/migrations'
const DEFAULT_IMAGE = 'postgres:17'

export interface DbConfig {
	schemaPath?: string
	migrationsPath?: string
	postgresImage?: string
}

let dbConfig: DbConfig = {}

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

export const test = baseTest.extend<DbFixture>({
	server: [
		async ({ }, use) => {
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
	seedFunction: [async ({ }, use) => use(async () => { }), { scope: 'file' }],
	db: [
		async ({ seedFunction }: Pick<DbFixture, 'seedFunction'>, use) => {
			const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
			const { drizzle } = await import('drizzle-orm/node-postgres')
			const { Wait } = await import('testcontainers')
			const { Pool } = await import('pg')

			const schemaPath = resolve(
				process.cwd(),
				dbConfig.schemaPath ?? DEFAULT_SCHEMA_PATH,
			)
			const migrationsFolder = resolve(
				process.cwd(),
				dbConfig.migrationsPath ?? DEFAULT_MIGRATIONS_PATH,
			)

			const container = await new PostgreSqlContainer(
				dbConfig.postgresImage ?? DEFAULT_IMAGE,
			)
				.withWaitStrategy(Wait.forHealthCheck())
				.start()
			const client = new Pool({
				connectionString: container.getConnectionUri(),
			})
			const db = Object.assign(drizzle({ client }), { $client: client })

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

export { afterEach, beforeEach, describe, expect, vi } from 'vite-plus/test'

export function initDb(
	seedFunction: (db: Database) => Promise<void>,
	config: DbConfig = {},
) {
	dbConfig = config
	extended = extended.override({
		seedFunction: [async ({ }, use) => use(seedFunction), { scope: 'file' }],
		// Vitest's override() returns a broad union; narrow back to the fixture type.
	}) as typeof extended
}

const DEFAULT_EXTENSIONS = ['pg_trgm']

export type Database = NodePgDatabase & {
	$client: Pool
}

export interface SeedDatabaseOptions {
	schemaPath: string
	migrationsFolder: string
	seedFunction?: (db: Database) => Promise<void>
	extensions?: string[]
}

export async function seedDatabase(
	db: Database,
	{
		schemaPath,
		migrationsFolder,
		seedFunction,
		extensions = DEFAULT_EXTENSIONS,
	}: SeedDatabaseOptions,
) {
	const { migrate } = await import('drizzle-orm/node-postgres/migrator')
	const { reset } = await import('drizzle-seed')

	const schema = await import(/* @vite-ignore */ schemaPath)

	for (const ext of extensions) {
		await db.execute(`CREATE EXTENSION IF NOT EXISTS "${ext}"`)
	}
	await migrate(db, { migrationsFolder })
	await reset(db, schema)
	if (seedFunction) await seedFunction(db)
}
