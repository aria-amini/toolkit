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

function isCallable(value: object): value is (...args: unknown[]) => unknown {
	return typeof value === 'function'
}

export function createProxy<T extends object>(getTarget: () => T): T {
	// new Proxy() requires the target to match the proxy type T.
	// A function target is needed so the proxy can be callable.
	const proxyTarget = function () {} as unknown as T
	const handlers: ProxyHandler<T> = {
		get(_, prop) {
			return Reflect.get(getTarget(), prop, getTarget())
		},
		apply(_target, thisArg, args: unknown[]) {
			const target = getTarget()
			if (!isCallable(target)) {
				throw new TypeError('Proxy target is not callable')
			}
			return Reflect.apply(target, thisArg, args)
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
	return new Proxy(proxyTarget, handlers)
}
