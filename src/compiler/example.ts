import type { Design } from './design.ts'
import { NO_LIBRARY } from './design.ts'

/** The library the pictures, the proof and the builder's "fill in an example" use: the one the visual targets have. */
export const EXAMPLE_LIBRARY: Design['perLibrary'] = {
  ...NO_LIBRARY, tagline: 'Read, learn, meet', address: '1 Main Street, Riverside 12345', phone: '+1 555 0100', email: 'library@example.org', hours: 'Mon to Fri 9:00–18:00, Sat 10:00–14:00',
  links: [{ label: 'Catalogue', href: 'https://library.example.org/' }, { label: 'My account', href: 'https://library.example.org/account' }, { label: 'Opening hours', href: 'https://library.example.org/hours' }],
  social: ['Facebook', 'Instagram', 'YouTube'].map((network) => ({ network, href: `https://social.example/${network.toLowerCase()}` })),
  smallprint: 'You receive this message because you have a library account with us.',
}
