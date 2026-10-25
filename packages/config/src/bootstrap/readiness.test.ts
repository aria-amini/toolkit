import { createServer, type Server } from 'node:http'

import { afterEach, expect, test, vi } from 'vite-plus/test'

import { verifyApp } from './readiness.ts'

const fast = { attempts: 3, interval: 10 }

const servers: Server[] = []

afterEach(async () => {
	await Promise.all(
		servers.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					server.close(() => resolve())
				}),
		),
	)
})

async function listen(status: () => number): Promise<string> {
	const server = createServer((_request, response) => {
		response.statusCode = status()
		response.end()
	})

	servers.push(server)

	await new Promise<void>((resolve) => {
		server.listen(0, '127.0.0.1', resolve)
	})

	const address = server.address()

	if (!(address instanceof Object)) {
		throw new Error('The test server did not bind a TCP port')
	}

	return `http://127.0.0.1:${address.port}`
}

test('resolves once the app answers', async () => {
	const url = await listen(() => 200)
	const restart = vi.fn()

	await expect(verifyApp(url, restart, fast)).resolves.toBeUndefined()
	expect(restart).not.toHaveBeenCalled()
})

test('keeps polling until the app answers', async () => {
	let hits = 0
	const url = await listen(() => (++hits < 3 ? 503 : 200))

	await expect(verifyApp(url, undefined, fast)).resolves.toBeUndefined()
	expect(hits).toBe(3)
})

test('restarts the daemon once when the app never answers', async () => {
	let healthy = false
	const url = await listen(() => (healthy ? 200 : 503))

	const restart = vi.fn(async () => {
		healthy = true
	})

	await expect(verifyApp(url, restart, fast)).resolves.toBeUndefined()
	expect(restart).toHaveBeenCalledOnce()
})

test('fails when the app stays down after the restart', async () => {
	const url = await listen(() => 503)
	const restart = vi.fn(async () => {})

	await expect(verifyApp(url, restart, fast)).rejects.toThrow(
		`App did not answer at ${url}`,
	)
	expect(restart).toHaveBeenCalledOnce()
})

test('fails without a restart when there is no daemon', async () => {
	const url = await listen(() => 503)

	await expect(verifyApp(url, undefined, fast)).rejects.toThrow(
		`App did not answer at ${url}`,
	)
})
