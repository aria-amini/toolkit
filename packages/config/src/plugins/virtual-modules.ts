import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const HANDLER_LOCATIONS = [
	'tests/__mocks__/http.ts',
	'tests/__mocks__/http.js',
	'__mocks__/handlers.ts',
	'__mocks__/handlers.js',
	'src/mocks/handlers.ts',
	'src/mocks/handlers.js',
]

const STYLES_LOCATIONS = ['src/styles.css', 'src/index.css', 'src/app.css']

function createVirtualFilePlugin({
	locations,
	moduleId,
	name,
	sideEffectOnly = false,
}: {
	locations: string[]
	moduleId: string
	name: string
	sideEffectOnly?: boolean
}): Plugin {
	const resolvedModuleId = `\0${moduleId}`
	let root = process.cwd()

	return {
		name,
		configResolved(config) {
			root = config.root
		},
		resolveId(id) {
			if (id === moduleId) return resolvedModuleId
			return undefined
		},
		load(id) {
			if (id !== resolvedModuleId) return undefined

			for (const location of locations) {
				const fullPath = resolve(root, location)
				if (existsSync(fullPath)) {
					if (sideEffectOnly) return `import ${JSON.stringify(fullPath)}`
					return `export { default } from ${JSON.stringify(fullPath)}`
				}
			}

			throw new Error(
				`No file found for ${moduleId}. Expected one of:\n${locations
					.map((location) => `  - ${resolve(root, location)}`)
					.join('\n')}`,
			)
		},
	}
}

export function createMswHandlersPlugin() {
	return createVirtualFilePlugin({
		locations: HANDLER_LOCATIONS,
		moduleId: '@test/handlers',
		name: 'aamini-msw-handlers',
	})
}

export function createStylesPlugin() {
	return createVirtualFilePlugin({
		locations: STYLES_LOCATIONS,
		moduleId: '@test/styles',
		name: 'aamini-test-styles',
		sideEffectOnly: true,
	})
}
