import {
  normalizeGame, advise, spellCooldown, fmt, ROLE_LABEL, LANE_LABEL, SPELL_ABBR, SPOTS, CAMP_LABEL,
} from './engine.js'

const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`jh.${k}`)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(`jh.${k}`, JSON.stringify(v)) } catch { /* sem storage */ } },
}

const params = new URLSearchParams(location.search)
const ELECTRON = !!window.overlay
const OVERLAY = ELECTRON || params.has('overlay')
document.body.classList.add(OVERLAY ? 'mode-overlay' : 'mode-browser')

const S = {
  meta: null, raw: null, status: 'loading', game: null, advice: null,
  fetchedAt: 0, rawT: 0,
  sig: null, ss: {}, cosmic: {},
  interactive: !ELECTRON,
  hidden: store.get('hidden', {}),
}

const DD = () => `https://ddragon.leagueoflegends.com/cdn/${S.meta.version}/img`
const champImg = id => `${DD()}/champion/${id}.png`
const itemImg = id => `${DD()}/item/${id}.png`
const spellImg = sp => `${DD()}/spell/${sp.image}`

// ---------- dados ----------

async function boot() {
  try {
    S.meta = await fetch('/api/meta').then(r => r.json())
  } catch { S.meta = { error: 'servidor offline' } }
  if (S.meta.error) {
    $('#p-obj .pb').innerHTML = `<div class="waiting">Erro ao carregar dados do jogo: <b>${esc(S.meta.error)}</b></div>`
    return
  }
  layout()
  initDrag()
  poll()
  setInterval(render, 250)
}

async function poll() {
  try {
    const r = await fetch('/api/game').then(r => r.json())
    S.status = r.status
    if (r.data?.allPlayers) {
      S.raw = r.data
      S.rawT = r.data.gameData?.gameTime || 0
      S.fetchedAt = performance.now()
      onNewData()
    } else {
      S.raw = null
      S.game = null
    }
  } catch {
    S.status = 'offline'
  }
  setTimeout(poll, 1000)
}

function onNewData() {
  const g = normalizeGame(S.raw, S.meta)
  if (!g) return
  // Partida nova -> zera os timers
  const sig = g.players.map(p => p.champ + p.name).sort().join('|')
  if (sig !== S.sig) {
    const saved = store.get('ss', {})
    const sameGame = saved.sig === sig && saved.t <= g.t + 5
    S.sig = sig
    S.ss = sameGame ? saved.ss : {}
    S.cosmic = sameGame ? saved.cosmic : {}
  }
  S.game = g
}

const saveSS = () => store.set('ss', { sig: S.sig, t: S.game?.t || 0, ss: S.ss, cosmic: S.cosmic })

// relógio interpolado entre as leituras (até 3s, para não andar com o jogo pausado)
const nowT = () => S.rawT + Math.min(3, (performance.now() - S.fetchedAt) / 1000)

// ---------- feitiços ----------

function callout(p, key, end) {
  return `${ROLE_LABEL[p.role]} ${SPELL_ABBR[key] || key} ${fmt(end)}`
}

function markSpell(p, sp, src) {
  const t = S.game.t
  const cur = S.ss[p.name]?.[sp.key]
  if (cur && cur.end > t) {
    // apertar de novo logo em seguida desfaz (marcou errado)
    if (src === 'hotkey' && t - cur.start < 4) cancelSpell(p, sp)
    else copy(callout(p, sp.key, cur.end))
    return
  }
  const end = t + spellCooldown(p, sp, S.cosmic[p.name])
  S.ss[p.name] = { ...S.ss[p.name], [sp.key]: { start: t, end } }
  saveSS()
  copy(callout(p, sp.key, end))
  render()
}

function cancelSpell(p, sp) {
  if (S.ss[p.name]) delete S.ss[p.name][sp.key]
  saveSS()
  toast(`${p.champName}: ${sp.name} cancelado`)
  render()
}

function copyAll() {
  const g = S.game
  if (!g) return
  const parts = []
  for (const p of g.enemies) for (const sp of p.spells) {
    const s = S.ss[p.name]?.[sp.key]
    if (s && s.end > g.t) parts.push(callout(p, sp.key, s.end))
  }
  copy(parts.length ? parts.join(' | ') : '', parts.length ? null : 'Nenhum feitiço marcado')
}

