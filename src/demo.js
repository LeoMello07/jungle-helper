// Partida simulada no mesmo formato da Live Client Data API, para testar o overlay sem abrir o LoL.
// DEMO_START = segundo de jogo inicial (padrão 2:30), DEMO_SPEED = velocidade do relógio.

const SPELL_KEY = {
  Flash: 'SummonerFlash', Teleport: 'SummonerTeleport', Smite: 'SummonerSmite', Heal: 'SummonerHeal',
  Ignite: 'SummonerDot', Ghost: 'SummonerHaste', Exhaust: 'SummonerExhaust', Barrier: 'SummonerBarrier',
}

// [time, role, nick, campeão, feitiços, itens [segundo, nome em inglês], árvore secundária de runas]
const ROSTER = [
  ['ORDER', 'TOP', 'Pedrinho', 'Ornn', ['Flash', 'Teleport'], [[0, "Doran's Shield"], [620, 'Sunfire Aegis'], [800, 'Plated Steelcaps']]],
  ['ORDER', 'JUNGLE', 'Leo', 'LeeSin', ['Flash', 'Smite'], [[0, 'Gustwalker Hatchling'], [610, 'Eclipse'], [800, 'Plated Steelcaps'], [1300, 'Black Cleaver']]],
  ['ORDER', 'MIDDLE', 'OriFã', 'Orianna', ['Flash', 'Teleport'], [[0, "Doran's Ring"], [560, "Luden's Echo"], [760, "Sorcerer's Shoes"]]],
  ['ORDER', 'BOTTOM', 'Kaisinha', 'Kaisa', ['Flash', 'Heal'], [[0, "Doran's Blade"], [640, "Guinsoo's Rageblade"], [820, "Berserker's Greaves"]]],
  ['ORDER', 'UTILITY', 'Engage', 'Leona', ['Flash', 'Ignite'], [[0, 'World Atlas'], [700, 'Locket of the Iron Solari']]],
  ['CHAOS', 'TOP', 'Machado', 'Darius', ['Flash', 'Ghost'], [[0, "Doran's Blade"], [560, 'Stridebreaker'], [900, 'Plated Steelcaps'], [1300, "Sterak's Gage"]]],
  ['CHAOS', 'JUNGLE', 'Escopeta', 'Graves', ['Flash', 'Smite'], [[0, 'Scorchclaw Pup'], [600, 'The Collector'], [1200, 'Infinity Edge']]],
  ['CHAOS', 'MIDDLE', 'Esferas', 'Syndra', ['Flash', 'Teleport'], [[0, "Doran's Ring"], [540, "Luden's Echo"], [800, "Sorcerer's Shoes"], [1250, 'Shadowflame']]],
  ['CHAOS', 'BOTTOM', 'Foguete', 'Jinx', ['Flash', 'Heal'], [[0, "Doran's Blade"], [600, 'Kraken Slayer'], [850, "Berserker's Greaves"], [1150, 'Infinity Edge']]],
  ['CHAOS', 'UTILITY', 'Estrela', 'Soraka', ['Flash', 'Exhaust'], [[0, 'World Atlas'], [700, 'Moonstone Renewer'], [750, 'Ionian Boots of Lucidity']], 8300],
]

// [segundo, assassino, vítima, assistências] — por campeão
const KILLS = [
  [198, 'Graves', 'Ornn', ['Darius']],
  [415, 'LeeSin', 'Syndra', ['Orianna']],
  [530, 'Jinx', 'Kaisa', ['Soraka', 'Graves']],
  [905, 'LeeSin', 'Darius', ['Ornn']],
  [930, 'Kaisa', 'Jinx', ['Leona']],
  [936, 'Leona', 'Soraka', ['Kaisa', 'LeeSin']],
  [1240, 'Graves', 'Orianna', ['Syndra']],
  [1420, 'Orianna', 'Graves', ['LeeSin', 'Kaisa']],
]

