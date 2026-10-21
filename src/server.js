// Servidor local: lê a Live Client Data API do LoL, baixa/cacheia o Data Dragon
// e serve a interface (usada pelo overlay Electron ou por um navegador / celular).
const http = require('node:http')
const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { createDemo } = require('./demo')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const CACHE = path.join(ROOT, 'cache')
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const LOCALE = process.env.JH_LOCALE || 'pt_BR'
const RIOT_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata'

// A API do cliente usa certificado autoassinado da Riot; só aceitamos isso para o 127.0.0.1.
const riotAgent = new https.Agent({ rejectUnauthorized: false })

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
}

function getJSON(url, { agent, timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent, timeout }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      let body = ''
      res.setEncoding('utf8')
      res.on('data', c => { body += c })
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

function latestCachedMeta() {
  if (!fs.existsSync(CACHE)) return null
  const files = fs.readdirSync(CACHE).filter(f => f.startsWith('meta-') && f.endsWith(`-${LOCALE}.json`)).sort()
  return files.length ? JSON.parse(fs.readFileSync(path.join(CACHE, files.at(-1)), 'utf8')) : null
}

async function loadMeta() {
  fs.mkdirSync(CACHE, { recursive: true })
  let version
  try {
    version = (await getJSON(`${DDRAGON}/api/versions.json`))[0]
  } catch (e) {
    const cached = latestCachedMeta()
    if (cached) return cached
    throw new Error(`Sem internet e sem cache do Data Dragon (${e.message})`)
  }
  const file = path.join(CACHE, `meta-${version}-${LOCALE}.json`)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))

  const base = `${DDRAGON}/cdn/${version}/data`
  const [champs, itemsEn, itemsLoc, spells] = await Promise.all([
    getJSON(`${base}/${LOCALE}/champion.json`),
    getJSON(`${base}/en_US/item.json`),
    getJSON(`${base}/${LOCALE}/item.json`),
    getJSON(`${base}/${LOCALE}/summoner.json`),
  ])

  const meta = { version, locale: LOCALE, champions: {}, items: {}, itemByName: {}, spells: {} }
  for (const c of Object.values(champs.data)) {
    meta.champions[c.id] = { id: c.id, name: c.name, tags: c.tags, info: c.info }
  }
  for (const [id, it] of Object.entries(itemsEn.data)) {
    const haste = /Gain (\d+) Summoner Spell Haste/.exec(it.description || '')
    meta.items[id] = {
      name: itemsLoc.data[id]?.name || it.name,
      en: it.name,
      gold: it.gold?.total || 0,
      tags: it.tags || [],
      from: it.from || [],
      haste: haste ? Number(haste[1]) : 0,
      sr: !!it.maps?.['11'] && !!it.gold?.purchasable,
    }
  }
  // Índice nome (inglês, minúsculo) -> id, preferindo a versão de Summoner's Rift
  for (const [id, it] of Object.entries(meta.items)) {
    const key = it.en.toLowerCase()
    const cur = meta.itemByName[key]
    const better = !cur || (it.sr && !meta.items[cur].sr) || (it.sr === meta.items[cur].sr && id.length < cur.length)
    if (better) meta.itemByName[key] = id
  }
  for (const [key, s] of Object.entries(spells.data)) {
    meta.spells[key] = { name: s.name, cooldown: s.cooldown?.[0] || 0, image: s.image?.full || `${key}.png` }
  }
  fs.writeFileSync(file, JSON.stringify(meta))
  return meta
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '')
  const file = path.resolve(PUBLIC, rel)
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(buf)
  })
}

async function start({ demo = false, port = 7878, host = '127.0.0.1' } = {}) {
  let meta = null, metaError = null
  try { meta = await loadMeta() } catch (e) { metaError = e.message; console.error('[meta]', e.message) }

  const demoGame = demo && meta ? createDemo(meta) : null
  let latest = { status: 'waiting' }

  async function poll() {
    try {
      const data = await getJSON(RIOT_URL, { agent: riotAgent, timeout: 1500 })
      // Na tela de carregamento a API responde, mas ainda sem jogadores
      latest = data?.allPlayers?.length ? { status: 'ingame', data } : { status: 'loading' }
    } catch {
      latest = { status: 'waiting' }
    } finally {
      setTimeout(poll, 1000).unref()
    }
  }
  if (!demoGame) poll()

  const server = http.createServer((req, res) => {
    const json = obj => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)) }
    if (req.url === '/api/meta') return json(meta || { error: metaError })
    if (req.url === '/api/game') return json(demoGame ? { status: 'demo', data: demoGame.snapshot() } : latest)
    serveStatic(req, res)
  })

  const actualPort = await new Promise((resolve, reject) => {
    server.once('error', err => {
      if (err.code === 'EADDRINUSE' && port !== 0) server.listen(0, host, () => resolve(server.address().port))
      else reject(err)
    })
    server.listen(port, host, () => resolve(server.address().port))
  })
  return { port: actualPort, server }
}

module.exports = { start }

if (require.main === module) {
  const lan = process.argv.includes('--lan')
  start({ demo: process.argv.includes('--demo'), host: lan ? '0.0.0.0' : '127.0.0.1' }).then(({ port }) => {
    console.log(`Jungle Helper rodando em http://127.0.0.1:${port}`)
    if (lan) {
      for (const ifs of Object.values(os.networkInterfaces())) for (const i of ifs || []) {
        if (i.family === 'IPv4' && !i.internal) console.log(`  no celular/2º monitor: http://${i.address}:${port}`)
      }
    }
  })
}
