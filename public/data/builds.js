// Builds base por campeão, com nomes em inglês do Data Dragon (o overlay mostra em português).
// Item que não existir no patch atual é ignorado automaticamente. É um ponto de partida:
// edite à vontade conforme o meta.
//   arch  -> define os itens situacionais: bruiser | ad_assassin | onhit | ap | tank
//   style -> gank (rotas curtas, 3 camps) | farm (full clear)

const B = (arch, style, pet, boots, ...core) => ({ arch, style, pet, boots, core })
const GUST = 'Gustwalker Hatchling', SCORCH = 'Scorchclaw Pup', MOSS = 'Mosstomper Seedling'
const STEEL = 'Plated Steelcaps', MERC = "Mercury's Treads", IONIAN = 'Ionian Boots of Lucidity'
const SORC = "Sorcerer's Shoes", BERS = "Berserker's Greaves"

export const BUILDS = {
  LeeSin: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Vi: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  XinZhao: B('bruiser', 'gank', GUST, STEEL, 'Sundered Sky', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  JarvanIV: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  MonkeyKing: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  RekSai: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Nocturne: B('bruiser', 'gank', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Briar: B('bruiser', 'farm', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Hecarim: B('bruiser', 'farm', GUST, STEEL, 'Eclipse', 'Spear of Shojin', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Kayn: B('bruiser', 'farm', GUST, STEEL, 'Voltaic Cyclosword', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Viego: B('bruiser', 'farm', GUST, STEEL, 'Blade of The Ruined King', 'Trinity Force', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  Warwick: B('bruiser', 'farm', GUST, STEEL, 'Blade of The Ruined King', "Sterak's Gage", 'Spirit Visage', "Death's Dance", 'Thornmail'),
  Volibear: B('bruiser', 'gank', MOSS, STEEL, 'Riftmaker', "Sterak's Gage", 'Spirit Visage', 'Thornmail', 'Force of Nature'),
  Udyr: B('bruiser', 'farm', MOSS, STEEL, 'Trinity Force', "Sterak's Gage", 'Spirit Visage', "Death's Dance", 'Thornmail'),

  Khazix: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Rengar: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Shaco: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Talon: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Qiyana: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Naafiri: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  Graves: B('ad_assassin', 'farm', SCORCH, IONIAN, "Youmuu's Ghostblade", 'The Collector', 'Infinity Edge', "Lord Dominik's Regards", 'Guardian Angel'),

  Kindred: B('onhit', 'farm', SCORCH, BERS, 'Kraken Slayer', 'Blade of The Ruined King', "Guinsoo's Rageblade", 'Infinity Edge', 'Guardian Angel'),
  MasterYi: B('onhit', 'farm', GUST, BERS, 'Blade of The Ruined King', "Guinsoo's Rageblade", "Wit's End", 'Terminus', 'Guardian Angel'),
  Belveth: B('onhit', 'farm', GUST, BERS, 'Blade of The Ruined King', 'Kraken Slayer', "Guinsoo's Rageblade", "Sterak's Gage", 'Guardian Angel'),

  Diana: B('ap', 'farm', SCORCH, SORC, "Nashor's Tooth", "Zhonya's Hourglass", 'Shadowflame', 'Void Staff', "Rabadon's Deathcap"),
  Ekko: B('ap', 'gank', SCORCH, SORC, 'Lich Bane', 'Shadowflame', "Zhonya's Hourglass", 'Void Staff', "Rabadon's Deathcap"),
  Elise: B('ap', 'gank', SCORCH, SORC, 'Stormsurge', 'Shadowflame', "Zhonya's Hourglass", 'Void Staff', "Rabadon's Deathcap"),
  Evelynn: B('ap', 'gank', SCORCH, SORC, 'Lich Bane', 'Shadowflame', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass"),
  Nidalee: B('ap', 'gank', SCORCH, SORC, 'Lich Bane', 'Shadowflame', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass"),
  Lillia: B('ap', 'farm', GUST, SORC, "Liandry's Torment", 'Riftmaker', "Rylai's Crystal Scepter", "Zhonya's Hourglass", 'Void Staff'),
  Karthus: B('ap', 'farm', SCORCH, SORC, "Liandry's Torment", 'Blackfire Torch', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass"),
  Fiddlesticks: B('ap', 'farm', SCORCH, SORC, 'Blackfire Torch', "Zhonya's Hourglass", "Rabadon's Deathcap", 'Void Staff', "Liandry's Torment"),
  Taliyah: B('ap', 'gank', SCORCH, SORC, "Luden's Echo", 'Shadowflame', "Rabadon's Deathcap", 'Void Staff', "Zhonya's Hourglass"),
  Gragas: B('ap', 'gank', MOSS, SORC, 'Hextech Rocketbelt', 'Shadowflame', "Zhonya's Hourglass", 'Void Staff', "Rabadon's Deathcap"),
  Nunu: B('ap', 'gank', MOSS, SORC, "Liandry's Torment", 'Riftmaker', "Zhonya's Hourglass", 'Void Staff', 'Force of Nature'),

  Amumu: B('tank', 'farm', MOSS, STEEL, "Liandry's Torment", 'Sunfire Aegis', 'Thornmail', 'Jak\'Sho, The Protean', 'Force of Nature'),
  Sejuani: B('tank', 'gank', MOSS, STEEL, 'Sunfire Aegis', 'Unending Despair', "Jak'Sho, The Protean", 'Thornmail', 'Force of Nature'),
  Zac: B('tank', 'farm', MOSS, STEEL, 'Sunfire Aegis', 'Unending Despair', "Jak'Sho, The Protean", 'Spirit Visage', 'Force of Nature'),
  Rammus: B('tank', 'gank', MOSS, STEEL, 'Thornmail', 'Sunfire Aegis', "Randuin's Omen", 'Frozen Heart', 'Force of Nature'),
  Skarner: B('tank', 'gank', MOSS, STEEL, 'Heartsteel', 'Unending Despair', "Jak'Sho, The Protean", 'Thornmail', 'Force of Nature'),
  Maokai: B('tank', 'gank', MOSS, STEEL, 'Sunfire Aegis', 'Unending Despair', "Jak'Sho, The Protean", 'Thornmail', 'Force of Nature'),
}

// Para campeões que não estão na lista acima
export const DEFAULT_BUILDS = {
  bruiser: B('bruiser', 'farm', GUST, STEEL, 'Eclipse', 'Black Cleaver', "Sterak's Gage", "Death's Dance", 'Guardian Angel'),
  ad_assassin: B('ad_assassin', 'gank', SCORCH, IONIAN, 'Profane Hydra', "Youmuu's Ghostblade", 'Hubris', "Serylda's Grudge", 'Edge of Night'),
  onhit: B('onhit', 'farm', SCORCH, BERS, 'Blade of The Ruined King', 'Kraken Slayer', "Guinsoo's Rageblade", 'Infinity Edge', 'Guardian Angel'),
  ap: B('ap', 'farm', SCORCH, SORC, "Liandry's Torment", 'Shadowflame', "Zhonya's Hourglass", 'Void Staff', "Rabadon's Deathcap"),
  tank: B('tank', 'gank', MOSS, STEEL, 'Sunfire Aegis', 'Unending Despair', "Jak'Sho, The Protean", 'Thornmail', 'Force of Nature'),
}

// Itens situacionais por ameaça e arquétipo (o primeiro que existir no patch e você não tiver é sugerido)
export const SITUATIONAL = {
  fed: { bruiser: ["Death's Dance", 'Guardian Angel'], ad_assassin: ['Edge of Night', 'Guardian Angel'], onhit: ['Guardian Angel'], ap: ["Zhonya's Hourglass", "Banshee's Veil"], tank: ["Warmog's Armor"] },
  antiheal: { bruiser: ['Chempunk Chainsword', 'Executioner\'s Calling'], ad_assassin: ['Chempunk Chainsword'], onhit: ['Mortal Reminder'], ap: ['Morellonomicon'], tank: ['Thornmail'] },
  vsAP: { bruiser: ['Maw of Malmortius', 'Kaenic Rookern', 'Spirit Visage'], ad_assassin: ['Maw of Malmortius', 'Edge of Night'], onhit: ["Wit's End", 'Maw of Malmortius'], ap: ["Banshee's Veil"], tank: ['Force of Nature', 'Kaenic Rookern', 'Abyssal Mask'] },
  vsAD: { bruiser: ["Death's Dance", "Randuin's Omen"], ad_assassin: ["Death's Dance", 'Guardian Angel'], onhit: ['Guardian Angel', "Death's Dance"], ap: ["Zhonya's Hourglass"], tank: ["Randuin's Omen", 'Frozen Heart', 'Thornmail'] },
  vsTanks: { bruiser: ['Black Cleaver', "Serylda's Grudge"], ad_assassin: ["Serylda's Grudge", "Lord Dominik's Regards"], onhit: ['Blade of The Ruined King', "Lord Dominik's Regards"], ap: ['Void Staff', "Liandry's Torment"], tank: [] },
  vsCrit: { bruiser: ["Randuin's Omen"], tank: ["Randuin's Omen"], ad_assassin: [], onhit: [], ap: [] },
  vsShields: { ad_assassin: ["Serpent's Fang"], bruiser: ["Serpent's Fang"], onhit: [], ap: [], tank: [] },
}

export const HEALERS = ['Soraka', 'Yuumi', 'Aatrox', 'Vladimir', 'Sylas', 'Warwick', 'DrMundo', 'Fiddlesticks', 'Swain', 'Briar',
  'Nami', 'Sona', 'Seraphine', 'Olaf', 'Illaoi', 'Volibear', 'Sett', 'Maokai', 'Nasus', 'Irelia', 'Fiora', 'Kayn', 'Trundle',
  'Zac', 'Gwen', 'Milio', 'Renekton', 'Belveth', 'Viego', 'Ambessa']

export const SHIELDERS = ['Lulu', 'Karma', 'Janna', 'Sett', 'Seraphine', 'Yasuo', 'Yone', 'Shen', 'Rakan', 'Orianna', 'Lux',
  'Ivern', 'Renata', 'Milio', 'Morgana', 'Taric', 'Riven', 'Camille', 'Rell', 'Sona', 'Mordekaiser', 'Ambessa']

// Aliados com controle de grupo forte deixam o gank mais fácil
export const CC_HEAVY = ['Leona', 'Nautilus', 'Thresh', 'Blitzcrank', 'Rell', 'Alistar', 'Rakan', 'Maokai', 'Ornn', 'Sejuani',
  'Amumu', 'Malphite', 'Sion', 'Lissandra', 'Twisted Fate', 'TwistedFate', 'Syndra', 'Ahri', 'Annie', 'Veigar', 'Morgana',
  'Lux', 'Neeko', 'Galio', 'Taliyah', 'Orianna', 'Jayce', 'Poppy', 'Renekton', 'Pantheon', 'Jax', 'Shen', 'Zac', 'Ashe',
  'Varus', 'Xayah', 'Swain', 'Braum', 'Taric', 'Pyke', 'Bard', 'Zyra', 'Lulu', 'Janna', 'Sylas', 'Darius', 'Mordekaiser']
