import { describe, expect, it } from 'vite-plus/test'

import { countLabel } from './count-label'

describe('countLabel', () => {
	it('names the count', () => {
		expect(countLabel(0)).toBe('Count: 0')
		expect(countLabel(3)).toBe('Count: 3')
	})
})
