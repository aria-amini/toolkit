import { nitro } from 'nitro/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import svgr from 'vite-plugin-svgr'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	defineConfig,
	mergeConfig,
	type TestProjectConfiguration,
	type TestProjectInlineConfiguration,
} from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import {
	createMswHandlersPlugin,
	createStylesPlugin,
} from './plugins/virtual-modules.ts'

const stylesSetup = '@aamini/config/setup/styles'

interface ProjectOverrides {
	server?: TestProjectConfiguration
	browser?: TestProjectConfiguration
}

export const viteConfig = (projectOverrides?: ProjectOverrides) => ({
	resolve: {
		tsconfigPaths: true,
		alias: [
			{ find: '@/mocks', replacement: resolve(root, '__mocks__') },
			{ find: '@', replacement: resolve(root, 'src') },
		],
	},
	plugins: [
		tanstackStart(),
		devtools(),
		nitro(),
		tailwindcss(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
		svgr({
			include: '**/*.svg',
			svgrOptions: { exportType: 'default' },
		}),
	],
	fmt: {
		singleQuote: true,
		semi: false,
		useTabs: true,
		experimentalTailwindcss: {},
		printWidth: 80,
		experimentalSortPackageJson: false,
		proseWrap: 'always',
		ignorePatterns: [
			'**/.output',
			'**/dist/**',
			'pnpm-lock.yaml',
			'**/routeTree.gen.ts',
		],
		overrides: [
			{
				files: ['*.{yaml,yml}'],
				options: {
					useTabs: false,
				},
			},
		],
	},
	lint: {
		plugins: [
			'eslint',
			'unicorn',
			'typescript',
			'oxc',
			'react',
			'react-perf',
			'import',
			'jsdoc',
			'jsx-a11y',
			'node',
			'promise',
		],
		categories: {},
		options: {
			typeAware: true,
			typeCheck: true,
		},
		rules: {
			'no-empty-pattern': 'off',
			'no-console': ['error', { allow: ['warn', 'error'] }],
		},
		settings: {
			'jsx-a11y': {
				components: {},
				attributes: {},
			},
			react: {
				formComponents: [],
				linkComponents: [],
			},
			jsdoc: {
				ignorePrivate: false,
				ignoreInternal: false,
				ignoreReplacesDocs: true,
				overrideReplacesDocs: true,
				augmentsExtendsReplacesDocs: false,
				implementsReplacesDocs: false,
				exemptDestructuredRootsFromChecks: false,
				tagNamePreference: {},
			},
		},
		env: {
			builtin: true,
		},
		globals: {},
		ignorePatterns: ['**/dist/**'],
		overrides: [
			{
				files: ['**/*.test.unit.ts'],
				rules: {
					'eslint/no-restricted-imports': [
						'error',
						{
							patterns: [
								{
									group: ['@aamini/config-testing/test/*'],
									message:
										'Unit tests should not import test fixtures. Use plain vitest imports instead.',
								},
							],
						},
					],
				},
			},
			{
				files: ['**/*.test.tsx'],
				rules: {
					'eslint/no-restricted-imports': [
						'error',
						{
							paths: [
								{
									name: '@aamini/config-testing/test/server',
									message:
										'Browser tests (*.test.tsx) should use test/browser, not test/server.',
								},
								{
									name: '@aamini/config-testing/test/db',
									message:
										'Browser tests (*.test.tsx) should use test/browser, not test/db.',
								},
							],
						},
					],
				},
			},
			{
				files: ['**/*.test.ts'],
				rules: {
					'eslint/no-restricted-imports': [
						'error',
						{
							paths: [
								{
									name: '@aamini/config-testing/test/browser',
									message:
										'Server tests (*.test.ts) should use test/server or test/db, not test/browser.',
								},
							],
						},
					],
				},
			},
			{
				files: ['apps/**'],
				plugins: ['typescript', 'react'],
				rules: {
					'react/self-closing-comp': 'error',
				},
			},
			{
				files: ['**/*.test.ts', '**/*.test.tsx'],
				plugins: ['typescript', 'vitest'],
				rules: {
					'@typescript-eslint/no-explicit-any': 'off',
					'vitest/no-standalone-expect': [
						'warn',
						{ additionalTestBlockFunctions: ['test', 'test.skip'] },
					],
				},
			},
			{
				files: ['**/scripts/**', '**/src/lib/imdb/**'],
				rules: {
					'no-console': 'off',
				},
			},
		],
	},
	staged: {
		'*.{js,ts,tsx}': 'vp check --fix',
	},
	test: {
		passWithNoTests: true,
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['src/**/*.test.unit.ts'],
				},
			},
			mergeConfig(
				{
					extends: true,
					plugins: [createMswHandlersPlugin()],
					test: {
						name: 'server',
						include: ['src/**/*.test.ts'],
						testTimeout: 30_000,
						fileParallelism: false,
					},
				} satisfies TestProjectConfiguration,
				projectOverrides?.server ?? {},
			),
			mergeConfig(
				{
					extends: true,
					plugins: [createMswHandlersPlugin(), createStylesPlugin()],
					test: {
						name: 'browser',
						include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx'],
						setupFiles: [stylesSetup],
						browser: {
							instances: [
								{
									browser: 'chromium',
								},
							],
							provider: playwright(),
							enabled: true,
							headless: true,
						},
					},
				} satisfies TestProjectConfiguration,
				projectOverrides?.browser ?? {},
			),
		],
	},
})
