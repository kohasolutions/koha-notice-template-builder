import { deflateSync, strFromU8, strToU8, unzipSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import { compile } from '../src/compiler/compile.ts'
import { READY } from '../src/compiler/ready.ts'
import { EXAMPLE_LIBRARY } from '../src/compiler/example.ts'
import { read } from '../src/builder/file.ts'
import { forKoha, menuOf, TO_CREATE } from '../src/builder/for-koha.ts'
import { fromHash, holdsDesign, HOME, LINK_MAX, shareLink, toHash } from '../src/builder/share.ts'
import { initial, notice, reduce } from '../src/builder/state.ts'
import { DESIGN_NAME, instructions, makeZip, zipFiles } from '../src/builder/zip.ts'
import { NOTICES } from '../src/notices/data.ts'

const { design, readyId } = reduce(initial(), { type: 'library', key: 'name', value: 'Bücherei 图书馆 [% x %]' })
const packed = (b: Uint8Array) => `#design=1.${Buffer.from(b).toString('base64url')}`

describe('what goes into Koha', () => {
  test('every message of every notice has a subject: Koha drops one that has none', () => {
    for (const n of NOTICES) for (const f of n.formats) {
      const k = forKoha(n, design, f)
      expect(k.subject.trim(), `${n.code} ${f}`).not.toBe('')
      expect(Array.from(k.subject).length, `${n.code} ${f}`).toBeLessThanOrEqual(200)
      expect(k.subject).not.toMatch(/[\r\n]/)
      expect(k.body).toBe(compile(n, design, f).koha)
      expect(k.htmlMessage).toBe(f === 'html' || f === 'print')
    }
  })
  test('every notice has a Koha menu name, not its module code', () => {
    for (const n of NOTICES) expect(['Circulation', 'Holds', 'Patrons (members)']).toContain(menuOf(n))
  })
})

describe('the zip', () => {
  test('every format of every notice, its subject, the instructions and a design file that opens', () => {
    const files = unzipSync(makeZip(design, readyId))
    const paths = Object.keys(files)
    expect(paths).toHaveLength(2 + NOTICES.length + NOTICES.reduce((n, x) => n + x.formats.length, 0))
    expect(paths.every((p) => /^koha-notices\/[\w./-]+$/.test(p) && !p.includes('..'))).toBe(true)
    const text = (p: string) => strFromU8(files[`koha-notices/${p}`] ?? new Uint8Array())
    expect(text('ODUE/print.html.tt')).toBe(compile(notice('ODUE'), design, 'print').koha)
    expect(text('ODUE/sms.txt.tt')).toBe(compile(notice('ODUE'), design, 'sms').koha)
    expect(read(JSON.parse(text(DESIGN_NAME)))).toEqual({ design: read(JSON.parse(text(DESIGN_NAME)))?.design, readyId })
    expect(read(JSON.parse(text(DESIGN_NAME)))?.design.perLibrary.name).toBe(design.perLibrary.name)
  })
  test('the instructions name every notice and every kind of file in it', () => {
    const t = instructions()
    for (const n of NOTICES) expect(t).toMatch(new RegExp(`^  ${n.code} +\\S`, 'm'))
    for (const p of Object.keys(zipFiles(design, readyId))) if (p.endsWith('.tt')) expect(t).toContain(p.split('/')[1])
    for (const c of TO_CREATE) expect(NOTICES.some((n) => n.code === c)).toBe(true)
    expect(t).not.toMatch(/[^\r]\n/)
  })
})

describe('the share link', () => {
  const at = { protocol: 'https:', origin: 'https://example.org', pathname: '/builder' }
  test('brings back the same design', () => {
    const hash = toHash(design, readyId)
    expect(hash).toMatch(/^#design=1\.[\w-]+$/)
    const got = fromHash(hash)
    expect(got?.readyId).toBe(readyId)
    for (const n of NOTICES) for (const f of n.formats) expect(compile(n, got?.design ?? design, f).koha).toBe(compile(n, design, f).koha)
    expect(got?.design.perLibrary.name).toBe(design.perLibrary.name)
  })
  test('is made from the address the builder is at, and from the website for a file on a disk', () => {
    expect(shareLink(design, readyId, at)).toMatch(/^https:\/\/example\.org\/builder#design=1\./)
    expect(shareLink(design, readyId, { protocol: 'file:', origin: 'null', pathname: '/home/x/index.html' })).toMatch(new RegExp(`^${HOME}#design=`))
  })
  test('a full library fits with every ready design; a huge one is refused', () => {
    for (const r of READY) {
      const d = { ...reduce(initial(), { type: 'ready', id: r.id }).design, perLibrary: EXAMPLE_LIBRARY }
      expect(shareLink(d, r.id, at)?.length).toBeLessThan(LINK_MAX / 2)
    }
    const noise = Array.from({ length: 40 }, (_, i) => ({ label: 'x', href: `https://e.org/${Array.from({ length: 300 }, (_x, k) => ((i * 7919 + k * 104729 + (k * k * 31)) % 36).toString(36)).join('')}${Math.imul(i + 1, 2654435761)}` }))
    const huge = { ...design, perLibrary: { ...design.perLibrary, smallprint: Array.from({ length: 12000 }, (_, i) => String.fromCodePoint(0x4e00 + (Math.imul(i, 2654435761) >>> 18))).join(''), links: noise } }
    expect(shareLink(huge, readyId, at)).toBeNull()
  })
  test('anything else is no design', () => {
    const hash = toHash(design, readyId)
    for (const bad of ['', '#', '#kntb-preview', '#design=', '#design=2.abc', '#design=1.', '#design=1.***', '#design=1.abc', hash.slice(0, hash.length / 2), `${hash.slice(0, 40)}AAAA${hash.slice(44)}`,
      packed(deflateSync(strToU8('null'))), packed(deflateSync(strToU8('{"kind":"x"}'))), packed(deflateSync(strToU8('not json'))), `#design=1.${'A'.repeat(70_000)}`]) expect(fromHash(bad), bad.slice(0, 40)).toBeNull()
    expect(holdsDesign('#kntb-preview')).toBe(false)
  })
  test('a link that unpacks to far more than a design is stopped early', () => {
    const good = JSON.stringify({ kind: 'koha-notice-design', version: 1, readyId, design })
    const bomb = deflateSync(strToU8(good + ' '.repeat(30_000_000)), { level: 9 }) // valid JSON, if it were unpacked
    expect(bomb.length).toBeLessThan(48_000)
    expect(fromHash(packed(bomb))).toBeNull()
    expect(fromHash(packed(deflateSync(strToU8(good))))).not.toBeNull()
  })
})
