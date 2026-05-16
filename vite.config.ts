import { workspaceConfig } from './packages/config/vite.shared.ts'

export default {
	...workspaceConfig,
	test: {
		passWithNoTests: true,
		projects: ['packages/*'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.output/**',
			'**/.vercel/**',
			'**/e2e/**',
		],
	},
}
