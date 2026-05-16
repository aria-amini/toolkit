import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const HANDLER_LOCATIONS = [
	'__mocks__/handlers.ts',
	'__mocks__/handlers.js',
	'src/mocks/handlers.ts',
	'src/mocks/handlers.js',
]

export function findHandlerPath(): string {
	if (typeof process === 'undefined') {
		return ''
	}
	const cwd = process.cwd()
	for (const location of HANDLER_LOCATIONS) {
		const fullPath = resolve(cwd, location)
		if (existsSync(fullPath)) return fullPath
	}
	throw new Error(
		`No MSW handlers found. Expected one of:\n${HANDLER_LOCATIONS.map((l) => `  - ${resolve(cwd, l)}`).join('\n')}`,
	)
}

export function createProxy<T extends object>(getTarget: () => T): T {
	const handlers: ProxyHandler<object> = {
		get(_, prop) {
			return Reflect.get(getTarget(), prop, getTarget())
		},
		apply(target, thisArg, args) {
			return Reflect.apply(getTarget() as any, thisArg, args)
		},
		has(_, prop) {
			return prop in getTarget()
		},
		ownKeys() {
			return Reflect.ownKeys(getTarget())
		},
		getOwnPropertyDescriptor(_, prop) {
			return Reflect.getOwnPropertyDescriptor(getTarget(), prop)
		},
	}
	const proxyTarget = () => {}
	return new Proxy(proxyTarget, handlers) as T
}
