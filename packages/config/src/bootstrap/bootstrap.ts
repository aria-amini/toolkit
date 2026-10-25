import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

import { $ } from 'execa'

import type { BootstrapOptions } from './args.ts'
import { collectGarbage } from './gc.ts'
import { verifyApp } from './readiness.ts'
import { setupWorkspace } from './workspace.ts'

type Command = [string, ...string[]]

/**
 * Configures the checkout in the current directory and starts the app. The
 * caller installs tools and packages and prints the banner first, because this
 * code ships in a package that a fresh clone does not have yet.
 */
export async function bootstrap({ verbose }: BootstrapOptions): Promise<void> {
	// Headless hosts lack a keyring/TPM; suppress Varlock backend probes.
	process.env._VARLOCK_FORCE_FILE_ENCRYPTION_FALLBACK = '1'

	const gum = spawnSync('gum', ['--version'], { stdio: 'ignore' })

	if (gum.error || gum.status !== 0) {
		throw new Error('gum is required; run mise install before bootstrap')
	}

	const inherited = $({ stdio: 'inherit' })

	async function complete(title: string): Promise<void> {
		await inherited`gum style --foreground 82 ${`  ✓ ${title}`}`
	}

	async function step(title: string, command: Command): Promise<void> {
		if (verbose) {
			console.log(`  ${title}`)
			await inherited`${command}`
		} else {
			await inherited`gum spin --show-error --title ${`  ${title}...`} -- ${command}`
		}

		await complete(title)
	}

	const { baseUrl, summary } = setupWorkspace()
	await complete('Configure workspace')
	const removed = await collectGarbage()
	await complete(`Remove orphaned compose stacks (${removed} removed)`)

	// Agent mode redacts secrets and rejects prompts in headless sessions.
	await step('Validate env with varlock', [
		'vp',
		'exec',
		'varlock',
		'load',
		'--agent',
		'--format',
		'pretty',
	])
	await step('Start Docker services', ['vp', 'run', 'compose:up'])
	await step('Apply database migrations', ['vp', 'run', 'db:migrate'])

	const pitchfork = await $({ reject: false })`pitchfork --version`
	const hasDaemon = existsSync('pitchfork.toml') && pitchfork.exitCode === 0

	if (hasDaemon) await step('Start dev daemon', ['pitchfork', 'start', 'dev'])

	await verifyApp(
		baseUrl,
		hasDaemon
			? async () => {
					await inherited`gum style --foreground 220 ${'  App not answering; force-restarting dev daemon'}`
					await inherited`pitchfork restart dev --force`
				}
			: undefined,
	)
	await complete('Verify app responds')

	const heading =
		await $`gum style --bold --foreground 82 ${'✓ Bootstrap complete'}`

	const details = await Promise.all(
		summary.map(async (line) => {
			const result = await $`gum style --foreground 39 ${line}`

			return result.stdout
		}),
	)

	await inherited`gum style --border rounded --border-foreground 82 --padding ${'0 3'} --margin ${'1 0'} ${heading.stdout} ${details}`
}
