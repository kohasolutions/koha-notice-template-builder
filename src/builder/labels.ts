// What every setting is called on the screen. The controls are made from SPEC (compiler/design.ts), so a setting
// needs only its words here; tests/builder.test.ts fails when one has none.
import type { Group } from '../compiler/design.ts'

export const GROUP: Record<Group, string> = {
  page: 'Page', card: 'Message area', type: 'Text and headings', header: 'Header', hero: 'Title band', items: 'Items list',
  box: 'Information box', alert: 'Warning box', button: 'Button', footer: 'Footer', social: 'Social links style',
}

export const SETTING: { [G in Group]: Record<string, string> } = {
  page: { bg: 'Page colour', padTop: 'Space above', padSide: 'Space at the sides' },
  card: { bg: 'Colour', width: 'Width', radius: 'Rounded corners', border: 'Border', topBar: 'Bar along the top', topBarHeight: 'Top bar height', padSide: 'Inner space at the sides' },
  type: {
    font: 'Font', headingFont: 'Heading font', size: 'Text size', headingSize: 'Heading size', headingWeight: 'Heading weight', headingAlign: 'Heading position',
    text: 'Text colour', muted: 'Quiet text colour', heading: 'Heading colour', link: 'Link colour',
  },
  header: {
    show: 'Show the header', place: 'Where it sits', layout: 'Layout', bg: 'Colour', text: 'Text colour', padY: 'Height (space above and below)', name: 'Show the library name',
    nameSize: 'Name size', nameCase: 'Name style', tagline: 'Show the tagline', taglineColour: 'Tagline colour', logoHeight: 'Logo height', monogram: 'Show a letter when there is no logo',
    monogramBg: 'Letter background', monogramText: 'Letter colour', monogramRadius: 'Letter corners', rule: 'Line under the header', ruleStyle: 'Line style', ruleWidth: 'Line thickness',
    stripe: 'Colour stripe', banner: 'Banner image address', bannerAlt: 'Banner image description',
  },
  hero: { style: 'Style', bg: 'Colour', text: 'Text colour', kicker: 'Show the small line above the title', kickerColour: 'Small line colour', padY: 'Height (space above and below)' },
  items: {
    style: 'Style', fields: 'What each item shows', line: 'Dividing line colour', bg: 'Background', bar: 'Accent bar', barSide: 'Accent bar side', radius: 'Rounded corners', border: 'Border',
    due: 'Due date style', dueBg: 'Due date background', dueText: 'Due date colour', headBg: 'Table heading background', headText: 'Table heading colour',
  },
  box: { bg: 'Background', border: 'Border', bar: 'Accent bar', radius: 'Rounded corners', text: 'Text colour' },
  alert: { bg: 'Background', border: 'Border', bar: 'Accent bar', radius: 'Rounded corners', text: 'Text colour' },
  button: { show: 'Show the button', style: 'Style', bg: 'Colour', text: 'Text colour', radius: 'Rounded corners', align: 'Position', width: 'Width' },
  footer: { place: 'Where it sits', bg: 'Colour', text: 'Text colour', link: 'Link colour', align: 'Position', layout: 'Layout', rule: 'Line above the footer', show: 'What it shows' },
  social: { style: 'Style', bg: 'Badge colour', text: 'Badge letters colour', radius: 'Badge corners', size: 'Badge size' },
}

/** The words for a choice, by its value. */
export const OPTION: Record<string, string> = {
  // fonts
  arial: 'Arial', verdana: 'Verdana', trebuchet: 'Trebuchet MS', tahoma: 'Tahoma', georgia: 'Georgia', times: 'Times New Roman',
  bold: 'Bold', normal: 'Normal', left: 'Left', centre: 'Centre', right: 'Right', split: 'Name left, tagline right',
  card: 'Inside the message', page: 'On the page', none: 'As typed', spaced: 'SPACED CAPITALS', solid: 'Solid', double: 'Double',
  plain: 'Plain', tint: 'Tinted band', list: 'Simple list', cards: 'Cards', table: 'Table', top: 'Top',
  text: 'Text', line: 'On its own line', strong: 'Bold date', pill: 'Pill', stamp: 'Stamp beside the item', side: 'Column on the right',
  outline: 'Outline', link: 'Text link', auto: 'Fits the words', full: 'Full width', stacked: 'One under another', columns: 'Two columns',
  badge: 'Coloured badges', image: "The library's own icons",
  // item fields
  title: 'Title', author: 'Author', callnumber: 'Call number', barcode: 'Barcode', due: 'Due date', fine: 'Fine',
  // footer parts
  address: 'Address', phone: 'Phone', email: 'Email', hours: 'Opening hours', links: 'Links', social: 'Social links', smallprint: 'Small print',
}

export const NETWORKS = ['Facebook', 'Instagram', 'X', 'YouTube', 'LinkedIn', 'TikTok', 'WhatsApp', 'Telegram'] as const

export const FORMAT_NAME = { html: 'Email', text: 'Plain-text email', sms: 'SMS', print: 'Print' } as const
