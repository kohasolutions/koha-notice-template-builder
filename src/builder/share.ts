// A design inside a link, after the #: a browser never sends that part to a server. What a link holds is untrusted: it
// goes through read() like a design file, is never unpacked past a limit, and is opened only when the person says so
// (a design can name pictures, and showing it asks their servers).
import { deflateSync, Inflate, strFromU8, strToU8 } from 'fflate'
import type { Design } from '../compiler/design.ts'
import { read, toFile } from './file.ts'

/** Where the builder lives, for a link made from a file on a disk: a file's own address is no use to anyone else. */
export const HOME = 'https://kohasolutions.com/koha-tools/notice-template-builder'
const KEY = '#design=1.'
/** Longer links are cut by chat and mail programs; the design file is the way then. */
export const LINK_MAX = 8000
/** A packed design, as characters of the link, and unpacked. */
const PACKED_MAX = 64_000
const UNPACKED_MAX = 1_000_000

const base64url = (b: Uint8Array): string => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const unbase64url = (s: string): Uint8Array => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

/** Unpacks in small pieces, and stops at the limit: a few bytes can unpack to gigabytes. */
function unpack(b: Uint8Array): string {
  const parts: Uint8Array[] = []
  let size = 0
  const inflate = new Inflate((part) => {
    size += part.length
    if (size > UNPACKED_MAX) throw new Error('too big')
    parts.push(part)
  })
  const STEP = 256
  for (let i = 0; i < b.length; i += STEP) inflate.push(b.subarray(i, i + STEP), i + STEP >= b.length)
  const all = new Uint8Array(size)
  let at = 0
  for (const p of parts) { all.set(p, at); at += p.length }
  return strFromU8(all)
}

/** Whether an address has a design after its #, readable or not. */
export const holdsDesign = (hash: string): boolean => hash.startsWith('#design=')
export const toHash = (design: Design, readyId: string): string => KEY + base64url(deflateSync(strToU8(JSON.stringify(toFile(design, readyId))), { level: 9 }))
export function fromHash(hash: string): { design: Design; readyId: string } | null {
  const packed = hash.startsWith(KEY) ? hash.slice(KEY.length) : ''
  if (!packed || packed.length > PACKED_MAX || !/^[\w-]+$/.test(packed)) return null
  try {
    return read(JSON.parse(unpack(unbase64url(packed))))
  } catch {
    return null
  }
}

/** The link for this design, from the address the builder is open at. Null: too long to be a link. */
export function shareLink(design: Design, readyId: string, at: Pick<Location, 'protocol' | 'origin' | 'pathname'>): string | null {
  const here = at.protocol === 'http:' || at.protocol === 'https:' ? at.origin + at.pathname : HOME
  const link = here + toHash(design, readyId)
  return link.length > LINK_MAX ? null : link
}
