// The builder's own styles, all under .kntb, carried by the component itself: the offline file and the website that
// imports the component get the same look, and nothing here reaches the rest of a page. No web fonts (offline).
export const CSS = `
.kntb{--bg:#f6f7f9;--panel:#fff;--text:#1d2430;--muted:#5b6575;--line:#d9dee6;--accent:#1f5fae;--accent-text:#fff;--warn:#8a4b00;--warn-bg:#fff4e0;
  color-scheme:light;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;min-height:100vh}
@media (prefers-color-scheme:dark){.kntb{--bg:#14171c;--panel:#1d2128;--text:#e6e9ee;--muted:#a4adba;--line:#343a44;--accent:#7fb0ff;--accent-text:#0b1220;--warn:#ffcc80;--warn-bg:#3a2a10;color-scheme:dark}}
.kntb *,.kntb *::before,.kntb *::after{box-sizing:border-box}
.kntb header.kntb-top{padding:16px;border-bottom:1px solid var(--line);background:var(--panel)}
.kntb h1{font-size:20px;margin:0}
.kntb-top p{margin:4px 0 0;color:var(--muted)}
.kntb-main{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:0;align-items:start}
.kntb-controls{padding:12px;border-right:1px solid var(--line);max-height:calc(100vh - 0px);overflow:auto;position:sticky;top:0}
.kntb-panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;margin-bottom:10px}
.kntb-panel>summary{cursor:pointer;padding:12px 14px;font-weight:600;list-style-position:inside}
.kntb-panel-body{padding:0 14px 14px}
.kntb-group{border:0;padding:0;margin:0 0 12px}
.kntb-group>legend{font-weight:600;padding:8px 0 4px;color:var(--muted);text-transform:uppercase;font-size:12px;letter-spacing:.06em}
.kntb-field{margin:0 0 10px;border:0;padding:0;min-width:0}
.kntb-field>label,.kntb-field>legend{display:block;font-size:13px;font-weight:600;margin-bottom:3px;padding:0}
.kntb-check label{font-weight:400;display:flex;gap:6px;align-items:center}
.kntb input:not([type=checkbox]):not([type=color]):not([type=range]),.kntb select,.kntb textarea{width:100%;min-height:36px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--text);font:inherit}
.kntb textarea{resize:vertical;font-family:ui-monospace,Consolas,monospace;font-size:13px}
.kntb-brand textarea{font-family:inherit}
.kntb input[type=color]{width:44px;height:36px;padding:2px;border:1px solid var(--line);border-radius:6px;background:var(--panel)}
.kntb input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent)}
.kntb input[type=range]{flex:1;accent-color:var(--accent);min-width:0}
.kntb-row{display:flex;gap:6px;align-items:center}
.kntb-wrap{flex-wrap:wrap}
.kntb .kntb-hex{width:96px!important;flex:none}
.kntb .kntb-num{width:72px!important;flex:none}
.kntb-unit{color:var(--muted);font-size:13px}
.kntb-hint,.kntb-note{color:var(--muted);font-size:13px;margin:4px 0 8px}
.kntb-warn{color:var(--warn);background:var(--warn-bg);border-radius:6px;padding:6px 8px;font-size:13px;margin:4px 0 8px}
.kntb button{font:inherit;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:6px;min-height:36px;padding:4px 12px;cursor:pointer}
.kntb button:disabled{opacity:.45;cursor:default}
.kntb .kntb-small{min-height:32px;padding:2px 10px;font-size:13px}
.kntb :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.kntb-choices ul{list-style:none;margin:0;padding:0}
.kntb-choices li{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:2px 0}
.kntb-choices label{display:flex;gap:6px;align-items:center}
.kntb-move button{min-height:30px;min-width:32px;padding:0 6px}
.kntb-list .kntb-item{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:8px;align-items:start}
.kntb-list .kntb-item>.kntb-warn{grid-column:1/-1;margin:0}
.kntb-designs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kntb .kntb-design{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:4px;padding:10px;height:auto}
.kntb .kntb-design[aria-checked=true]{border:2px solid var(--accent);padding:9px}
.kntb-design>span:last-child{font-size:12px;color:var(--muted);line-height:1.35}
.kntb-swatch{display:flex;width:100%;height:18px;border-radius:4px;overflow:hidden;border:1px solid var(--line)}
.kntb-swatch span{flex:1}
.kntb-preview{padding:12px 16px;min-width:0}
.kntb-toolbar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin-bottom:12px}
.kntb-toolbar>label{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:600;min-width:0;max-width:100%}
.kntb-toolbar select{width:auto!important;min-width:0;flex:1 1 auto;max-width:100%}
.kntb-jump{display:none}
.kntb-seg{display:inline-flex}
.kntb-seg button{border-radius:0;margin-left:-1px}
.kntb-seg button:first-child{border-radius:6px 0 0 6px;margin-left:0}
.kntb-seg button:last-child{border-radius:0 6px 6px 0}
.kntb-seg button[aria-pressed=true]{background:var(--accent);color:var(--accent-text);border-color:var(--accent);position:relative}
.kntb-subject{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:0 0 12px;overflow-wrap:anywhere}
.kntb-subject span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-right:6px}
.kntb-frames{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
.kntb-frame{margin:0;max-width:100%}
.kntb-frame figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}
.kntb-frame iframe{display:block;max-width:100%;border:1px solid var(--line);border-radius:8px;background:#fff}
.kntb-frame iframe.kntb-dark{filter:invert(.92) hue-rotate(180deg)}
.kntb-text pre{margin:0;padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 ui-monospace,Consolas,monospace}
.kntb-koha{margin-top:16px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 14px}
.kntb-koha summary{cursor:pointer;font-weight:600}
.kntb-koha label{display:block;font-size:13px;font-weight:600;margin-top:8px}
.kntb-koha textarea{margin-top:4px}
.kntb-foot{padding:16px;color:var(--muted);font-size:13px;border-top:1px solid var(--line)}
.kntb-foot a{color:var(--accent)}
@media (max-width:860px){.kntb-main{grid-template-columns:1fr}.kntb-controls{position:static;max-height:none;border-right:0;border-bottom:1px solid var(--line)}
  .kntb-jump{display:flex;position:sticky;top:0;z-index:2;gap:8px;padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--line)}
  .kntb-jump a{flex:1;text-align:center;padding:8px;border:1px solid var(--line);border-radius:6px;color:var(--text);text-decoration:none;font-weight:600}
  .kntb-controls,.kntb-preview{scroll-margin-top:56px}
  .kntb-toolbar>label{width:100%}}
`
