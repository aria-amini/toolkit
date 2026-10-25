import { expect, test } from 'vite-plus/test'

import { parseBootstrapArgs, USAGE } from './args.ts'

test('no arguments run quietly', () => {
	expect(parseBootstrapArgs([])).toEqual({
		kind: 'run',
		options: { verbose: false },
	})
})

test('--verbose runs with direct command output', () => {
	expect(parseBootstrapArgs(['--verbose'])).toEqual({
		kind: 'run',
		options: { verbose: true },
	})
})

test('mise passes the usage flag as usage_verbose', () => {
	expect(parseBootstrapArgs([], 'true')).toEqual({
		kind: 'run',
		options: { verbose: true },
	})

	expect(parseBootstrapArgs([], 'false')).toEqual({
		kind: 'run',
		options: { verbose: false },
	})
})

test('--help prints the usage', () => {
	expect(parseBootstrapArgs(['--help'])).toEqual({ kind: 'help' })
})

test.each([['--nope'], ['--verbose', '--help'], ['extra']])(
	'rejects %s',
	(...args) => {
		expect(parseBootstrapArgs(args)).toEqual({
			kind: 'error',
			message: USAGE,
		})
	},
)
