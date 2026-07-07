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
  };
  EVO.BIOME_KEYS = ['dune', 'bog', 'crag', 'tundra'];

  // Core performance genes. Each creature carries two alleles per gene
  // (numbers ~0..100). Phenotype stat = average of the two alleles.
  EVO.STAT_GENES = ['speed', 'stamina', 'accel', 'agility'];

  // Which stat each biome leans on most (for the adaptation bonus math).
  EVO.BIOME_STAT = { dune: 'speed', bog: 'stamina', crag: 'agility', tundra: 'stamina' };

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
      statBonus: {},
    },
    // Tier 1 specialists (one per biome)
    dunestrider: { key: 'dunestrider', tier: 1, biome: 'dune', name: 'Dunestrider', emoji: '🦎',
      blurb: 'Lean and heat-hardened. Flies across open sand.', statBonus: { speed: 8, accel: 4 } },
    bogfin: { key: 'bogfin', tier: 1, biome: 'bog', name: 'Bogfin', emoji: '🐊',
      blurb: 'Webbed and tireless. Churns through mud that mires others.', statBonus: { stamina: 8, agility: 3 } },
    craghorn: { key: 'craghorn', tier: 1, biome: 'crag', name: 'Craghorn', emoji: '🐐',
      blurb: 'Sure-footed climber that treats sheer rock like a road.', statBonus: { agility: 8, accel: 3 } },
    frostpelt: { key: 'frostpelt', tier: 1, biome: 'tundra', name: 'Frostpelt', emoji: '🐻‍❄️',
      blurb: 'Insulated and relentless. Outlasts the cold and the field.', statBonus: { stamina: 8, speed: 3 } },
    // Tier 2 apex forms
    mirageraptor: { key: 'mirageraptor', tier: 2, biome: 'dune', name: 'Mirage Raptor', emoji: '🐉',
      blurb: 'An apex desert predator. A blur in the heat-haze.', statBonus: { speed: 16, accel: 9 } },
    leviatoad: { key: 'leviatoad', tier: 2, biome: 'bog', name: 'Leviatoad', emoji: '🦕',
      blurb: 'A colossus of the fen. The bog itself seems to push it forward.', statBonus: { stamina: 16, agility: 7 } },
    thunderpeak: { key: 'thunderpeak', tier: 2, biome: 'crag', name: 'Thunderpeak', emoji: '🦅',
      blurb: 'Half-climber, half-glider. Owns the vertical world.', statBonus: { agility: 16, accel: 8 } },
    glaciarch: { key: 'glaciarch', tier: 2, biome: 'tundra', name: 'Glaciarch', emoji: '🦣',
      blurb: 'An ancient, unstoppable engine of the deep cold.', statBonus: { stamina: 16, speed: 8 } },
  };

  // Metamorphosis path: from-species + biome -> next species.
  EVO.EVOLVE_NEXT = {
    grubling: { dune: 'dunestrider', bog: 'bogfin', crag: 'craghorn', tundra: 'frostpelt' },
    dunestrider: { dune: 'mirageraptor' },
    bogfin: { bog: 'leviatoad' },
    craghorn: { crag: 'thunderpeak' },
    frostpelt: { tundra: 'glaciarch' },
  };

  // Adaptation needed in the target biome for offspring to metamorphose.
  EVO.EVOLVE_THRESHOLD = { 1: 55, 2: 82 };

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

  EVO.NAME_PARTS = {
    prefix: ['Zeph', 'Bram', 'Kael', 'Nyx', 'Orin', 'Vael', 'Mossy', 'Cinder', 'Dusk', 'Fen', 'Grit', 'Halo', 'Juni', 'Koa', 'Lumen', 'Pip', 'Quill', 'Rune', 'Sable', 'Thorn', 'Umber', 'Wisp'],
    suffix: ['ix', 'or', 'a', 'us', 'een', 'ara', 'ic', 'oh', 'ly', 'per', 'wyn', 'dle', 'ket', 'row', 'sk', 'th'],
  };
})();
