/*
 * creature.js — Creature model: derive stats & phenotype from a genome,
 * handle metamorphosis (evolution) decisions.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const R = EVO.R;

  // Build a creature object from a genome + metadata.
  EVO.makeCreature = function (genome, opts) {
    opts = opts || {};
    const c = {
      id: EVO.uid(),
      name: opts.name || EVO.randomName(),
      genome: genome,
      species: opts.species || 'grubling',
      generation: opts.generation || 1,
      parents: opts.parents || null, // [id, id]
      // biomeExposure records how many races this creature has run per biome,
      // which drives directed evolution when it breeds.
      biomeExposure: opts.biomeExposure || EVO.BIOME_KEYS.reduce((o, b) => ((o[b] = 0), o), {}),
      races: 0,
      wins: 0,
      age: 0,          // increments each breeding cycle; affects fertility
      restedUntil: 0,  // race counter for stamina recovery flavour
      sex: opts.sex || R.pick(['M', 'F']),
      traits: opts.traits || [], // mutation traits (see EVO.TRAITS)
    };
    return c;
  };

  // Effective stats include species bonuses and trait bonuses on top of genes.
  EVO.stats = function (c) {
    const sp = EVO.SPECIES[c.species] || EVO.SPECIES.grubling;
    const bonus = sp.statBonus || {};
    const traitBonus = {};
    (c.traits || []).forEach((tk) => {
      const t = EVO.TRAITS[tk];
      if (t && t.stat) Object.keys(t.stat).forEach((k) => { traitBonus[k] = (traitBonus[k] || 0) + t.stat[k]; });
    });
    const s = {};
    EVO.STAT_GENES.forEach((k) => {
      s[k] = Math.round(EVO.R.clamp(EVO.express(c.genome, k) + (bonus[k] || 0) + (traitBonus[k] || 0), 1, 130));
    });
    return s;
  };

  EVO.adaptation = function (c) {
    const a = {};
    EVO.BIOME_KEYS.forEach((b) => {
      a[b] = Math.round(EVO.express(c.genome, 'adapt_' + b));
    });
    return a;
  };

  // The biome this creature is best adapted to.
  EVO.bestBiome = function (c) {
    const a = EVO.adaptation(c);
    return EVO.BIOME_KEYS.reduce((best, b) => (a[b] > a[best] ? b : best), EVO.BIOME_KEYS[0]);
  };

  // Overall rating for quick comparison / sorting / pricing.
  EVO.rating = function (c) {
    const s = EVO.stats(c);
    const core = (s.speed + s.stamina + s.accel + s.agility) / 4;
    const a = EVO.adaptation(c);
    const bestAdapt = Math.max(a.dune, a.bog, a.crag, a.tundra);
    const tierBump = (EVO.SPECIES[c.species].tier || 0) * 6;
    return Math.round(core + bestAdapt * 0.25 + tierBump);
  };

  // Given two parents, decide the offspring species. Metamorphosis triggers
  // when BOTH parents share a species path and the child's adaptation to the
  // target biome clears the threshold for the next tier.
  EVO.decideSpecies = function (mom, dad, childGenome) {
    const momSp = EVO.SPECIES[mom.species];
    const dadSp = EVO.SPECIES[dad.species];

    // Hybrid metamorphosis: two DIFFERENT tier-1 specialists whose child is
    // strongly adapted to BOTH parent biomes fuse into a hybrid apex form.
    if (momSp.tier === 1 && dadSp.tier === 1 && momSp.biome !== dadSp.biome) {
      const a = momSp.biome, b = dadSp.biome;
      const adA = (childGenome['adapt_' + a][0] + childGenome['adapt_' + a][1]) / 2;
      const adB = (childGenome['adapt_' + b][0] + childGenome['adapt_' + b][1]) / 2;
      if (adA >= EVO.HYBRID_THRESHOLD && adB >= EVO.HYBRID_THRESHOLD) {
        const key = [a, b].sort().join('|');
        const spKey = EVO.HYBRIDS[key] || 'chimerax';
        return { species: spKey, evolved: true, hybrid: true };
      }
    }

    // Base: children inherit the LOWER tier parent's species as a starting
    // point unless they qualify to evolve.
    const baseSp = momSp.tier <= dadSp.tier ? mom.species : dad.species;

    const evolveMap = EVO.EVOLVE_NEXT[baseSp];
    if (!evolveMap) return { species: baseSp, evolved: false };

    const childAdapt = {};
    EVO.BIOME_KEYS.forEach((b) => {
      childAdapt[b] = (childGenome['adapt_' + b][0] + childGenome['adapt_' + b][1]) / 2;
    });

    // Try each biome this species can evolve into; pick the strongest that
    // clears the tier threshold.
    const fromTier = baseSp === 'grubling' ? 0 : EVO.SPECIES[baseSp].tier;
    const threshold = EVO.EVOLVE_THRESHOLD[fromTier + 1] || 999;
    let best = null;
    Object.keys(evolveMap).forEach((biome) => {
      if (childAdapt[biome] >= threshold) {
        if (!best || childAdapt[biome] > best.val) {
          best = { species: evolveMap[biome], val: childAdapt[biome], biome };
        }
      }
    });
    if (best) return { species: best.species, evolved: true, biome: best.biome };
    return { species: baseSp, evolved: false };
  };
})();
