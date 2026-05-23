import { workspaceConfig } from './packages/config/src/workspace.ts'

export default {
	...workspaceConfig,
	fmt: {
		...workspaceConfig.fmt,
		ignorePatterns: [
			...(workspaceConfig.fmt?.ignorePatterns ?? []),
			'**/infra/charts/**',
		],
	},
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
