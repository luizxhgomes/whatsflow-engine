import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

const required = [
  '--ds-page-gutter:',
  '--ds-section-space:',
  '--ds-card-padding:',
  '--ds-header-height:',
  '--ds-brand-warm:',
  '.ds-icon-tile',
]
const pages = {
  login: '(auth)/login/page',
  dashboard: '(dashboard)/page',
}

for (const [name, route] of Object.entries(pages)) {
  const manifest = join('.next', 'server', 'app', `${route}_client-reference-manifest.js`)
  const scope = {}
  runInNewContext(readFileSync(manifest, 'utf8'), scope)
  const assets = Object.values(scope.__RSC_MANIFEST[`/${route}`].entryCSSFiles).flat()
  const css = assets.map(asset =>
    asset.inlined ? asset.content : readFileSync(join('.next', asset.path), 'utf8'),
  ).join('\n')
  const missing = required.filter(marker => !css.includes(marker))
  if (missing.length) {
    throw new Error(`CSS de ${name} incompleto (${missing.join(', ')}). Refaça o build sem cache.`)
  }
  console.log(`CSS de ${name} verificado.`)
}
