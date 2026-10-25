import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { execaSync } from 'execa'
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from 'vite-plus/test'

import {
	hashPort,
	readEnvFile,
	sanitizeDatabaseName,
	setupWorkspace,
	slugify,
	updateEnvFile,
	worktrunkHash,
} from './workspace.ts'

// Expected values come from Rust's DefaultHasher (SipHash 1-3, zero keys),
// which Worktrunk uses, hashing the same strings.
describe('worktrunkHash', () => {
	test.each([
		['', 3476900567878811119n],
		['a', 8186225505942432243n],
		['main', 14467718814232352107n],
		['my-feature', 4485956394225888027n],
		['toolkit:bootstrap-cli', 5419380565972753230n],
	])('hashes %j like Rust', (value, expected) => {
		expect(worktrunkHash(value)).toBe(expected)
	})
})

test('hashPort maps a hash into 10000-19999', () => {
	expect(hashPort('main')).toBe(12107)
	expect(hashPort('toolkit:main')).toBe(16198)
	expect(hashPort('db-toolkit:main')).toBe(10667)
})

describe('sanitizeDatabaseName', () => {
	test.each([
		['main', 'main_vfz'],
		['My Feature/Branch', 'my_feature_branch_17z'],
		// A database name must start with a letter.
		['123-fix', 'w_123_fix_37y'],
		['', 'workspace_j7i'],
		// 44 characters of the name, then the hash of the full value.
		[
			'a-very-long-workspace-name-that-keeps-going-past-the-forty-four-character-limit',
			'a_very_long_workspace_name_that_keeps_going_xip',
		],
	])('turns %j into %j', (value, expected) => {
		expect(sanitizeDatabaseName(value)).toBe(expected)
	})
})

describe('slugify', () => {
	test.each([
		['My App', 'my-app'],
		['--a__b--', 'a-b'],
		['feature/Login Page', 'feature-login-page'],
		['!!!', 'workspace'],
	])('turns %j into %j', (value, expected) => {
		expect(slugify(value)).toBe(expected)
	})

	test('keeps a long slug within one DNS label and unique', () => {
		const first = slugify(`${'a'.repeat(70)}-one`)
		const second = slugify(`${'a'.repeat(70)}-two`)

		expect(first).toHaveLength(63)
		expect(first).toMatch(/^a+-[0-9a-z]{8}$/)
		expect(second).not.toBe(first)
	})
})

describe('env files', () => {
	let directory: string

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'env-file-test-'))
	})

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true })
	})

	const header = '# ---\n# @defaultSensitive=false\n# ---\n'

	test('writes a new file with the varlock header and blank-line groups', () => {
		const path = join(directory, '.env')

		updateEnvFile(path, [{ A: '1', B: '2' }, { C: '3' }])

		expect(readFileSync(path, 'utf8')).toBe(
			`${header}\nA="1"\nB="2"\n\nC="3"\n`,
		)
	})

	test('updates values in place and appends new keys', () => {
		const path = join(directory, '.env')
		writeFileSync(path, `${header}\nA="old"\nKEEP="x"\n`)

		updateEnvFile(path, [{ A: 'new', B: '2' }])

		expect(readFileSync(path, 'utf8')).toBe(
			`${header}\nA="new"\nKEEP="x"\n\nB="2"\n`,
		)
	})

	test('adds the header to a file that lacks it', () => {
		const path = join(directory, '.env')
		writeFileSync(path, 'KEEP="x"\n')

		updateEnvFile(path, [{ A: '1' }])

		expect(readFileSync(path, 'utf8')).toBe(`${header}\nKEEP="x"\n\nA="1"\n`)
	})

	test('replace drops the existing values', () => {
		const path = join(directory, '.env')
		writeFileSync(path, `${header}\nKEEP="x"\n`)

		updateEnvFile(path, [{ A: '1' }], true)

		expect(readFileSync(path, 'utf8')).toBe(`${header}\nA="1"\n`)
	})

	test('reads quoted and bare values and skips comments', () => {
		const path = join(directory, '.env')

		writeFileSync(
			path,
			['# comment', 'A="1"', 'B=2', '  C = "3"', 'not a pair', ''].join('\n'),
		)

		expect(readEnvFile(path)).toEqual({ A: '1', B: '2', C: '3' })
	})

	test('reads a missing file as empty', () => {
		expect(readEnvFile(join(directory, 'missing'))).toEqual({})
	})
})

