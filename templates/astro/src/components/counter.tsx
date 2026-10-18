import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { countLabel } from '@/lib/count-label'

export function Counter() {
	const [count, setCount] = useState(0)

	return (
		<Button className="mt-6" onClick={() => setCount((value) => value + 1)}>
			{countLabel(count)}
		</Button>
	)
}
