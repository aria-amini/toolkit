import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

let database: NodePgDatabase | undefined

// Connects on first use, so pages without queries need no DATABASE_URL.
export function getDb() {
	if (database) return database

	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error(
			'DATABASE_URL is not set. Run `mise run bootstrap` to start the local database.',
		)
	}

	database = drizzle({ client: new Pool({ connectionString }) })

	return database
}
