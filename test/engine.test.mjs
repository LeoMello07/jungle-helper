// Roda o motor sobre a partida demo em vários minutos e checa o básico.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeGame, advise, fmt } from '../public/engine.js'

const require = createRequire(import.meta.url)
const { createDemo } = require('../src/demo.js')
const file = fs.readdirSync('cache').filter(f => f.startsWith('meta-')).sort().at(-1)
const meta = JSON.parse(fs.readFileSync(`cache/${file}`, 'utf8'))

for (const start of [40, 205, 290, 540, 940, 1300]) {
  process.env.DEMO_START = start
  const g = normalizeGame(createDemo(meta).snapshot(), meta)
  assert.equal(g.me.champ, 'LeeSin')
  assert.equal(g.enemyJg.champ, 'Graves')
  const ss = start === 540 ? { Esferas: { SummonerFlash: { start: 520, end: 820 } } } : {}
  const a = advise(g, ss, meta)
  console.log(`\n== ${fmt(g.t)} | lanes`, a.ranked.map(l => `${l.lane}:${l.score}`).join(' '),
    '| obj', g.objectives.list.map(o => `${o.label}@${fmt(o.at)}:${o.state}`).join(' '))
  for (const tip of a.tips) console.log(`  [${tip.prio}] ${tip.tag}: ${tip.text}`)
  console.log('  build:', a.build.core.map(c => meta.items[c.id].name + (c.owned ? '✓' : '')).join(', '),
    '| próximo:', a.build.next?.name, a.build.next?.remaining,
    '| situ:', a.build.situ.map(s => `${meta.items[s.id].name} (${s.reason})`).join('; '))
}

// Sem "position" (blind/practice tool): papéis deduzidos por Smite e tags
process.env.DEMO_START = 300
const raw = createDemo(meta).snapshot()
raw.allPlayers.forEach(p => { p.position = '' })
const g2 = normalizeGame(raw, meta)
assert.deepEqual(g2.enemies.map(p => p.champ), ['Darius', 'Graves', 'Syndra', 'Jinx', 'Soraka'])
assert.deepEqual(g2.allies.map(p => p.role), ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'])
console.log('\nok')