// Runs setup in a throwaway Git repo. PATH holds only git, so the run never
// reaches the machine's jj, pitchfork, or Docker.
describe('setupWorkspace', () => {
	const original = process.cwd()
	let directory: string
	let name: string

	beforeEach(() => {
		directory = realpathSync(mkdtempSync(join(tmpdir(), 'workspace-test-')))
		name = basename(directory)

		const bin = join(directory, '..', `${name}-bin`)
		mkdirSync(bin)

		const git = execaSync('which', ['git']).stdout.trim()
		symlinkSync(git, join(bin, 'git'))

		const repo = join(directory, 'app')
		mkdirSync(repo)
		execaSync('git', ['init', '--quiet', '-b', 'feature-x'], { cwd: repo })
		vi.stubEnv('PATH', bin)
		process.chdir(repo)
	})

	afterEach(() => {
		process.chdir(original)
		vi.unstubAllEnvs()
		rmSync(directory, { recursive: true, force: true })
		rmSync(join(directory, '..', `${name}-bin`), {
			recursive: true,
			force: true,
		})
	})

	test('derives ports and env from the checkout', () => {
		const { baseUrl, summary } = setupWorkspace()
		const env = readEnvFile('.env.workspace.local')
		const appPort = hashPort('app:feature-x')

		expect(env['APP_PORT']).toBe(String(appPort))
		expect(env['POSTGRES_PORT']).toBe(String(hashPort('db-app:feature-x')))
		expect(env['POSTGRES_DB']).toBe(sanitizeDatabaseName('feature-x'))
		expect(env['WORKTREE_NAME']).toBe('app')
		expect(env['COMPOSE_PROJECT_NAME']).toBe(sanitizeDatabaseName('app'))
		expect(env['BASE_URL']).toBe(`http://localhost:${appPort}`)
		expect(baseUrl).toBe(`http://localhost:${appPort}`)
		expect(summary[0]).toBe(`app:      http://localhost:${appPort}`)
	})

	test('seeds the local secret once', () => {
		const first = setupWorkspace()
		const seeded = readFileSync('.env.development.local', 'utf8')

		expect(seeded).toMatch(/^BETTER_AUTH_SECRET="[\w-]{43}"$/m)
		expect(first.summary).toContain('Seeded a local BETTER_AUTH_SECRET.')

		const second = setupWorkspace()

		expect(readFileSync('.env.development.local', 'utf8')).toBe(seeded)
		expect(second.summary).not.toContain('Seeded a local BETTER_AUTH_SECRET.')
	})

	test('keeps the secret that .env.local already sets', () => {
		writeFileSync('.env.local', 'BETTER_AUTH_SECRET="mine"\n')

		setupWorkspace()

		expect(existsSync('.env.development.local')).toBe(false)
	})

	test('replaces an empty secret line and keeps other values', () => {
		writeFileSync('.env.development.local', 'OTHER="1"\nBETTER_AUTH_SECRET=\n')

		setupWorkspace()
		const seeded = readEnvFile('.env.development.local')

		expect(seeded['OTHER']).toBe('1')
		expect(seeded['BETTER_AUTH_SECRET']).toHaveLength(43)
	})

	test('keeps assigned ports when it runs again', () => {
		setupWorkspace()
		const first = readFileSync('.env.workspace.local', 'utf8')

		// A later branch name must not move the ports a checkout already has.
		execaSync('git', ['checkout', '--quiet', '-b', 'renamed'])
		setupWorkspace()

		expect(readFileSync('.env.workspace.local', 'utf8')).toBe(first)
	})

	test('regenerates a file cloned from another worktree', () => {
		writeFileSync(
			'.env.workspace.local',
			'APP_PORT="11111"\nWORKTREE_NAME="other"\nSTALE="1"\n',
		)

		setupWorkspace()
		const env = readEnvFile('.env.workspace.local')

		expect(env['APP_PORT']).toBe(String(hashPort('app:feature-x')))
		expect(env['WORKTREE_NAME']).toBe('app')
		expect(env).not.toHaveProperty('STALE')
	})

	test('gives the dev daemon the app port', () => {
		writeFileSync('pitchfork.toml', '[daemons.dev]\nport = 3000\nrun = "x"\n')

		setupWorkspace()

		expect(readFileSync('pitchfork.local.toml', 'utf8')).toBe(
			`[daemons.dev]\nrun = "x"\nport = ${hashPort('app:feature-x')}\n`,
		)
	})

	test('leaves the daemon config alone without pitchfork.toml', () => {
		setupWorkspace()

		expect(existsSync('pitchfork.local.toml')).toBe(false)
	})
})
