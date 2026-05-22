import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite-plus'

export const HANDLER_LOCATIONS = [
	'__mocks__/handlers.ts',
	'__mocks__/handlers.js',
	'src/mocks/handlers.ts',
	'src/mocks/handlers.js',
]

export const STYLES_LOCATIONS = [
	'src/styles.css',
	'src/index.css',
	'src/app.css',
]

export function createMswHandlersPlugin(root: string): Plugin {
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

export function createStylesPlugin(root: string): Plugin {
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
