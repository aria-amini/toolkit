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
import type { Plugin } from 'vite'
import {
	defineConfig as defineVitestConfig,
	mergeConfig,
	type TestProjectConfiguration,
	type TestProjectInlineConfiguration,
} from 'vitest/config'
import { defineConfig } from 'vite'
import { playwright } from 'vite-plus/test/browser-playwright'

const HANDLER_LOCATIONS = [
	'__mocks__/handlers.ts',
	'__mocks__/handlers.js',
	'src/mocks/handlers.ts',
	'src/mocks/handlers.js',
]

const STYLES_LOCATIONS = ['src/styles.css', 'src/index.css', 'src/app.css']

function mswHandlersPlugin(root: string): Plugin {
	const virtualModuleId = '@test/handlers'
	const resolvedVirtualModuleId = '\0' + virtualModuleId

	return {
		name: 'msw-handlers-resolver',
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId
			}
			return undefined
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				for (const location of HANDLER_LOCATIONS) {
					const fullPath = resolve(root, location)
					if (existsSync(fullPath)) {
						return `export { default } from '${fullPath}'`
					}
				}
				throw new Error(
					`No MSW handlers found. Expected one of:\n${HANDLER_LOCATIONS.map((l) => `  - ${resolve(root, l)}`).join('\n')}`,
				)
			}
			return undefined
		},
	}
}

function stylesPlugin(root: string): Plugin {
	const virtualModuleId = '@test/styles'
	const resolvedVirtualModuleId = '\0' + virtualModuleId

	return {
		name: 'styles-resolver',
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId
			}
			return undefined
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				for (const location of STYLES_LOCATIONS) {
					const fullPath = resolve(root, location)
					if (existsSync(fullPath)) {
						return `import '${fullPath}'`
					}
				}
				throw new Error(
					`No styles file found. Expected one of:\n${STYLES_LOCATIONS.map((l) => `  - ${resolve(root, l)}`).join('\n')}`,
				)
			}
			return undefined
		},
	}
}

const stylesSetup = '@aamini/config/setup/styles'

function mergeProjectConfig(
	base: TestProjectConfiguration,
	overrides: TestProjectConfiguration = {},
): TestProjectConfiguration {
	return mergeConfig(
		base as Record<string, any>,
		overrides as Record<string, any>,
	) as TestProjectConfiguration
}

interface ProjectOverrides {
	server?: TestProjectConfiguration
	browser?: TestProjectConfiguration
}

function createBaseConfig(
	root: string,
	overrides: TestProjectInlineConfiguration = {},
	projectOverrides: ProjectOverrides = {},
) {
	const localSetup = resolve(root, 'vitest.setup.ts')
	const hasLocalSetup = existsSync(localSetup)

	return mergeConfig(
		defineVitestConfig({
			root,
			resolve: {
				tsconfigPaths: true,
				dedupe: ['react', 'react-dom'],
				alias: [
					{ find: '@/mocks', replacement: resolve(root, '__mocks__') },
					{ find: '@', replacement: resolve(root, 'src') },
				],
			},
			plugins: [
				tailwindcss(),
				svgr({
					include: '**/*.svg',
					svgrOptions: { exportType: 'default' },
				}),
			],
			test: {
				passWithNoTests: true,
				exclude: [
					'**/node_modules/**',
					'**/dist/**',
					'**/.output/**',
					'**/.vercel/**',
					'**/cypress/**',
					'**/.{idea,git,cache,output,temp}/**',
					'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
					'**/e2e/**',
				],
				projects: [
					{
						extends: true,
						test: {
							name: 'unit',
							include: ['src/**/*.test.unit.ts'],
						},
					},
					mergeProjectConfig(
						{
							extends: true,
							plugins: [mswHandlersPlugin(root)],
							test: {
								name: 'server',
								include: ['src/**/*.test.ts'],
								exclude: ['src/**/*.test.unit.ts', 'src/**/*.test.tsx'],
								testTimeout: 30_000,
								fileParallelism: false,
								setupFiles: hasLocalSetup ? [localSetup] : [],
							},
						} satisfies TestProjectConfiguration,
						projectOverrides.server ?? {},
					),
					mergeProjectConfig(
						{
							extends: true,
							plugins: [mswHandlersPlugin(root), stylesPlugin(root)],
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
						projectOverrides.browser ?? {},
					),
				],
			},
		}),
		overrides,
	)
}

const isVitest = process.env.VITEST === 'true'

function createFrameworkConfig(root: string) {
	return defineConfig({
		root,
		resolve: {
			tsconfigPaths: true,
			dedupe: ['react', 'react-dom'],
			alias: [
				{ find: '@/mocks', replacement: resolve(root, '__mocks__') },
				{ find: '@', replacement: resolve(root, 'src') },
			],
		},
		ssr: {
			noExternal: ['recharts'],
		},
		plugins: [
			...(isVitest ? [] : [devtools(), nitro(), tanstackStart()]),
			tailwindcss(),
			viteReact(),
			babel({ presets: [reactCompilerPreset()] }),
			svgr({
				include: '**/*.svg',
				svgrOptions: { exportType: 'default' },
			}),
		],
	})
}

// Creates a full app config with customized test project overrides
export function createAppConfig(
	root: string,
	projectOverrides: ProjectOverrides = {},
	overrides: TestProjectInlineConfiguration = {},
) {
	return {
		...workspaceConfig,
		...mergeConfig(
			createFrameworkConfig(root),
			createBaseConfig(root, overrides, projectOverrides),
		),
	}
}

// Helper to create config from import.meta.url
export function baseConfigFor(configUrl: string | URL) {
	const root = dirname(fileURLToPath(configUrl))
	return createAppConfig(root)
}

// Workspace-level Vite+ config shared by monorepo roots.
export const workspaceConfig = {
	fmt: {
		singleQuote: true,
		semi: false,
		useTabs: true,
		experimentalTailwindcss: {},
		printWidth: 80,
		experimentalSortPackageJson: false,
		proseWrap: 'always',
		ignorePatterns: [
			'**/.vercel',
			'**/.output',
			'**/dist/**',
			'**/env.d.ts',
			'pnpm-lock.yaml',
			'**/routeTree.gen.ts',
			'infra/manifests/gitops/flux-system/gotk-components.yaml',
			'infra/charts/**/templates/**/*.{yml,yaml}',
			'**/charts/**',
			'**/*.yaml',
			'**/*.yml',
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
}
