// One line of words with Koha values in it as chips. A chip is one piece: it can be deleted, never typed into, so a
// person can put a patron's first name in a sentence without writing (or breaking) Template Toolkit.
import { mergeAttributes, Node } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useId } from 'react'
import type { Words } from '../compiler/design.ts'
import type { Notice } from '../notices/model.ts'
import type { DocNode } from './words-doc.ts'
import { fromDoc, toDoc, values } from './words-doc.ts'

const OneLine = Document.extend({ content: 'paragraph' })
const NoEnter = Paragraph.extend({ addKeyboardShortcuts: () => ({ Enter: () => true, 'Shift-Enter': () => true }) })
const Value = Node.create({
  name: 'value',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({
    field: { default: '', renderHTML: (a: Record<string, unknown>) => ({ 'data-field': a.field }) },
    label: { default: '', renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: 'span[data-field]' }],
  renderHTML: ({ node, HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { class: 'kntb-chip', contenteditable: 'false' }), String(node.attrs.label)],
})

const same = (a: Words | undefined, b: Words | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function WordsEditor({ label, value, notice, standard, onChange }: {
  label: string; value: Words | undefined; notice: Notice; standard: string; onChange: (w: Words | undefined) => void
}) {
  const id = useId()
  const editor = useEditor({
    immediatelyRender: false, // the website renders on the server first
    extensions: [OneLine, NoEnter, Text, Value, Placeholder.configure({ placeholder: standard })],
    content: toDoc(value, notice),
    editorProps: { attributes: { role: 'textbox', 'aria-labelledby': `${id}-l`, 'aria-describedby': `${id}-h`, 'aria-multiline': 'false', class: 'kntb-words' } },
    onUpdate: ({ editor: e }) => { onChange(fromDoc(e.getJSON() as DocNode)) },
  }, [notice.code])
  // undo, or another notice: the words changed from outside
  useEffect(() => {
    if (editor && !same(fromDoc(editor.getJSON() as DocNode), value)) editor.commands.setContent(toDoc(value, notice), { emitUpdate: false })
  }, [editor, value, notice])
  const offered = values(notice)
  return (
    <div className="kntb-field">
      <span className="kntb-label" id={`${id}-l`}>{label}</span>
      <EditorContent editor={editor} />
      <div className="kntb-row kntb-wrap">
        {offered.length ? (
          <select aria-label={`Insert a Koha value into ${label}`} value="" onChange={(e) => {
            const v = offered.find((x) => x.field === e.target.value)
            if (v && editor) editor.chain().focus().insertContent({ type: 'value', attrs: v }).insertContent(' ').run()
          }}>
            <option value="">Insert a value…</option>
            {offered.map((v) => <option key={v.field} value={v.field}>{v.label}</option>)}
          </select>
        ) : null}
        {value !== undefined ? <button type="button" className="kntb-small" onClick={() => { onChange(undefined) }}>Use the standard words</button> : null}
      </div>
      <p className="kntb-hint" id={`${id}-h`}>{value === undefined ? `Standard: ${standard}` : 'Your own words for this notice.'}</p>
    </div>
  )
}