const OBJECTIVES = [
  [330, 'DragonKill', 'LeeSin', { DragonType: 'Fire', Stolen: 'False' }],
  [645, 'DragonKill', 'Graves', { DragonType: 'Water', Stolen: 'False' }],
  [752, 'HordeKill', 'LeeSin'], [758, 'HordeKill', 'LeeSin'], [764, 'HordeKill', 'Ornn'],
  [1010, 'HeraldKill', 'LeeSin', { Stolen: 'False' }],
  [1180, 'DragonKill', 'LeeSin', { DragonType: 'Hextech', Stolen: 'False' }],
]

function createDemo(meta) {
  const start = Number(process.env.DEMO_START ?? 150)
  const speed = Number(process.env.DEMO_SPEED ?? 1)
  const t0 = Date.now()
  const nick = Object.fromEntries(ROSTER.map(r => [r[3], r[2]]))
  const level = (t, i) => Math.min(18, Math.floor(1 + t / 85 + (i % 3) * 0.35))
  const respawnFor = lvl => 8 + lvl * 1.8

  function snapshot() {
    const t = start + ((Date.now() - t0) / 1000) * speed

    const events = [{ EventName: 'GameStart', EventTime: 0 }, { EventName: 'MinionsSpawning', EventTime: 30 }]
    KILLS.forEach(([time, k, v, a], i) => {
      if (time > t) return
      if (i === 0) events.push({ EventName: 'FirstBlood', EventTime: time, Recipient: nick[k] })
      events.push({ EventName: 'ChampionKill', EventTime: time, KillerName: nick[k], VictimName: nick[v], Assisters: a.map(c => nick[c]) })
    })
    for (const [time, name, killer, extra] of OBJECTIVES) {
      if (time <= t) events.push({ EventName: name, EventTime: time, KillerName: nick[killer], Assisters: [], ...extra })
    }
    events.sort((a, b) => a.EventTime - b.EventTime).forEach((e, i) => { e.EventID = i })

    const allPlayers = ROSTER.map(([team, position, name, champ, spells, items, secondary], i) => {
      const lvl = level(t, i)
      const deaths = KILLS.filter(k => k[0] <= t && k[2] === champ)
      const lastDeath = deaths.at(-1)?.[0]
      const respawn = lastDeath !== undefined ? lastDeath + respawnFor(level(lastDeath, i)) - t : 0
      const owned = items.filter(([time]) => time <= t).slice(-6).map(([, en], slot) => {
        const id = meta.itemByName[en.toLowerCase()]
        const it = meta.items[id]
        return it && { itemID: Number(id), displayName: it.name, price: it.gold, count: 1, slot, canUse: false, consumable: false }
      }).filter(Boolean)
      const sp = s => ({ displayName: s, rawDisplayName: `GeneratedTip_SummonerSpell_${SPELL_KEY[s]}_DisplayName` })
      return {
        championName: meta.champions[champ]?.name || champ,
        rawChampionName: `game_character_displayname_${champ}`,
        isBot: false, isDead: respawn > 0, respawnTimer: Math.max(0, respawn), level: lvl,
        position, team, items: owned,
        riotId: `${name}#BR1`, riotIdGameName: name, riotIdTagLine: 'BR1', summonerName: `${name}#BR1`,
        runes: { keystone: { id: 8010 }, primaryRuneTree: { id: 8000 }, secondaryRuneTree: { id: secondary || 8400 } },
        scores: {
          kills: KILLS.filter(k => k[0] <= t && k[1] === champ).length,
          deaths: deaths.length,
          assists: KILLS.filter(k => k[0] <= t && k[3].includes(champ)).length,
          creepScore: Math.floor((t / 60) * (position === 'UTILITY' ? 1 : 6.5)), wardScore: Math.floor(t / 90),
        },
        summonerSpells: { summonerSpellOne: sp(spells[0]), summonerSpellTwo: sp(spells[1]) },
      }
    })

    const me = allPlayers[1]
    return {
      activePlayer: {
        riotId: me.riotId, riotIdGameName: me.riotIdGameName, summonerName: me.summonerName,
        level: me.level, currentGold: Math.round(((t * 8) % 3200) + 100),
      },
      allPlayers,
      events: { Events: events },
      gameData: { gameMode: 'CLASSIC', gameTime: t, mapName: 'Map11', mapNumber: 11, mapTerrain: 'Default' },
    }
  }

  return { snapshot }
}

module.exports = { createDemo }
