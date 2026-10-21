// Lógica pura: transforma os dados da Live Client Data API em conselhos de jungle.
// Não tem DOM aqui, então dá pra testar no Node (test/engine.test.mjs).
import { TIMERS, COSMIC_INSIGHT_HASTE, INSPIRATION_TREE } from './config.js'
import { BUILDS, DEFAULT_BUILDS, SITUATIONAL, HEALERS, SHIELDERS, CC_HEAVY } from './data/builds.js'

export const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
export const ROLE_LABEL = { TOP: 'TOP', JUNGLE: 'JG', MIDDLE: 'MID', BOTTOM: 'ADC', UTILITY: 'SUP' }
export const LANE_LABEL = { top: 'TOP', mid: 'MID', bot: 'BOT' }
const ROLE_LANE = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'bot', UTILITY: 'bot' }
const ESCAPES = new Set(['SummonerFlash', 'SummonerHaste', 'SummonerBarrier', 'SummonerBoost', 'SummonerHeal'])
export const SPELL_ABBR = {
  SummonerFlash: 'flash', SummonerDot: 'ign', SummonerTeleport: 'tp', SummonerExhaust: 'exh', SummonerHeal: 'heal',
  SummonerBarrier: 'barreira', SummonerBoost: 'cleanse', SummonerHaste: 'ghost', SummonerSmite: 'smite',
}

