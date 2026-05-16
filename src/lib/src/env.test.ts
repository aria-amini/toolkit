import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createEnv } from './env.js'

describe.sequential('createEnv', () => {
	const cwd = process.cwd()
	const originalDatabaseUrl = process.env.DATABASE_URL
	const originalRailwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME
	let tempDir = ''

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'aamini-lib-env-'))
		process.chdir(tempDir)
		writeFileSync(join(tempDir, '.env'), 'DATABASE_URL=postgres://from-file\n')
		process.env.RAILWAY_ENVIRONMENT_NAME = 'production'
		process.env.DATABASE_URL = 'postgres://from-railway'
	})

	afterEach(() => {
		process.chdir(cwd)
		if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
		else process.env.DATABASE_URL = originalDatabaseUrl
		if (originalRailwayEnvironmentName === undefined)
			delete process.env.RAILWAY_ENVIRONMENT_NAME
		else process.env.RAILWAY_ENVIRONMENT_NAME = originalRailwayEnvironmentName
		if (tempDir) rmSync(tempDir, { recursive: true, force: true })
	})

	it('keeps injected env values ahead of dotenv files', () => {
		const env = createEnv(
			z.object({
				DATABASE_URL: z.string(),
			}),
		)

		expect(env.DATABASE_URL).toBe('postgres://from-railway')
		expect(process.env.DATABASE_URL).toBe('postgres://from-railway')
		expect(readFileSync(join(tempDir, '.env'), 'utf8')).toContain('from-file')
	})
})
