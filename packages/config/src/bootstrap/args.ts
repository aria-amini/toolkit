export interface BootstrapOptions {
	verbose: boolean
}

export type ParsedArgs =
	| { kind: 'run'; options: BootstrapOptions }
	| { kind: 'help' }
	| { kind: 'error'; message: string }

export const USAGE = 'Usage: aamini bootstrap [--verbose]'

/**
 * Parses the arguments after `aamini bootstrap`. `usageVerbose` is the
 * `usage_verbose` variable that `mise run` sets from the task's `usage` flag.
 */
export function parseBootstrapArgs(
	args: string[],
	usageVerbose?: string,
): ParsedArgs {
	if (
		args.length > 1 ||
		(args[0] && !['--verbose', '--help'].includes(args[0]))
	) {
		return { kind: 'error', message: USAGE }
	}

	if (args[0] === '--help') return { kind: 'help' }

	return {
		kind: 'run',
		options: { verbose: args[0] === '--verbose' || usageVerbose === 'true' },
	}
}