function copy(text, emptyMsg) {
  if (!text) { toast(emptyMsg || 'Nada para copiar'); return }
  if (ELECTRON) window.overlay.copy(text)
  else navigator.clipboard?.writeText(text).catch(() => {})
  toast(`Copiado: ${text}  (cole no chat com Ctrl+V)`)
}

let toastTimer
function toast(msg) {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200)
}

function onHotkey({ action, slot, which, panel }) {
  if (action === 'edit') return setInteractive(!S.interactive)
  if (action === 'toggle') return togglePanel(panel)
  if (action === 'copyall') return copyAll()
  if (action === 'spell' && S.game) {
    const p = S.game.enemies[slot - 1]
    if (!p) return
    const flash = p.spells.find(s => s.key === 'SummonerFlash')
    const sp = which === 'flash' ? (flash || p.spells[0]) : (p.spells.find(s => s !== flash) || p.spells[1])
    if (sp) markSpell(p, sp, 'hotkey')
  }
}

function setInteractive(on) {
  S.interactive = on
  document.body.classList.toggle('editing', on && OVERLAY)
  if (ELECTRON) window.overlay.setInteractive(on)
}

function togglePanel(id) {
  S.hidden[id] = !S.hidden[id]
  store.set('hidden', S.hidden)
  $(`#p-${id}`).classList.toggle('hidden', !!S.hidden[id])
}

// ---------- render ----------

function render() {
  const g = S.game
  if (g) {
    g.t = nowT()
    // respawn também anda com o relógio
    for (const p of g.players) p.respawnNow = Math.max(0, p.respawn - (g.t - g.rawT))
    S.advice = advise(g, S.ss, S.meta)
  }
  renderObjectives()
  renderSpells()
  renderCoach()
  renderBuild()
}

const DRAKE_COLOR = {
  Fire: '#e8643c', Water: '#3fa7d6', Earth: '#b08a5a', Air: '#c9d6df', Hextech: '#3cc8e8', Chemtech: '#8bc34a', Elder: '#c8aa6e',
}
const OBJ_ICON = { dragon: 'D', grubs: 'L', herald: 'A', atakhan: 'K', baron: 'B' }

function renderObjectives() {
  const el = $('#p-obj .pb')
  const g = S.game
  if (!g) {
    const msg = {
      waiting: 'Aguardando partida… abra um jogo (ou rode <b>npm run demo</b>)',
      loading: 'Tela de carregamento…',
      offline: 'Servidor local offline',
    }[S.status] || 'Carregando…'
    el.innerHTML = `<div class="waiting">${msg}</div>`
    $('#clock').textContent = '--:--'
    return
  }
  $('#clock').textContent = fmt(g.t)
  const ob = g.objectives
  const chips = ob.list.filter(o => o.state === 'up' || o.at - g.t <= 240 || o.id === 'dragon').map(o => {
    const dt = o.at - g.t
    return `<div class="ob ${o.state} ${o.state === 'soon' && dt < 60 ? 'close' : ''}">
      <span class="oi"><i>${OBJ_ICON[o.id]}</i></span>
      <span class="ol">${esc(o.label)}${o.detail ? ` ${esc(o.detail)}` : ''}</span>
      <b>${o.state === 'up' ? 'VIVO' : fmt(dt)}</b></div>`
  }).join('')
  const dots = list => {
    const d = list.map(t => `<i class="dk" style="background:${DRAKE_COLOR[t] || '#888'}" title="${esc(t)}"></i>`)
    while (d.length < 4) d.push('<i class="dk empty"></i>')
    return d.join('')
  }
  const soul = ob.soulPoint ? `<span class="soul">${ob.soulPoint === 'ally' ? 'VOCÊS' : 'ELES'}: PONTO DE ALMA</span>` : ''
  el.innerHTML = `${chips}<div class="drakes">
    <div><small style="color:var(--ally)">Nós</small>${dots(ob.drakes.ally)}</div>
    <div><small style="color:var(--enemy)">Eles</small>${dots(ob.drakes.enemy)}</div>${soul}</div>`
}

