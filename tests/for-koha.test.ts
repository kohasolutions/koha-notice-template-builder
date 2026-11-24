import { describe, expect, it } from 'vitest'
import { forKoha } from '../src/builder/for-koha.ts'
import { BASE } from '../src/compiler/ready.ts'
import { NOTICES } from '../src/notices/data.ts'

describe('where a slip goes', () => {
  it('a slip that Koha prints at the desk is pasted under Email; a printed notice under Print', () => {
    const at = (code: string) => { const n = NOTICES.find((x) => x.code === code); if (!n) throw new Error(code); return forKoha(n, BASE, 'print') }
    expect(at('ISSUESLIP')).toMatchObject({ transport: 'Email', htmlMessage: true })
    expect(at('ODUE')).toMatchObject({ transport: 'Print', htmlMessage: true })
  })
})
