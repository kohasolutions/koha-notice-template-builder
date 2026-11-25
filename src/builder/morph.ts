// Changes a shown document into a new one node by node, so what did not change is never drawn again: loading a frame
// afresh on every key press flashed it white and fetched its pictures again.
function sameKind(a: Node, b: Node): boolean {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName
}

function morphAttributes(from: Element, to: Element): void {
  for (const { name } of Array.from(from.attributes)) if (!to.hasAttribute(name)) from.removeAttribute(name)
  for (const { name, value } of Array.from(to.attributes)) if (from.getAttribute(name) !== value) from.setAttribute(name, value)
}

export function morph(from: Element, to: Element): void {
  morphAttributes(from, to)
  const old = Array.from(from.childNodes)
  const next = Array.from(to.childNodes)
  next.forEach((n, i) => {
    const o = old[i]
    if (!o) from.append(from.ownerDocument.importNode(n, true))
    else if (!sameKind(o, n)) from.replaceChild(from.ownerDocument.importNode(n, true), o)
    // nodeType 1: an element. (instanceof would be false: the node belongs to the frame's window.)
    else if (o.nodeType === 1) morph(o as Element, n as Element)
    else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue
  })
  for (const o of old.slice(next.length)) o.remove()
}