function renderSpells() {
  const el = $('#p-ss .pb')
  const g = S.game
  if (!g) { el.innerHTML = '<div class="empty">Sem partida</div>'; return }
  if (!g.enemies.length) { el.innerHTML = '<div class="empty">Sem inimigos nesta partida</div>'; return }
  el.innerHTML = g.enemies.map((p, i) => {
    const spells = p.spells.map(sp => {
      const s = S.ss[p.name]?.[sp.key]
      const rem = s ? Math.max(0, s.end - g.t) : 0
      const pct = rem > 0 ? (rem / (s.end - s.start)) * 100 : 0
      return `<button class="sp ${rem > 0 ? 'down' : ''} ${rem > 0 && rem < 10 ? 'soon' : ''}"
        data-p="${esc(p.name)}" data-k="${esc(sp.key)}" title="${esc(sp.name)}">
        <img src="${spellImg(sp)}" alt=""><span class="cd" style="--p:${pct}%"></span>
        ${rem > 0 ? `<b>${rem >= 60 ? fmt(rem) : Math.ceil(rem)}</b>` : ''}</button>`
    }).join('')
    const extra = [ROLE_LABEL[p.role], p.haste ? `+${p.haste} aceleração` : ''].filter(Boolean).join(' · ')
    return `<div class="ssrow ${p.dead ? 'dead' : ''}">
      <span class="hk">${i + 1}</span>
      <div class="ch"><img src="${champImg(p.champ)}" alt=""><i class="lv">${p.level}</i>
        ${p.dead ? `<i class="rs">${Math.ceil(p.respawnNow)}</i>` : ''}</div>
      <div class="nm"><div>${esc(p.champName)}</div><small>${esc(extra)}</small></div>
      ${spells}
      ${p.maybeCosmic ? `<button class="ci ${S.cosmic[p.name] ? 'on' : ''}" data-ci="${esc(p.name)}" title="Tem Inspiração: marque se tiver Insight Cósmico (+18)">IC</button>` : ''}
    </div>`
  }).join('')
}

function renderCoach() {
  const g = S.game, a = S.advice
  const side = $('#side')
  if (!g) {
    side.textContent = ''
    $('#minimap').innerHTML = minimapSVG(null)
    $('#lanes').innerHTML = ''
    $('#tips').innerHTML = '<li>Os conselhos aparecem quando a partida começar.</li>'
    $('#route').innerHTML = ''
    return
  }
  side.textContent = g.side === 'blue' ? 'Lado azul' : 'Lado vermelho'
  side.className = `side ${g.side}`
  $('#minimap').innerHTML = minimapSVG(g, a)

  const bestLane = a.ranked[0]?.lane
  const max = Math.max(4, ...a.ranked.map(l => l.score))
  $('#lanes').innerHTML = `<div class="lanes-cap">Chance de gank</div>` + ['top', 'mid', 'bot'].map(id => {
    const l = a.lanes[id]
    const w = l.blocked ? 0 : Math.max(0, Math.min(100, (l.score / max) * 100))
    return `<div class="lane ${id === bestLane && l.score >= 2 ? 'best' : ''} ${l.blocked ? 'blocked' : ''}" title="${esc(l.why.join(', '))}">
      <span>${LANE_LABEL[id]}</span><div class="bar"><i style="width:${w}%"></i></div><em>${l.blocked ? '—' : l.score.toFixed(1)}</em></div>`
  }).join('')

  $('#tips').innerHTML = a.tips.length
    ? a.tips.map(t => `<li class="p${t.prio}"><b>${esc(t.tag)}</b>${esc(t.text)}</li>`).join('')
    : '<li>Sem alertas. Farme e acompanhe as lanes.</li>'

  const r = a.route
  const names = list => list.map(c => CAMP_LABEL[c]).join(' → ')
  $('#route').innerHTML = g.t < 240
    ? `<div><b>Rota</b>${names(r.path)} → ${r.style === 'gank' ? 'gank' : 'scuttle'} ${LANE_LABEL[r.target]}</div>
       <div class="alt">${r.style === 'gank' ? 'Full clear' : '3 camps'}: ${names(r.style === 'gank' ? r.full : r.fast)}</div>`
    : ''
}

