// Helper for curating by eye: lists acceptable Commons candidates for a few queries and writes a contact sheet to
// public/_stock-candidates.html (delete it afterwards). Usage: node scripts/commons-candidates.mjs "<label>=<query>" ...
// Pin a chosen file in scripts/curate-stock-photos.mjs under PINNED.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const UA = 'WayfarerDemo/1.0 (travel-app portfolio demo)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OK_LICENSE = /^(CC0|Public domain|PD|CC[ -]BY(-SA)?[ -]\d)/i
const strip = (h = '') => h.replace(/<[^>]*>/g, '').trim()

async function search(q, attempt = 0) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '30',
    prop: 'imageinfo', iiprop: 'size|mime|extmetadata', iiextmetadatafilter: 'LicenseShortName',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${p}`, { headers: { 'User-Agent': UA } })
  if (res.status === 429 && attempt < 6) { await sleep(10000 * (attempt + 1)); return search(q, attempt + 1) }
  const json = await res.json()
  return (json.query?.pages ?? []).sort((a, b) => a.index - b.index)
}

const rows = []
for (const arg of process.argv.slice(2)) {
  const [label, q] = arg.split('=')
  const pages = await search(q)
  let n = 0
  for (const pg of pages) {
    const i = pg.imageinfo?.[0]
    if (!i || i.mime !== 'image/jpeg' || i.width < 1600 || i.width / i.height < 1.25 || i.width / i.height > 1.9) continue
    if (!OK_LICENSE.test(strip(i.extmetadata?.LicenseShortName?.value))) continue
    const name = pg.title.replace(/^File:/, '').replace(/ /g, '_')
    const h = createHash('md5').update(name).digest('hex')
    rows.push({ label: `${label}#${n++}`, title: pg.title.replace(/^File:/, ''), url: `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${name}/250px-${name}` })
    if (n >= 10) break
  }
  await sleep(2000)
}
rows.forEach((r) => console.log(r.label.padEnd(14), r.title))
const cells = rows.map((r) => `<figure><img src="${r.url}"><figcaption>${r.label}</figcaption></figure>`).join('')
writeFileSync(new URL('../public/_stock-candidates.html', import.meta.url), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#111;color:#fff;font:bold 20px system-ui;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px}figure{margin:0}img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}figcaption{padding:2px 4px;background:#000}</style>${cells}`)
