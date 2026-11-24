import list from '../designs.json' with { type: 'json' }
import type { Design, Ready } from './design.ts'
import { fromReady } from './design.ts'

/** The ready designs: each one is data, none has code of its own. */
export const READY = list as unknown as readonly Ready[]
const first = READY[0]
if (!first) throw new Error('no ready design')
export const BASE: Design = fromReady(first)