function minimapSVG(g, a) {
  const P = ([x, y]) => `${x},${y}`
  let layers = ''
  if (g && a) {
    const max = Math.max(3, ...a.ranked.map(l => l.score))
    const best = a.ranked[0]
    for (const l of a.ranked) {
      if (l.blocked || l.score <= 0) continue
      const [x, y] = SPOTS[l.lane]
      const o = Math.min(0.75, 0.15 + (l.score / max) * 0.55)
      const isBest = l === best && l.score >= 2
      layers += `<circle cx="${x}" cy="${y}" r="${isBest ? 11 : 8}" fill="rgba(200,170,110,${o})" ${isBest ? 'stroke="#f0e6d2" stroke-width=".8"' : ''}/>`
    }
    if (g.t < 240) {
      const r = a.route
      const pts = r.path.map(c => r.camps[c])
      const end = SPOTS[r.style === 'gank' ? r.target : `scuttle_${r.target}`]
      layers += `<polyline points="${[...pts, end].map(P).join(' ')}" fill="none" stroke="#0ac8b9" stroke-width="1.2" stroke-dasharray="2.5 1.5" marker-end="url(#arr)"/>`
      pts.forEach(([x, y], i) => {
        layers += `<circle cx="${x}" cy="${y}" r="3.4" fill="#010a13" stroke="#0ac8b9" stroke-width=".7"/>
          <text x="${x}" y="${y + 1.3}" font-size="3.8" text-anchor="middle" fill="#f0e6d2" font-weight="700">${i + 1}</text>`
      })
    }
    for (const id of ['dragon', 'baron']) {
      const o = g.objectives.byId[id]
      const [x, y] = SPOTS[id]
      layers += `<rect x="${x - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" transform="rotate(45 ${x} ${y})"
        fill="${o?.state === 'up' ? '#c8aa6e' : '#1e2328'}" stroke="#785a28" stroke-width=".6"/>`
    }
    const js = g.jgSeen
    if (js?.lane && g.enemyJg && !g.enemyJg.dead && g.t - js.time < 60) {
      const [x, y] = SPOTS[js.lane]
      layers += `<circle cx="${x + 6}" cy="${y - 6}" r="4.5" fill="#e84057" stroke="#000" stroke-width=".5"/>
        <text x="${x + 6}" y="${y - 4.4}" font-size="5" text-anchor="middle" fill="#fff" font-weight="700">?</text>`
    }
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Minimapa">
    <defs>
      <linearGradient id="mmbg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0d2a2a"/><stop offset="1" stop-color="#2a1416"/></linearGradient>
      <marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#0ac8b9"/></marker>
    </defs>
    <rect width="100" height="100" fill="url(#mmbg)"/>
    <line x1="4" y1="4" x2="96" y2="96" stroke="#1f4f66" stroke-width="7" opacity=".55"/>
    <g fill="none" stroke="#5b5a56" stroke-width="2.4" stroke-linecap="round" opacity=".8">
      <polyline points="9,91 8,8 91,9"/><polyline points="9,92 92,92 92,9"/><line x1="12" y1="88" x2="88" y2="12"/>
    </g>
    <circle cx="8" cy="92" r="6" fill="#0397ab" opacity=".85"/><circle cx="92" cy="8" r="6" fill="#e84057" opacity=".85"/>
    ${layers}
  </svg>`
}

function renderBuild() {
  const el = $('#p-build .pb')
  const g = S.game, b = S.advice?.build
  if (!g || !b) { el.innerHTML = '<div class="empty">Sem partida</div>'; $('#build-title').textContent = 'Build'; return }
  $('#build-title').textContent = `Build · ${g.me.champName}`
  const items = S.meta.items
  const icon = (id, cls = '') => `<span class="it ${cls}" title="${esc(items[id]?.name)}"><img src="${itemImg(id)}" alt=""></span>`

  let html = ''
  if (b.pet && g.t < 180) html += `<div class="lbl">Início</div><div class="brow">${icon(b.pet)}<span>${esc(items[b.pet].name)}</span></div>`

  html += `<div class="lbl">Core</div><div class="brow">${b.core.map((c, i) =>
    (i ? '<span class="arrow">›</span>' : '') + icon(c.id, c.owned ? 'owned' : c.id === b.next?.id ? 'next' : '')).join('')}</div>`

  if (b.next) {
    const gold = Math.floor(g.me.gold)
    const pct = Math.min(100, (gold / Math.max(1, b.next.remaining)) * 100)
    html += `<div class="next">${icon(b.next.id, 'next')}<div class="info">
      <div>${esc(b.next.name)}</div>
      <div class="prog ${pct >= 100 ? 'full' : ''}"><i style="width:${pct}%"></i></div>
      <small>${gold} / ${b.next.remaining} de ouro${pct >= 100 ? ' · pode comprar!' : ''}</small></div></div>`
  }
  if (b.boots && g.t > 300) html += `<div class="situ">${icon(b.boots)}<div>${esc(items[b.boots].name)}<small>você ainda está sem bota</small></div></div>`

  if (b.situ.length) {
    html += '<div class="lbl">Situacionais (contra este time)</div>'
    html += b.situ.map(s => `<div class="situ">${icon(s.id)}<div>${esc(items[s.id].name)}${s.early ? '<span class="early">ANTECIPE</span>' : ''}
      <small>${esc(s.reason)}</small></div></div>`).join('')
  }
  const th = b.threats
  html += `<div class="threats"><span>${th.adCount} AD</span><span>${th.apCount} AP</span></div>`
  el.innerHTML = html
}

// ---------- layout e arrastar ----------

function defaults() {
  const W = innerWidth, H = innerHeight
  return {
    obj: [Math.round(W / 2 - 220), 6],
    ss: [12, 12],
    build: [12, 270],
    coach: [W - 362, Math.max(60, H - 300 - 420)],
  }
}

function layout() {
  for (const [id, hidden] of Object.entries(S.hidden)) $(`#p-${id}`)?.classList.toggle('hidden', !!hidden)
  if (!OVERLAY) return
  const pos = { ...defaults(), ...store.get('pos', {}) }
  for (const p of document.querySelectorAll('.panel')) {
    const [x, y] = pos[p.dataset.id] || [20, 20]
    place(p, x, y)
  }
}

function place(el, x, y) {
  x = Math.max(0, Math.min(innerWidth - 60, x))
  y = Math.max(0, Math.min(innerHeight - 30, y))
  el.style.left = `${x}px`
  el.style.top = `${y}px`
}

function initDrag() {
  for (const p of document.querySelectorAll('.panel')) {
    p.querySelector('.ph').addEventListener('pointerdown', e => {
      if (!OVERLAY || !S.interactive) return
      e.preventDefault()
      const r = p.getBoundingClientRect()
      const ox = e.clientX - r.left, oy = e.clientY - r.top
      const move = ev => place(p, ev.clientX - ox, ev.clientY - oy)
      const up = () => {
        removeEventListener('pointermove', move)
        removeEventListener('pointerup', up)
        const pos = store.get('pos', {})
        pos[p.dataset.id] = [parseInt(p.style.left), parseInt(p.style.top)]
        store.set('pos', pos)
      }
      addEventListener('pointermove', move)
      addEventListener('pointerup', up)
    })
  }
}

// ---------- eventos ----------

const findEnemy = name => S.game?.enemies.find(p => p.name === name)

$('#p-ss').addEventListener('click', e => {
  const btn = e.target.closest('.sp, .ci')
  if (!btn || !S.game) return
  if (btn.dataset.ci) {
    S.cosmic[btn.dataset.ci] = !S.cosmic[btn.dataset.ci]
    saveSS()
    render()
    return
  }
  const p = findEnemy(btn.dataset.p)
  const sp = p?.spells.find(s => s.key === btn.dataset.k)
  if (sp) markSpell(p, sp, 'click')
})

$('#p-ss').addEventListener('contextmenu', e => {
  const btn = e.target.closest('.sp')
  if (!btn) return
  e.preventDefault()
  const p = findEnemy(btn.dataset.p)
  const sp = p?.spells.find(s => s.key === btn.dataset.k)
  if (sp) cancelSpell(p, sp)
})

if (ELECTRON) window.overlay.onHotkey(onHotkey)
else {
  // No navegador: 1–5 marca o Flash, Shift+1–5 o outro feitiço, C copia tudo, B mostra/esconde a build
  addEventListener('keydown', e => {
    const n = Number(e.code.replace('Digit', ''))
    if (n >= 1 && n <= 5) onHotkey({ action: 'spell', slot: n, which: e.shiftKey ? 'other' : 'flash' })
    else if (e.key === 'c') copyAll()
    else if (e.key === 'b') togglePanel('build')
  })
}
addEventListener('resize', layout)

boot()
