/*
 * data.js — Static game data: biomes, gene definitions, species/evolution tree, names.
 * No dependencies. Attaches everything to window.EVO namespace.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});

  // The four biomes. Each race track belongs to one biome, which rewards
  // creatures adapted to it and punishes the rest. Racing repeatedly in a
  // biome is what applies "epigenetic pressure" on a lineage over generations.
  EVO.BIOMES = {
    dune: { key: 'dune', name: 'Sunscorch Dunes', emoji: '🏜️', color: '#e0a95a', blurb: 'Blistering sand. Rewards heat tolerance and raw speed.' },
    bog:  { key: 'bog',  name: 'Mirefen Bog',     emoji: '🐸', color: '#6fae5a', blurb: 'Sucking mud and water. Rewards stamina and amphibious limbs.' },
    crag: { key: 'crag', name: 'Skyreach Crags',  emoji: '⛰️', color: '#9a8a7a', blurb: 'Vertical rock. Rewards agility and sure-footed climbers.' },
    tundra:{ key: 'tundra', name: 'Hollowfrost Tundra', emoji: '❄️', color: '#8fb8d8', blurb: 'Killing cold. Rewards endurance and thick insulation.' },
    ash:  { key: 'ash',  name: 'Cinderveil Wastes', emoji: '🌋', color: '#e0654a', blurb: 'Smoking volcanic fields. Rewards explosive acceleration between vents.' },
    reef: { key: 'reef', name: 'Sapphire Shallows', emoji: '🐚', color: '#4ac0e0', blurb: 'A drowned coral maze. Rewards agile swimmers who read the surge.' },
  };
  EVO.BIOME_KEYS = ['dune', 'bog', 'crag', 'tundra', 'ash', 'reef'];

  // Core performance genes. Each creature carries two alleles per gene
  // (numbers ~0..100). Phenotype stat = average of the two alleles.
  EVO.STAT_GENES = ['speed', 'stamina', 'accel', 'agility'];

  // Which stat each biome leans on most (for the adaptation bonus math).
  EVO.BIOME_STAT = { dune: 'speed', bog: 'stamina', crag: 'agility', tundra: 'stamina', ash: 'accel', reef: 'agility' };

  // Adaptation genes: one per biome, 0..100. High adaptation = big bonus on
  // that biome's track, penalty elsewhere. These are what the player steers.
  EVO.ADAPT_GENES = EVO.BIOME_KEYS.map((b) => 'adapt_' + b);

  // Visual genes drive the procedural creature art. Purely cosmetic but
  // heritable, so lineages become visually recognisable.
  EVO.VISUAL_GENES = ['hue', 'pattern', 'bodySize', 'limb', 'eyes', 'horn'];

  EVO.PATTERNS = ['solid', 'spots', 'stripes', 'patches'];
  EVO.LIMBS = ['legs', 'fins', 'talons', 'paws'];

  // ---- Evolution tree ---------------------------------------------------
  // Every creature starts as a Grubling (tier 0). When a lineage's adaptation
  // to a biome crosses a threshold, its offspring can METAMORPHOSE into a
  // tier-1 specialist, then a tier-2 apex form. This is the payoff of
  // directed breeding — you sculpt a new species over generations.
  EVO.SPECIES = {
    grubling: {
      key: 'grubling', tier: 0, name: 'Grubling', emoji: '🐛',
      blurb: 'An unremarkable starter creature — raw clay for evolution.',
      lore: 'Naturalists believe every species on the continent descends from this humble, endlessly adaptable grub.',
      statBonus: {},
    },
    // Tier 1 specialists (one per biome)
    dunestrider: { key: 'dunestrider', tier: 1, biome: 'dune', name: 'Dunestrider', emoji: '🦎',
      blurb: 'Lean and heat-hardened. Flies across open sand.',
      lore: 'Its footpads vitrify into glassy soles, so it skates on dunes that would swallow other racers.',
      statBonus: { speed: 8, accel: 4 } },
    bogfin: { key: 'bogfin', tier: 1, biome: 'bog', name: 'Bogfin', emoji: '🐊',
      blurb: 'Webbed and tireless. Churns through mud that mires others.',
      lore: 'Bogfins hum a low drone as they run; fen-folk swear the mud parts for the song.',
      statBonus: { stamina: 8, agility: 3 } },
    craghorn: { key: 'craghorn', tier: 1, biome: 'crag', name: 'Craghorn', emoji: '🐐',
      blurb: 'Sure-footed climber that treats sheer rock like a road.',
      lore: 'A craghorn never falls twice — its inner ear grows a second chamber that remembers every slip.',
      statBonus: { agility: 8, accel: 3 } },
    frostpelt: { key: 'frostpelt', tier: 1, biome: 'tundra', name: 'Frostpelt', emoji: '🐻‍❄️',
      blurb: 'Insulated and relentless. Outlasts the cold and the field.',
      lore: 'Under the white coat lies a slow second heart that only beats when the first begins to freeze.',
      statBonus: { stamina: 8, speed: 3 } },
    emberpaw: { key: 'emberpaw', tier: 1, biome: 'ash', name: 'Emberpaw', emoji: '🦊',
      blurb: 'Pads across cooling lava on heat-proof soles. Explosive off the line.',
      lore: 'Emberpaws sleep curled inside warm fumaroles and wake already at a sprint.',
      statBonus: { accel: 8, speed: 3 } },
    tidefin: { key: 'tidefin', tier: 1, biome: 'reef', name: 'Tidefin', emoji: '🐠',
      blurb: 'Rides surge-channels through the coral maze without touching a wall.',
      lore: 'A tidefin reads the reef like a score of music, each current a note it has already heard.',
      statBonus: { agility: 8, stamina: 3 } },
    // Tier 2 apex forms
    mirageraptor: { key: 'mirageraptor', tier: 2, biome: 'dune', name: 'Mirage Raptor', emoji: '🐉',
      blurb: 'An apex desert predator. A blur in the heat-haze.',
      lore: 'Racegoers claim you never see a Mirage Raptor win — only the shimmer where it used to be.',
      statBonus: { speed: 16, accel: 9 } },
    leviatoad: { key: 'leviatoad', tier: 2, biome: 'bog', name: 'Leviatoad', emoji: '🦕',
      blurb: 'A colossus of the fen. The bog itself seems to push it forward.',
      lore: 'Old maps mark leviatoad wallows as islands; some of those islands still move.',
      statBonus: { stamina: 16, agility: 7 } },
    thunderpeak: { key: 'thunderpeak', tier: 2, biome: 'crag', name: 'Thunderpeak', emoji: '🦅',
      blurb: 'Half-climber, half-glider. Owns the vertical world.',
      lore: 'Its wingbeats echo off the crags a heartbeat before it arrives — thunder first, then the peak.',
      statBonus: { agility: 16, accel: 8 } },
    glaciarch: { key: 'glaciarch', tier: 2, biome: 'tundra', name: 'Glaciarch', emoji: '🦣',
      blurb: 'An ancient, unstoppable engine of the deep cold.',
      lore: 'Glaciarchs do not stop at the finish line; handlers simply aim them at the horizon and wait.',
      statBonus: { stamina: 16, speed: 8 } },
    pyroclast: { key: 'pyroclast', tier: 2, biome: 'ash', name: 'Pyroclast', emoji: '🐲',
      blurb: 'A living eruption. Nothing on any track leaves the gate faster.',
      lore: 'When a pyroclast launches, stewards check the volcano — the ground cannot always tell the difference.',
      statBonus: { accel: 16, speed: 9 } },
    abyssarch: { key: 'abyssarch', tier: 2, biome: 'reef', name: 'Abyssarch', emoji: '🐙',
      blurb: 'Sovereign of the shallows. Flows through coral like poured water.',
      lore: 'The reef grows around an abyssarch\'s favourite line, until the track itself is shaped like its stride.',
      statBonus: { agility: 15, stamina: 9 } },
    // Cross-biome hybrid apex forms — bred from two DIFFERENT tier-1
    // specialists whose offspring is strongly adapted to BOTH parent biomes.
    mudwyrm: { key: 'mudwyrm', tier: 2, hybrid: true, biomes: ['bog', 'dune'], name: 'Mudwyrm', emoji: '🐍',
      blurb: 'Hybrid of dune and fen — swims through sand and sprints through swamp.',
      lore: 'Mudwyrms bask at the exact line where desert meets marsh, belonging entirely to neither.',
      statBonus: { speed: 10, stamina: 10, accel: 4 } },
    sandsphinx: { key: 'sandsphinx', tier: 2, hybrid: true, biomes: ['crag', 'dune'], name: 'Sandsphinx', emoji: '🦁',
      blurb: 'Hybrid of dune and crag — a cliff-leaping blur with desert speed.',
      lore: 'It waits motionless at the start gate like a statue, and stewards have twice tried to move one with a crane.',
      statBonus: { speed: 10, agility: 10, accel: 3 } },
    auroradrake: { key: 'auroradrake', tier: 2, hybrid: true, biomes: ['dune', 'tundra'], name: 'Auroradrake', emoji: '🪽',
      blurb: 'Hybrid of fire and frost — runs mirage-fast and never overheats.',
      lore: 'Its scales flicker between heat-shimmer and aurora; photographers have never captured both at once.',
      statBonus: { speed: 12, stamina: 8, accel: 3 } },
    lichenhorn: { key: 'lichenhorn', tier: 2, hybrid: true, biomes: ['bog', 'crag'], name: 'Lichenhorn', emoji: '🦬',
      blurb: 'Hybrid of fen and crag — grinds up cliffs and through mires alike.',
      lore: 'Moss grows along its spine in patterns that map every track it has ever finished.',
      statBonus: { stamina: 10, agility: 10, accel: 3 } },
    cryotoad: { key: 'cryotoad', tier: 2, hybrid: true, biomes: ['bog', 'tundra'], name: 'Cryotoad', emoji: '🐢',
      blurb: 'Hybrid of fen and frost — tireless in mud, unbothered by ice.',
      lore: 'A cryotoad can hibernate mid-race and still place; one famously won a season nap-first.',
      statBonus: { stamina: 14, agility: 6, speed: 3 } },
    galeyeti: { key: 'galeyeti', tier: 2, hybrid: true, biomes: ['crag', 'tundra'], name: 'Galeyeti', emoji: '🦍',
      blurb: 'Hybrid of crag and frost — climbs into blizzards other racers flee.',
      lore: 'Mountaineers leave offerings at galeyeti prints, mostly because it is faster than arguing.',
      statBonus: { agility: 12, stamina: 8, accel: 3 } },
    chimerax: { key: 'chimerax', tier: 2, hybrid: true, name: 'Chimerax', emoji: '🧬',
      blurb: 'A wild fusion of two distant bloodlines — unpredictable, and uniquely balanced.',
      lore: 'No two chimerax are alike; the Codex keeps a page for each and the pages keep multiplying.',
      statBonus: { speed: 8, stamina: 8, accel: 8, agility: 8 } },
  };

  // Metamorphosis path: from-species + biome -> next species.
  EVO.EVOLVE_NEXT = {
    grubling: { dune: 'dunestrider', bog: 'bogfin', crag: 'craghorn', tundra: 'frostpelt', ash: 'emberpaw', reef: 'tidefin' },
    dunestrider: { dune: 'mirageraptor' },
    bogfin: { bog: 'leviatoad' },
    craghorn: { crag: 'thunderpeak' },
    frostpelt: { tundra: 'glaciarch' },
    emberpaw: { ash: 'pyroclast' },
    tidefin: { reef: 'abyssarch' },
  };

  // Adaptation needed in the target biome for offspring to metamorphose.
  EVO.EVOLVE_THRESHOLD = { 1: 55, 2: 82 };

  // Hybrid metamorphosis: two DIFFERENT tier-1 specialist parents whose child
  // clears this adaptation in BOTH parent biomes produce a hybrid apex.
  // Keyed by the sorted biome pair; unlisted pairs fall back to 'chimerax'.
  EVO.HYBRID_THRESHOLD = 58;
  EVO.HYBRIDS = {
    'bog|dune': 'mudwyrm',
    'crag|dune': 'sandsphinx',
    'dune|tundra': 'auroradrake',
    'bog|crag': 'lichenhorn',
    'bog|tundra': 'cryotoad',
    'crag|tundra': 'galeyeti',
  };

  // ---- Mutation traits --------------------------------------------------
  // Rare heritable perks found while exploring. Each gives a small edge plus a
  // visual tell, so a lineage carrying one is instantly recognisable.
  EVO.TRAITS = {
    bioluminescent: { key: 'bioluminescent', name: 'Bioluminescent', emoji: '✨',
      blurb: 'Glowing eyes and aura. Unshaken by rough footing (+agility).', stat: { agility: 6 } },
    twin_tailed: { key: 'twin_tailed', name: 'Twin-Tailed', emoji: '🜛',
      blurb: 'A second tail for balance and thrust (+acceleration).', stat: { accel: 6 } },
    ironhide: { key: 'ironhide', name: 'Ironhide', emoji: '🛡️',
      blurb: 'Dense, resilient build that never tires (+stamina).', stat: { stamina: 7 } },
    swiftborn: { key: 'swiftborn', name: 'Swiftborn', emoji: '💨',
      blurb: 'Born mid-stride. Explosive raw pace (+speed).', stat: { speed: 7 } },
  };
  EVO.TRAIT_KEYS = Object.keys(EVO.TRAITS);

  // ---- Expeditions ------------------------------------------------------
  // Sending a creature into a biome to explore. Longer trips cost more and
  // raise the odds of rare finds, but advance more days (more market churn,
  // rival difficulty creep). Exploring also builds the creature's biome
  // exposure — another way to steer directed evolution.
  EVO.EXPEDITIONS = {
    scout: { key: 'scout', name: 'Quick Scout', days: 1, cost: 20, exposure: 1, rareChance: 0.10, eggChance: 0.45, coinRange: [10, 40] },
    trek:  { key: 'trek',  name: 'Day Trek',    days: 2, cost: 45, exposure: 2, rareChance: 0.22, eggChance: 0.6,  coinRange: [25, 80] },
    expedition: { key: 'expedition', name: 'Deep Expedition', days: 4, cost: 90, exposure: 3, rareChance: 0.40, eggChance: 0.75, coinRange: [50, 150] },
  };

  // ---- Goals / objectives ----------------------------------------------
  // A guided progression checklist. Each pays out once when its condition is
  // first met, giving early direction and a coin drip.
  EVO.GOALS = [
    { key: 'first_race', name: 'On Your Marks', desc: 'Finish your first race.', reward: 40, test: (s) => s.stats.racesRun >= 1 },
    { key: 'first_win', name: 'Winner\'s Circle', desc: 'Win a race.', reward: 60, test: (s) => s.stats.wins >= 1 },
    { key: 'first_breed', name: 'The Next Generation', desc: 'Breed your first offspring.', reward: 40, test: (s) => s.stats.bred >= 1 },
    { key: 'first_explore', name: 'Into the Wild', desc: 'Complete an expedition.', reward: 40, test: (s) => (s.stats.explored || 0) >= 1 },
    { key: 'first_evolve', name: 'Metamorphosis', desc: 'Evolve a creature into a specialist.', reward: 120, test: (s) => s.stats.evolutions >= 1 },
    { key: 'five_species', name: 'Naturalist', desc: 'Discover 5 species.', reward: 100, test: (s) => Object.keys(s.discovered).length >= 5 },
    { key: 'apex', name: 'Apex Predator', desc: 'Evolve a Tier-2 apex form.', reward: 250, test: (s) => Object.keys(s.discovered).some((k) => (EVO.SPECIES[k] || {}).tier === 2) },
    { key: 'trait_carrier', name: 'Mutant Bloodline', desc: 'Own a creature with a mutation trait.', reward: 80, test: (s) => s.stable.some((c) => (c.traits || []).length) },
  ];

  // ---- Items & consumables ----------------------------------------------
  EVO.ITEMS = {
    splicer: { key: 'splicer', name: 'Gene Splicer', emoji: '🧪', cost: 120,
      blurb: 'Surgically strengthens one random stat gene: both alleles gain +5–12.' },
    serum: { key: 'serum', name: 'Exposure Serum', emoji: '💉', cost: 60,
      blurb: 'Instils +4 biome exposure of your choice — steer evolution without racing.' },
    tonic: { key: 'tonic', name: 'Stamina Tonic', emoji: '🍵', cost: 40,
      blurb: 'The next race starts brimming with energy (+15% stamina, one race).' },
  };
  EVO.ITEM_KEYS = ['splicer', 'serum', 'tonic'];

  // ---- Tournaments --------------------------------------------------------
  EVO.TOURNAMENT = {
    entry: 60,
    seasonDays: 20, // a new "season" label every N days
    // Payouts by final placement; 'out' = eliminated in the semifinal.
    prizes: { 1: 280, 2: 120, 3: 55, 4: 30, out: 12 },
  };

  // ---- Achievements -------------------------------------------------------
  // Long-tail bragging rights beyond the goal ladder. Checked like goals;
  // each pays out once.
  EVO.ACHIEVEMENTS = [
    { key: 'wins5', name: 'Podium Regular', desc: 'Win 5 races.', reward: 50, test: (s) => s.stats.wins >= 5 },
    { key: 'wins20', name: 'Track Legend', desc: 'Win 20 races.', reward: 150, test: (s) => s.stats.wins >= 20 },
    { key: 'races25', name: 'Iron Marathoner', desc: 'Run 25 races.', reward: 75, test: (s) => s.stats.racesRun >= 25 },
    { key: 'bred10', name: 'Line Breeder', desc: 'Breed 10 offspring.', reward: 75, test: (s) => s.stats.bred >= 10 },
    { key: 'gen5', name: 'Fifth Dynasty', desc: 'Raise a Generation 5 creature.', reward: 75, test: (s) => s.stable.some((c) => c.generation >= 5) },
    { key: 'gen10', name: 'Deep Time', desc: 'Raise a Generation 10 creature.', reward: 200, test: (s) => s.stable.some((c) => c.generation >= 10) },
    { key: 'hybrid', name: 'Crossed Bloodlines', desc: 'Discover a cross-biome hybrid species.', reward: 150, test: (s) => Object.keys(s.discovered).some((k) => (EVO.SPECIES[k] || {}).hybrid) },
    { key: 'all_traits', name: 'Complete Genome', desc: 'Encounter all four mutation traits.', reward: 100, test: (s) => EVO.TRAIT_KEYS.every((t) => (s.seenTraits || {})[t]) },
    { key: 'morph', name: 'Rare Morph', desc: 'Own an iridescent, albino, or melanic creature.', reward: 75, test: (s) => s.stable.some((c) => c.genome.sheen && c.genome.sheen[0] > 0) },
    { key: 'tourn1', name: 'Cup Winner', desc: 'Win a tournament.', reward: 150, test: (s) => (s.stats.tournamentsWon || 0) >= 1 },
    { key: 'tourn3', name: 'Dynasty Cup', desc: 'Win 3 tournaments.', reward: 300, test: (s) => (s.stats.tournamentsWon || 0) >= 3 },
    { key: 'rich', name: 'Dragon Hoard', desc: 'Hold 1,500 coins at once.', reward: 25, test: (s) => s.coins >= 1500 },
    { key: 'all_species', name: 'Grand Codex', desc: 'Discover every species.', reward: 500, test: (s) => Object.keys(EVO.SPECIES).every((k) => s.discovered[k]) },
  ];

  EVO.NAME_PARTS = {
    prefix: ['Zeph', 'Bram', 'Kael', 'Nyx', 'Orin', 'Vael', 'Mossy', 'Cinder', 'Dusk', 'Fen', 'Grit', 'Halo', 'Juni', 'Koa', 'Lumen', 'Pip', 'Quill', 'Rune', 'Sable', 'Thorn', 'Umber', 'Wisp'],
    suffix: ['ix', 'or', 'a', 'us', 'een', 'ara', 'ic', 'oh', 'ly', 'per', 'wyn', 'dle', 'ket', 'row', 'sk', 'th'],
  };
})();
