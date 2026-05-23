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
		process.env.RAILWAY_ENVIRONMENT_NAME = 'production'
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
		writeFileSync(join(tempDir, '.env'), 'DATABASE_URL=postgres://from-file\n')
		process.env.DATABASE_URL = 'postgres://from-railway'

		const env = createEnv(
			z.object({
				DATABASE_URL: z.string(),
			}),
		)

		expect(env.DATABASE_URL).toBe('postgres://from-railway')
		expect(process.env.DATABASE_URL).toBe('postgres://from-railway')
		expect(readFileSync(join(tempDir, '.env'), 'utf8')).toContain('from-file')
	})

	it('loads dotenv files from lowest to highest precedence', () => {
		delete process.env.DATABASE_URL
		writeFileSync(join(tempDir, '.env'), 'DATABASE_URL=postgres://from-env\n')
		writeFileSync(
			join(tempDir, '.env.local'),
			'DATABASE_URL=postgres://from-local\n',
		)
		writeFileSync(
			join(tempDir, '.env.production'),
			'DATABASE_URL=postgres://from-production\n',
		)
		writeFileSync(
			join(tempDir, '.env.production.local'),
			'DATABASE_URL=postgres://from-production-local\n',
		)

		const env = createEnv(
			z.object({
				DATABASE_URL: z.string(),
			}),
		)

		expect(env.DATABASE_URL).toBe('postgres://from-production-local')
	})

	it('does not validate until an env value is read', () => {
		delete process.env.DATABASE_URL

		const env = createEnv(
			z.object({
				DATABASE_URL: z.string(),
			}),
		)

		expect(() => env).not.toThrow()
		expect(() => env.DATABASE_URL).toThrow(/expected string/)
	})

	it('ignores empty dotenv values', () => {
		delete process.env.DATABASE_URL
		writeFileSync(join(tempDir, '.env.production'), 'DATABASE_URL=\n')

		const env = createEnv(
			z.object({
				DATABASE_URL: z.string(),
			}),
		)

		expect(() => env.DATABASE_URL).toThrow(/expected string/)
	})
})
