/*
 * genetics.js — RNG helpers, genome construction, inheritance, mutation.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});

  // ---- Random helpers ---------------------------------------------------
  const R = {
    float: (min, max) => min + Math.random() * (max - min),
    int: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    gauss: (mean, sd) => {
      // Box–Muller
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
  };
  EVO.R = R;

  EVO.randomName = function () {
    return R.pick(EVO.NAME_PARTS.prefix) + R.pick(EVO.NAME_PARTS.suffix);
  };

  EVO.uid = (function () {
    let n = 1;
    return () => 'c' + (n++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  })();

  // A gene is stored as a two-allele array [a, b]. Stat/adapt alleles are
  // numbers; visual genes use encoded integers/indices.
  function statAllele(mean, sd) {
    return Math.round(R.clamp(R.gauss(mean, sd), 1, 100));
  }

  // Build a fresh "wild" genome around a quality level (0..1).
  EVO.makeWildGenome = function (quality) {
    const q = quality == null ? 0.35 : quality;
    const mean = 20 + q * 45; // wild creatures are middling
    const g = {};
    EVO.STAT_GENES.forEach((k) => {
      g[k] = [statAllele(mean, 12), statAllele(mean, 12)];
    });
    // Wild creatures have low, slightly random adaptation.
    EVO.ADAPT_GENES.forEach((k) => {
      g[k] = [statAllele(12, 8), statAllele(12, 8)];
    });
    // Give wild creatures a faint natural lean toward one biome.
    const lean = R.pick(EVO.BIOME_KEYS);
    const lk = 'adapt_' + lean;
    g[lk] = [statAllele(30, 8), statAllele(30, 8)];

    g.hue = [R.int(0, 359), R.int(0, 359)];
    g.pattern = [R.int(0, EVO.PATTERNS.length - 1), R.int(0, EVO.PATTERNS.length - 1)];
    g.bodySize = [statAllele(50, 18), statAllele(50, 18)];
    g.limb = [R.int(0, EVO.LIMBS.length - 1), R.int(0, EVO.LIMBS.length - 1)];
    g.eyes = [R.pick([2, 2, 2, 3, 4]), R.pick([2, 2, 2, 3, 4])];
    g.horn = [R.pick([0, 0, 1]), R.pick([0, 0, 1])];
    // Colour morph: 0 normal, 1 iridescent, 2 albino, 3 melanic. Rare in the wild.
    const morph = () => (R.chance(0.9) ? 0 : R.int(1, 3));
    g.sheen = [morph(), morph()];
    // Back ridge: 0 none, 1 low ridge, 2 full spines.
    g.spikes = [R.pick([0, 0, 0, 1, 1, 2]), R.pick([0, 0, 0, 1, 1, 2])];
    return g;
  };

  // Fill in genes added after a save was created, so old creatures keep
  // working (and can pass the new genes on) after an update.
  EVO.migrateGenome = function (g) {
    EVO.ADAPT_GENES.forEach((k) => {
      if (!g[k]) g[k] = [statAllele(10, 6), statAllele(10, 6)];
    });
    if (!g.sheen) g.sheen = [0, 0];
    if (!g.spikes) g.spikes = [R.pick([0, 0, 1]), R.pick([0, 0, 1])];
    return g;
  };

  // Mendelian-ish inheritance: offspring takes one allele from each parent per
  // gene, then mutation nudges values. `pressureBiome` biases adaptation genes
  // upward — this is the epigenetic effect of where the parents raced.
  EVO.breedGenome = function (momG, dadG, pressureBiome, mutationRate) {
    const mr = mutationRate == null ? 0.12 : mutationRate;
    const child = {};

    const inheritNumeric = (key, lo, hi, sd) => {
      const a = R.pick(momG[key]);
      const b = R.pick(dadG[key]);
      let v1 = a, v2 = b;
      if (R.chance(mr)) v1 = R.clamp(v1 + R.gauss(0, sd), lo, hi);
      if (R.chance(mr)) v2 = R.clamp(v2 + R.gauss(0, sd), lo, hi);
      child[key] = [Math.round(v1), Math.round(v2)];
    };

    EVO.STAT_GENES.forEach((k) => inheritNumeric(k, 1, 100, 9));

    EVO.ADAPT_GENES.forEach((k) => {
      inheritNumeric(k, 1, 100, 6);
      if (pressureBiome && k === 'adapt_' + pressureBiome) {
        // Directed evolution: parents that raced this biome push offspring's
        // adaptation up. Bigger, more reliable nudge than random mutation.
        const boost = R.int(3, 9);
        child[k] = child[k].map((v) => R.clamp(Math.round(v + boost), 1, 100));
      }
    });

    const inheritDiscrete = (key, mutFn) => {
      let v = R.pick([R.pick(momG[key]), R.pick(dadG[key])]);
      if (R.chance(mr)) v = mutFn(v);
      child[key] = [v, R.pick([R.pick(momG[key]), R.pick(dadG[key])])];
    };

    inheritDiscrete('hue', (v) => (v + R.int(-30, 30) + 360) % 360);
    inheritDiscrete('pattern', () => R.int(0, EVO.PATTERNS.length - 1));
    inheritNumeric('bodySize', 10, 100, 10);
    inheritDiscrete('limb', () => R.int(0, EVO.LIMBS.length - 1));
    inheritDiscrete('eyes', (v) => R.clamp(v + R.pick([-1, 1]), 2, 5));
    inheritDiscrete('horn', () => R.pick([0, 1]));
    inheritDiscrete('sheen', () => R.int(0, 3)); // mutation can flip morphs
    inheritDiscrete('spikes', () => R.int(0, 2));
    return child;
  };

  // Phenotype value of a numeric gene = mean of its two alleles.
  EVO.express = function (genome, key) {
    const g = genome[key];
    return (g[0] + g[1]) / 2;
  };

  // Traits are heritable: each parent trait passes with ~55% odds, and there's
  // a small chance a fresh mutation appears. Capped at 2 traits per creature.
  EVO.inheritTraits = function (mom, dad, mutationRate) {
    const pool = new Set([...(mom.traits || []), ...(dad.traits || [])]);
    const kept = [];
    pool.forEach((t) => { if (R.chance(0.55)) kept.push(t); });
    if (R.chance((mutationRate || 0.14) * 0.35) && kept.length < 2) {
      kept.push(R.pick(EVO.TRAIT_KEYS));
    }
    // de-dup + cap
    return Array.from(new Set(kept)).slice(0, 2);
  };
})();
