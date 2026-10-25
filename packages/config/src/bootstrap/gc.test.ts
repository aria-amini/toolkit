import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'

import { collectGarbage } from './gc.ts'

interface Result {
	stdout: string
	exitCode: number
}

const docker = vi.hoisted(() => {
	const calls: string[] = []

	const state = {
		calls,
		respond: (_command: string): Partial<Result> => ({}),
	}

	interface Options {
		stdio?: string
		reject?: boolean
		env?: Record<string, string>
	}

	type Call = TemplateStringsArray | Options

	function isTemplate(value: Call): value is TemplateStringsArray {
		return Array.isArray(value) && 'raw' in value
	}

	function run(strings: TemplateStringsArray, values: unknown[]) {
		const command = strings.reduce(
			(text, part, index) =>
				text + part + (index < values.length ? String(values[index]) : ''),
			'',
		)

		state.calls.push(command)

		return Promise.resolve({
			stdout: '',
			exitCode: 0,
			...state.respond(command),
		})
	}

	// Covers both $`cmd` and $({ options })`cmd`.
	function $(first: Call, ...values: unknown[]) {
		if (isTemplate(first)) return run(first, values)

		return (strings: TemplateStringsArray, ...rest: unknown[]) =>
			run(strings, rest)
	}

	return { state, $ }
})

vi.mock('execa', () => ({ $: docker.$ }))

const projects = 'docker ps -a --format {{.Label "com.docker.compose.project"}}'

const networks = 'docker network ls --filter label=com.docker.compose.project'

let liveDirectory: string

beforeEach(() => {
	liveDirectory = mkdtempSync(join(tmpdir(), 'gc-test-'))
	docker.state.calls.length = 0
	docker.state.respond = () => ({})
	vi.spyOn(console, 'log').mockImplementation(() => {})
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
	rmSync(liveDirectory, { recursive: true, force: true })
})

function respondWithStacks(downExitCode = 0) {
	docker.state.respond = (command) => {
		if (command === projects) return { stdout: 'live\ngone\n\nlive\n' }

		if (command.includes('project=live ')) return { stdout: liveDirectory }

		if (command.includes('project=gone ')) return { stdout: '/no/such/dir' }

		if (command.startsWith('docker compose -p gone down')) {
			return { exitCode: downExitCode }
		}

		return {}
	}
}

test('refuses to run against a remote Docker daemon', async () => {
	vi.stubEnv('DOCKER_HOST', 'tcp://10.0.0.5:2375')

	await expect(collectGarbage()).rejects.toThrow(
		'gc: refusing to run against a remote Docker daemon: tcp://10.0.0.5:2375',
	)
	expect(docker.state.calls).toEqual([])
})

test('accepts a local unix socket', async () => {
	vi.stubEnv('DOCKER_HOST', 'unix:///var/run/docker.sock')

	await expect(collectGarbage()).resolves.toBe(0)
})

test('removes only the stacks whose working directory is gone', async () => {
	respondWithStacks()

	await expect(collectGarbage()).resolves.toBe(1)

	const downs = docker.state.calls.filter((call) =>
		call.startsWith('docker compose'),
	)

	expect(downs).toEqual(['docker compose -p gone down --remove-orphans'])
})

test('fails after trying every stack when a removal fails', async () => {
	respondWithStacks(1)

	await expect(collectGarbage()).rejects.toThrow('gc: 1 removal(s) failed')
})

test('removes compose networks that have no containers', async () => {
	docker.state.respond = (command) => {
		if (command.startsWith(networks)) return { stdout: 'empty\nbusy\n' }

		if (command.startsWith('docker network inspect empty')) {
			return { stdout: 'p-empty\n' }
		}

		if (command.startsWith('docker network inspect busy')) {
			return { stdout: 'p-busy\n' }
		}

		if (command.includes('project=p-busy ')) return { stdout: 'abc123\n' }

		return {}
	}

	await expect(collectGarbage()).resolves.toBe(0)

	const removals = docker.state.calls.filter((call) =>
		call.startsWith('docker network rm'),
	)

	expect(removals).toEqual(['docker network rm empty'])
})
