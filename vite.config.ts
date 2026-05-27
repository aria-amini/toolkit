import { mergeConfig } from 'vite-plus'
import { fmt, lint } from './packages/config/src/vite.ts'

export default {
	lint: lint,
	fmt: mergeConfig(fmt, {
		ignorePatterns: ['**/infra/charts/**'],
	}),
	test: {
		passWithNoTests: true,
		projects: ['packages/*/vite.config.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.output/**',
			'**/.vercel/**',
			'**/e2e/**',
		],
	},
}
