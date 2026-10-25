#!/usr/bin/env node
import { parseBootstrapArgs, USAGE } from './args.ts'
import { bootstrap } from './bootstrap.ts'

const [command, ...args] = process.argv.slice(2)

if (command !== 'bootstrap') {
	console.error(USAGE)
	process.exitCode = 2
} else {
	const parsed = parseBootstrapArgs(args, process.env['usage_verbose'])

	if (parsed.kind === 'help') {
		console.log(USAGE)
	} else if (parsed.kind === 'error') {
		console.error(parsed.message)
		process.exitCode = 2
	} else {
		try {
			await bootstrap(parsed.options)
		} catch (error) {
			console.error(
				`✗ Bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
			)
			process.exitCode = 1
		}
	}
}