export const fmt = s => {
  s = Math.max(0, Math.floor(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const lc = s => String(s ?? '').toLowerCase()
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ---------- normalização ----------

export function champIdFromRaw(raw, name, meta) {
  const m = /game_character_displayname_(\w+)/.exec(raw || '')
  if (m && meta.champions[m[1]]) return m[1]
  const found = Object.values(meta.champions).find(c => c.name === name || c.id === name)
  return found ? found.id : (m ? m[1] : name)
}

export function spellKeyFromRaw(spell, meta) {
  const raw = spell?.rawDisplayName || ''
  if (/Smite/i.test(raw)) return 'SummonerSmite'
  if (/Teleport/i.test(raw)) return 'SummonerTeleport'
  const m = /SummonerSpell_(\w+?)_DisplayName/.exec(raw)
  if (m && meta.spells[m[1]]) return m[1]
  const found = Object.entries(meta.spells).find(([, s]) => s.name === spell?.displayName)
  return found ? found[0] : (m ? m[1] : spell?.displayName || '?')
}

function normalizePlayer(p, meta) {
  const champ = champIdFromRaw(p.rawChampionName, p.championName, meta)
  const c = meta.champions[champ] || { name: p.championName, tags: [], info: { attack: 5, magic: 5, defense: 5 } }
  const items = (p.items || []).map(i => String(i.itemID))
  const spells = [p.summonerSpells?.summonerSpellOne, p.summonerSpells?.summonerSpellTwo].map(s => {
    const key = spellKeyFromRaw(s, meta)
    const m = meta.spells[key]
    return { key, name: m?.name || s?.displayName || key, cd: m?.cooldown || 300, image: m?.image || `${key}.png` }
  })
  const name = p.riotIdGameName || (p.summonerName || p.riotId || '').split('#')[0] || p.championName
  const aliases = [p.riotIdGameName, p.riotId, p.summonerName, (p.summonerName || '').split('#')[0], (p.riotId || '').split('#')[0]]
    .filter(Boolean).map(lc)
  const trees = [p.runes?.primaryRuneTree?.id, p.runes?.secondaryRuneTree?.id]
  const s = p.scores || {}
  return {
    name, aliases, champ, champName: c.name, tags: c.tags || [], info: c.info || {},
    level: p.level || 1, dead: !!p.isDead, respawn: p.respawnTimer || 0,
    items, itemGold: items.reduce((a, id) => a + (meta.items[id]?.gold || 0), 0),
    k: s.kills || 0, d: s.deaths || 0, a: s.assists || 0, cs: s.creepScore || 0,
    spells, team: p.team, position: p.position,
    haste: items.reduce((a, id) => a + (meta.items[id]?.haste || 0), 0),
    maybeCosmic: trees.includes(INSPIRATION_TREE),
    hasSmite: spells.some(sp => sp.key === 'SummonerSmite'),
  }
}

// Usa a posição da API (fila ranqueada/draft); senão deduz por Smite e tags do campeão.
function assignRoles(team) {
  const taken = new Set()
  for (const p of team) if (ROLES.includes(p.position) && !taken.has(p.position)) { p.role = p.position; taken.add(p.role) }
  const fit = (p, r) => {
    const t = p.tags
    switch (r) {
      case 'JUNGLE': return p.hasSmite ? 10 : 0
      case 'UTILITY': return t[0] === 'Support' ? 4 : t.includes('Support') ? 2 : 0
      case 'BOTTOM': return t[0] === 'Marksman' ? 4 : t.includes('Marksman') ? 2 : 0
      case 'MIDDLE': return t[0] === 'Mage' || t[0] === 'Assassin' ? 3 : t.includes('Mage') ? 1.5 : 0
      default: return t[0] === 'Fighter' || t[0] === 'Tank' ? 3 : t.includes('Fighter') ? 1 : 0
    }
  }
  for (const r of ['JUNGLE', 'UTILITY', 'BOTTOM', 'MIDDLE', 'TOP']) {
    if (taken.has(r)) continue
    const free = team.filter(p => !p.role)
    if (!free.length) break
    free.sort((a, b) => fit(b, r) - fit(a, r))
    free[0].role = r
    taken.add(r)
  }
  for (const p of team) if (!p.role) p.role = 'TOP'
}

export function normalizeGame(raw, meta) {
  if (!raw?.allPlayers?.length) return null
  const players = raw.allPlayers.map(p => normalizePlayer(p, meta))
  for (const team of ['ORDER', 'CHAOS']) assignRoles(players.filter(p => p.team === team))
  for (const p of players) p.lane = ROLE_LANE[p.role]

  const ap = raw.activePlayer || {}
  const apAliases = [ap.riotId, ap.riotIdGameName, ap.summonerName, (ap.summonerName || '').split('#')[0]].filter(Boolean).map(lc)
  const me = players.find(p => p.aliases.some(a => apAliases.includes(a))) || players.find(p => p.team === 'ORDER') || players[0]
  me.isMe = true
  me.gold = ap.currentGold ?? 0

  const byRole = arr => [...arr].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
  const g = {
    t: raw.gameData?.gameTime || 0,
    mode: raw.gameData?.gameMode,
    me,
    allies: byRole(players.filter(p => p.team === me.team)),
    enemies: byRole(players.filter(p => p.team !== me.team)),
    players,
    events: raw.events?.Events || [],
    find: name => players.find(p => p.aliases.includes(lc(name))),
  }
  g.rawT = g.t
  g.side = me.team === 'CHAOS' ? 'red' : 'blue'
  g.enemyJg = g.enemies.find(p => p.role === 'JUNGLE')
  g.objectives = computeObjectives(g)
  g.jgSeen = trackJungler(g)
  return g
}

// ---------- objetivos ----------

function computeObjectives(g) {
  const { t, events } = g
  const teamOf = e => {
    const p = g.find(e.KillerName) || (e.Assisters || []).map(g.find).find(Boolean)
    return p ? (p.team === g.me.team ? 'ally' : 'enemy') : null
  }
  const of = re => events.filter(e => re.test(e.EventName))

  const drakes = { ally: [], enemy: [] }
  let dragonAt = TIMERS.dragon, elder = false
  for (const e of of(/^DragonKill$/)) {
    if (/elder/i.test(e.DragonType)) { elder = true; dragonAt = e.EventTime + TIMERS.elderRespawn; continue }
    drakes[teamOf(e) || 'enemy'].push(e.DragonType)
    elder = drakes.ally.length >= 4 || drakes.enemy.length >= 4
    dragonAt = e.EventTime + (elder ? TIMERS.elderRespawn : TIMERS.dragonRespawn)
  }
  const soulPoint = elder ? null : drakes.ally.length === 3 ? 'ally' : drakes.enemy.length === 3 ? 'enemy' : null

  const list = []
  const add = (id, label, at, extra = {}) => list.push({ id, label, at, state: t >= at ? 'up' : 'soon', ...extra })
  add('dragon', elder ? 'Ancião' : 'Dragão', dragonAt, { elder })

  const grubs = of(/Horde/).length
  if (grubs < TIMERS.grubsCount && t < TIMERS.herald - 15) add('grubs', 'Larvas', TIMERS.grubs, { detail: grubs ? `${grubs}/${TIMERS.grubsCount}` : '' })
  if (!of(/Herald/).length && t < TIMERS.baron - 15) add('herald', 'Arauto', TIMERS.herald)
  if (!of(/Atakhan/i).length) add('atakhan', 'Atakhan', TIMERS.atakhan)
  const baronKills = of(/^BaronKill$/)
  add('baron', 'Barão', baronKills.length ? baronKills.at(-1).EventTime + TIMERS.baronRespawn : TIMERS.baron)

  return { list, drakes, soulPoint, elder, byId: Object.fromEntries(list.map(o => [o.id, o])) }
}

// Última vez que o jungler inimigo apareceu no kill feed / pegando objetivo
function trackJungler(g) {
  const ej = g.enemyJg
  if (!ej) return null
  let seen = null
  for (const e of g.events) {
    const names = [e.KillerName, e.VictimName, ...(e.Assisters || [])].filter(Boolean)
    if (!names.some(n => g.find(n) === ej)) continue
    let lane = null
    if (e.EventName === 'ChampionKill') {
      const lanePlayer = [e.VictimName, e.KillerName, ...(e.Assisters || [])].map(g.find).find(p => p && p.lane !== 'jungle')
      lane = lanePlayer?.lane || null
    } else if (/Dragon/.test(e.EventName)) lane = 'bot'
    else if (/Herald|Horde|Baron/.test(e.EventName)) lane = 'top'
    else continue
    seen = { lane, time: e.EventTime, what: e.EventName }
  }
  return seen
}

// ---------- feitiços ----------

export function spellCooldown(p, spell, cosmic) {
  const haste = p.haste + (cosmic ? COSMIC_INSIGHT_HASTE : 0)
  return (spell.cd * 100) / (100 + haste)
}

export function spellRemaining(ss, p, key, t) {
  const s = ss?.[p.name]?.[key]
  return s ? Math.max(0, s.end - t) : 0
}

// ---------- ganks ----------

const isOpposite = (a, b) => (a === 'top' && b === 'bot') || (a === 'bot' && b === 'top')
const hasCC = p => p.tags.includes('Tank') || p.tags[0] === 'Support' || CC_HEAVY.includes(p.champ)

export function scoreLanes(g, ss) {
  const out = {}
  for (const lane of ['top', 'mid', 'bot']) {
    const A = g.allies.filter(p => p.lane === lane), E = g.enemies.filter(p => p.lane === lane)
    const aliveE = E.filter(p => !p.dead), aliveA = A.filter(p => !p.dead)
    let s = 0
    const why = []
    const blocked = E.length > 0 && aliveE.length === 0

    for (const e of aliveE) {
      const fl = spellRemaining(ss, e, 'SummonerFlash', g.t)
      if (fl > 20) { s += 3; why.push(`${e.champName} sem Flash (${fmt(fl)})`) }
      for (const sp of e.spells) {
        if (sp.key === 'SummonerFlash' || !ESCAPES.has(sp.key)) continue
        if (spellRemaining(ss, e, sp.key, g.t) > 15) { s += 1; why.push(`${e.champName} sem ${sp.name}`) }
      }
      if (['Marksman', 'Mage'].includes(e.tags[0])) s += 0.5
      if (e.k - e.d >= 3) { s += 1; why.push(`${e.champName} ${e.k}/${e.d} vale shutdown`) }
    }

    if (A.length && !aliveA.length) { s -= 2; why.push('aliado morto') }
    if (aliveA.length && aliveE.length) {
      const lv = avg(aliveA.map(p => p.level)) - avg(aliveE.map(p => p.level))
      if (Math.abs(lv) >= 1) { s += clamp(lv, -2, 2); why.push(lv > 0 ? `aliado +${Math.round(lv)} nv` : `aliado ${Math.round(lv)} nv`) }
      if (aliveA.some(p => p.spells.some(sp => sp.key === 'SummonerDot' || sp.key === 'SummonerExhaust'))) s += 0.5
      if (aliveA.some(hasCC)) { s += 0.5; why.push('aliado com CC') }
      const kd = aliveA.reduce((x, p) => x + p.k - p.d, 0)
      if (kd >= 2) { s += 1; why.push('aliado ganhando') } else if (kd <= -3) { s -= 0.5; why.push('aliado atrás') }
    }

    const js = g.jgSeen
    if (g.enemyJg?.dead) { s += 1; why.push('jg inimigo morto') }
    else if (js?.lane && g.t - js.time < 45) {
      if (js.lane === lane) { s -= 1.5; why.push('jg inimigo por perto') }
      else if (isOpposite(js.lane, lane)) { s += 1; why.push('jg inimigo do outro lado') }
    }
    out[lane] = { lane, score: blocked ? -9 : Math.round(s * 10) / 10, why, blocked }
  }
  return out
}

// ---------- rota inicial ----------

// Coordenadas do minimapa (0–100, base azul no canto inferior esquerdo)
const CAMPS_BLUE = { Blue: [25, 46], Gromp: [15, 42], Wolves: [27, 57], Raptors: [47, 64], Red: [53, 74], Krugs: [57, 83] }
export const CAMPS = {
  ORDER: CAMPS_BLUE,
  CHAOS: Object.fromEntries(Object.entries(CAMPS_BLUE).map(([k, [x, y]]) => [k, [100 - x, 100 - y]])),
}
export const CAMP_LABEL = { Blue: 'Azul', Gromp: 'Sapo', Wolves: 'Lobos', Raptors: 'Aves', Red: 'Vermelho', Krugs: 'Krugs' }
export const SPOTS = { top: [13, 13], mid: [50, 50], bot: [87, 87], scuttle_top: [27, 32], scuttle_bot: [73, 68], dragon: [67, 71], baron: [33, 29] }

function pregameScore(g, lane) {
  let s = 0
  for (const a of g.allies.filter(p => p.lane === lane)) {
    if (hasCC(a)) s += 1
    if (a.spells.some(sp => sp.key === 'SummonerDot' || sp.key === 'SummonerExhaust')) s += 0.5
  }
  for (const e of g.enemies.filter(p => p.lane === lane)) {
    if (['Marksman', 'Mage'].includes(e.tags[0])) s += 0.5
    if (e.tags[0] === 'Tank') s -= 0.5
  }
  return s
}

export function planRoute(g) {
  const pre = { top: pregameScore(g, 'top'), mid: pregameScore(g, 'mid'), bot: pregameScore(g, 'bot') }
  const target = pre.top >= pre.bot ? 'top' : 'bot'
  const blueBuffSide = g.me.team === 'CHAOS' ? 'bot' : 'top'
  const start = target === blueBuffSide ? 'Red' : 'Blue' // começa do lado oposto e termina perto do alvo
  const full = start === 'Red' ? ['Red', 'Krugs', 'Raptors', 'Wolves', 'Blue', 'Gromp'] : ['Blue', 'Gromp', 'Wolves', 'Raptors', 'Red', 'Krugs']
  const fast = start === 'Red' ? ['Red', 'Blue', 'Gromp'] : ['Blue', 'Red', 'Raptors']
  const style = (BUILDS[g.me.champ] || DEFAULT_BUILDS[archetypeOf(g.me)]).style
  const best = Object.entries(pre).sort((a, b) => b[1] - a[1])[0][0]
  return { target, best, start, full, fast, style, path: style === 'gank' ? fast : full, camps: CAMPS[g.me.team] || CAMPS.ORDER }
}

// ---------- build ----------

export function archetypeOf(p) {
  if (BUILDS[p.champ]) return BUILDS[p.champ].arch
  if (p.tags[0] === 'Tank') return 'tank'
  if ((p.info.magic || 0) > (p.info.attack || 0)) return 'ap'
  if (p.tags.includes('Marksman')) return 'onhit'
  if (p.tags[0] === 'Assassin') return 'ad_assassin'
  return 'bruiser'
}

const goldWithTag = (p, meta, tags) => p.items.reduce((a, id) => {
  const it = meta.items[id]
  return a + (it && it.tags.some(t => tags.includes(t)) ? it.gold : 0)
}, 0)

export function analyzeThreats(g, meta) {
  const E = g.enemies
  const dmg = E.map(p => {
    const ap = goldWithTag(p, meta, ['SpellDamage']), ad = goldWithTag(p, meta, ['Damage', 'CriticalStrike'])
    if (ap + ad >= 1500) return ap > ad ? 'AP' : 'AD'
    return (p.info.magic || 0) > (p.info.attack || 0) ? 'AP' : 'AD'
  })
  const apCount = dmg.filter(d => d === 'AP').length, adCount = dmg.filter(d => d === 'AD').length
  const out = []
  const fed = E.filter(p => p.k - p.d >= 4).sort((a, b) => (b.k - b.d) - (a.k - a.d))[0]
  if (fed) out.push({ kind: 'fed', reason: `${fed.champName} ${fed.k}/${fed.d}` })
  const healers = E.filter(p => HEALERS.includes(p.champ))
  if (healers.length) out.push({ kind: 'antiheal', reason: `cura: ${healers.map(p => p.champName).join(', ')}` })
  if (apCount >= 3) out.push({ kind: 'vsAP', reason: `${apCount} inimigos de dano mágico` })
  if (adCount >= 3) out.push({ kind: 'vsAD', reason: `${adCount} inimigos de dano físico` })
  const tanks = E.filter(p => p.tags[0] === 'Tank' || goldWithTag(p, meta, ['Armor', 'SpellBlock', 'Health']) >= 4500)
  if (tanks.length >= 2) out.push({ kind: 'vsTanks', reason: `${tanks.length} tanques` })
  const crit = E.filter(p => p.items.some(id => meta.items[id]?.tags.includes('CriticalStrike') && meta.items[id].gold >= 2500))
  if (crit.length) out.push({ kind: 'vsCrit', reason: `crítico: ${crit.map(p => p.champName).join(', ')}` })
  const shields = E.filter(p => SHIELDERS.includes(p.champ))
  if (shields.length >= 2) out.push({ kind: 'vsShields', reason: `escudos: ${shields.map(p => p.champName).join(', ')}` })
  return { list: out, apCount, adCount }
}

export function buildAdvice(g, meta) {
  const me = g.me
  const arch = archetypeOf(me)
  const base = BUILDS[me.champ] || DEFAULT_BUILDS[arch]
  const id = name => meta.itemByName[lc(name)]
  const owned = new Set(me.items)
  const core = base.core.map(id).filter(Boolean)
  const threats = analyzeThreats(g, meta)

  const situ = []
  for (const th of threats.list) {
    for (const n of SITUATIONAL[th.kind]?.[arch] || []) {
      const i = id(n)
      if (i && !owned.has(i) && !situ.some(s => s.id === i)) {
        situ.push({ id: i, reason: th.reason, early: core.includes(i) })
        break
      }
    }
  }

  const hasBoots = me.items.some(i => meta.items[i]?.tags.includes('Boots'))
  let bootsName = base.boots
  if (threats.apCount >= 3) bootsName = "Mercury's Treads"
  else if (threats.adCount >= 4) bootsName = 'Plated Steelcaps'
  const boots = hasBoots ? null : id(bootsName)

  const nextId = core.find(i => !owned.has(i))
  let next = null
  if (nextId) {
    const it = meta.items[nextId]
    const discount = it.from.filter(c => owned.has(c)).reduce((a, c) => a + (meta.items[c]?.gold || 0), 0)
    next = { id: nextId, name: it.name, total: it.gold, remaining: Math.max(0, it.gold - discount) }
  }
  const pet = id(base.pet)
  return {
    arch, core: core.map(i => ({ id: i, owned: owned.has(i) })), next, boots, situ: situ.slice(0, 4), threats,
    pet: pet && !owned.has(pet) ? pet : null,
  }
}

// ---------- conselhos ----------

// Objetivo vivo, ou que nasce antes de a janela (ex.: inimigos mortos) acabar
function objectiveToForce(g, window = 0) {
  const ready = g.objectives.list.filter(o => o.state === 'up' || o.at - g.t <= window)
  const pref = ['baron', 'dragon', 'atakhan', 'herald', 'grubs']
  const o = pref.map(id => ready.find(x => x.id === id)).find(Boolean)
  return o ? o.label : null
}

export function advise(g, ss, meta) {
  const tips = []
  const add = (prio, tag, text) => tips.push({ prio, tag, text })
  const t = g.t
  const lanes = scoreLanes(g, ss)
  const ranked = Object.values(lanes).sort((a, b) => b.score - a.score)
  const route = planRoute(g)
  const build = buildAdvice(g, meta)
  const deadE = g.enemies.filter(p => p.dead && p.respawn > 8), deadA = g.allies.filter(p => p.dead && p.respawn > 8)
  const objSoon = g.objectives.list.find(o => o.state === 'soon' && o.at - t <= 75 && o.at - t > 0)

  if (deadE.length >= 2 && deadE.length > deadA.length) {
    const win = Math.min(...deadE.map(p => p.respawn))
    const obj = objectiveToForce(g, win - 10)
    add(1, 'VANTAGEM', `${deadE.length} inimigos mortos por ${Math.round(win)}s: ${obj ? `faça o ${obj} agora` : 'empurre e derrube torres'}`)
  }
  if (deadA.length >= 2 && deadA.length > deadE.length) {
    add(1, 'PERIGO', `Vocês estão ${5 - deadA.length}v${5 - deadE.length}: não conteste, recue e farme do lado seguro`)
  }
  if (g.enemyJg?.dead && g.enemyJg.respawn > 12 && deadE.length < 2) {
    add(1, 'INVADE', `${g.enemyJg.champName} (jg) morto por ${Math.round(g.enemyJg.respawn)}s: roube camps dele ou force objetivo`)
  }
  if (objSoon) {
    const dt = objSoon.at - t
    const how = dt < 30 ? 'fique no rio, limpe a visão inimiga e guarde o Smite'
      : objSoon.id === 'dragon' ? 'resete agora, compre e chegue com prioridade de bot/mid'
      : 'resete e coloque visão no rio antes de nascer'
    add(1, 'OBJETIVO', `${objSoon.label} em ${fmt(objSoon.at - t)}: ${how}`)
  }
  if (g.objectives.soulPoint === 'enemy') add(1, 'ALMA', 'Inimigo tem 3 dragões: o próximo dá a ALMA. Não deixe sair de graça')
  if (g.objectives.soulPoint === 'ally') add(1, 'ALMA', 'Vocês estão no ponto de alma: o próximo dragão fecha a ALMA')

  const js = g.jgSeen
  if (js?.lane && t - js.time < 60 && g.enemyJg && !g.enemyJg.dead) {
    const opp = js.lane === 'top' ? 'bot' : js.lane === 'bot' ? 'top' : null
    add(2, 'JG INIMIGO', `${g.enemyJg.champName} apareceu no ${LANE_LABEL[js.lane]} há ${Math.round(t - js.time)}s` +
      (opp ? `: lado ${LANE_LABEL[opp]} livre pra gank, objetivo ou invade` : ': cuidado com counter-gank perto do mid'))
  }

  const best = ranked[0]
  if (t > 150 && best && !best.blocked && best.score >= 2) {
    const flash = best.why.some(w => w.includes('Flash'))
    add(flash ? 1 : 2, 'GANK', `${LANE_LABEL[best.lane]}: ${best.why.slice(0, 3).join(', ')}`)
  }

  for (const lane of ['top', 'mid', 'bot']) {
    const E = g.enemies.filter(p => p.lane === lane)
    if (E.length && E.every(p => p.dead && p.respawn > 15)) {
      add(2, 'TORRE', `${LANE_LABEL[lane]} sem inimigo por ${Math.round(Math.min(...E.map(p => p.respawn)))}s: ajude a derrubar ${t < TIMERS.plates ? 'placas' : 'a torre'}`)
    }
  }

  if (g.enemyJg) {
    const d = g.me.level - g.enemyJg.level
    if (d <= -2) add(2, 'NÍVEL', `${d} níveis contra ${g.enemyJg.champName}: evite 1v1, farme e jogue com as lanes`)
    else if (d >= 2) add(2, 'NÍVEL', `+${d} níveis contra ${g.enemyJg.champName}: invada e duele`)
  }

  if (t < 90) {
    const r = route
    add(2, 'ROTA', `Comece no ${CAMP_LABEL[r.start]}: ${r.path.map(c => CAMP_LABEL[c]).join(' → ')} → ${r.style === 'gank' ? `gank ${LANE_LABEL[r.target]} nv 3` : `scuttle/gank ${LANE_LABEL[r.target]}`}`)
  }
  if (t >= 150 && t < TIMERS.scuttle + 10) {
    add(2, 'SCUTTLE', `Scuttles em ${fmt(TIMERS.scuttle - t)}: dispute no lado onde suas lanes têm prioridade`)
  }

  if (build.next && g.me.gold >= Math.min(build.next.remaining, 1300) && !objSoon && !g.me.dead) {
    add(3, 'OURO', `${Math.floor(g.me.gold)} de ouro: resete pra ${g.me.gold >= build.next.remaining ? 'fechar' : 'avançar em'} ${build.next.name}`)
  }

  if (!tips.length) {
    const next = g.objectives.list.filter(o => o.state === 'soon').sort((a, b) => a.at - b.at)[0]
    const up = objectiveToForce(g)
    if (up) add(3, 'MAPA', `${up} vivo: só inicie com vantagem numérica ou visão; senão farme perto e espere a luta`)
    else if (next) add(3, 'MAPA', `Próximo: ${next.label} em ${fmt(next.at - t)}. Farme do lado dele e chegue 1 min antes com visão`)
  }

  tips.sort((a, b) => a.prio - b.prio)
  return { tips: tips.slice(0, 5), lanes, ranked, route, build }
}
