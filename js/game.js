/*
 * game.js — Game state, economy, breeding orchestration, save/load.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const R = EVO.R;
  const SAVE_KEY = 'evo-race-save-v1';

  const Game = (EVO.Game = {
    state: null,

    newGame() {
      const stable = [];
      // Start with three wild grublings so the player can breed immediately.
      for (let i = 0; i < 3; i++) {
        stable.push(EVO.makeCreature(EVO.makeWildGenome(0.4), { generation: 1 }));
      }
      // Guarantee one of each sex for a valid first breeding pair.
      stable[0].sex = 'M';
      stable[1].sex = 'F';
      this.state = {
        coins: 150,
        day: 1,
        stable,
        market: [],
        stableCap: 8,
        log: [],
        stats: { racesRun: 0, wins: 0, bred: 0, evolutions: 0, explored: 0 },
        discovered: { grubling: true },
        goalsDone: {},
      };
      this.refreshMarket();
      this.save();
      return this.state;
    },

    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.stable) return null;
        this.state = data;
        // Back-compat guards.
        this.state.discovered = this.state.discovered || { grubling: true };
        this.state.stats = this.state.stats || { racesRun: 0, wins: 0, bred: 0, evolutions: 0, explored: 0 };
        if (this.state.stats.explored == null) this.state.stats.explored = 0;
        this.state.goalsDone = this.state.goalsDone || {};
        this.state.stable.forEach((c) => { if (!c.traits) c.traits = []; });
        this.state.market.forEach((c) => { if (!c.traits) c.traits = []; });
        return this.state;
      } catch (e) {
        console.warn('Load failed', e);
        return null;
      }
    },

    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Save failed', e);
      }
    },

    reset() {
      localStorage.removeItem(SAVE_KEY);
      return this.newGame();
    },

    logMsg(msg) {
      this.state.log.unshift({ day: this.state.day, msg });
      this.state.log = this.state.log.slice(0, 40);
    },

    getCreature(id) {
      return this.state.stable.find((c) => c.id === id) || this.state.market.find((c) => c.id === id);
    },

    // ---- Market ---------------------------------------------------------
    refreshMarket() {
      const q = Math.min(0.75, 0.3 + this.state.day * 0.02);
      this.state.market = [];
      for (let i = 0; i < 3; i++) {
        const traits = R.chance(0.16) ? [R.pick(EVO.TRAIT_KEYS)] : [];
        const c = EVO.makeCreature(EVO.makeWildGenome(q + R.float(-0.1, 0.15)), { generation: 1, traits });
        c.price = EVO.priceOf(c);
        this.state.market.push(c);
      }
    },

    buy(id) {
      const idx = this.state.market.findIndex((c) => c.id === id);
      if (idx < 0) return { ok: false, msg: 'Not available.' };
      const c = this.state.market[idx];
      if (this.state.coins < c.price) return { ok: false, msg: 'Not enough coins.' };
      if (this.state.stable.length >= this.state.stableCap) return { ok: false, msg: 'Stable is full.' };
      this.state.coins -= c.price;
      delete c.price;
      this.state.market.splice(idx, 1);
      this.state.stable.push(c);
      this.markDiscovered(c);
      this.logMsg(`Bought ${c.name} the ${EVO.SPECIES[c.species].name}.`);
      this.save();
      return { ok: true };
    },

    sell(id) {
      const idx = this.state.stable.findIndex((c) => c.id === id);
      if (idx < 0) return { ok: false, msg: 'Not found.' };
      if (this.state.stable.length <= 1) return { ok: false, msg: 'You must keep at least one creature.' };
      const c = this.state.stable[idx];
      const value = Math.round(EVO.priceOf(c) * 0.6);
      this.state.coins += value;
      this.state.stable.splice(idx, 1);
      this.logMsg(`Sold ${c.name} for ${value} coins.`);
      this.save();
      return { ok: true, value };
    },

    expandStable() {
      const cost = 60 + this.state.stableCap * 20;
      if (this.state.coins < cost) return { ok: false, msg: 'Not enough coins.' };
      this.state.coins -= cost;
      this.state.stableCap += 2;
      this.logMsg(`Expanded the stable to ${this.state.stableCap} pens.`);
      this.save();
      return { ok: true };
    },
    expandCost() {
      return 60 + this.state.stableCap * 20;
    },

    // ---- Breeding -------------------------------------------------------
    canBreed(momId, dadId) {
      if (momId === dadId) return { ok: false, msg: 'Pick two different creatures.' };
      const mom = this.getCreature(momId);
      const dad = this.getCreature(dadId);
      if (!mom || !dad) return { ok: false, msg: 'Creature missing.' };
      if (mom.sex === dad.sex) return { ok: false, msg: 'Need one male and one female.' };
      if (this.state.stable.length >= this.state.stableCap) return { ok: false, msg: 'Stable is full — make room first.' };
      const cost = EVO.BREED_COST;
      if (this.state.coins < cost) return { ok: false, msg: `Breeding costs ${cost} coins.` };
      return { ok: true };
    },

    breed(momId, dadId) {
      const check = this.canBreed(momId, dadId);
      if (!check.ok) return check;
      const mom = this.getCreature(momId);
      const dad = this.getCreature(dadId);
      this.state.coins -= EVO.BREED_COST;

      // Directed-evolution pressure = the biome BOTH parents have raced most.
      const pressure = EVO.combinedPressure(mom, dad);
      const genome = EVO.breedGenome(mom.genome, dad.genome, pressure, EVO.MUT_RATE);
      const decision = EVO.decideSpecies(mom, dad, genome);

      const child = EVO.makeCreature(genome, {
        species: decision.species,
        generation: Math.max(mom.generation, dad.generation) + 1,
        parents: [mom.id, dad.id],
        // Offspring inherit a fraction of the parents' biome exposure —
        // lineage "memory" that keeps directed evolution rolling.
        biomeExposure: EVO.inheritExposure(mom, dad),
        traits: EVO.inheritTraits(mom, dad, EVO.MUT_RATE),
      });
      mom.age++; dad.age++;
      this.state.stable.push(child);
      this.state.stats.bred++;
      this.markDiscovered(child);

      let msg = `${mom.name} × ${dad.name} → ${child.name} (Gen ${child.generation}).`;
      if (decision.evolved) {
        this.state.stats.evolutions++;
        msg += ` ✨ METAMORPHOSIS! It evolved into a ${EVO.SPECIES[child.species].name}!`;
      }
      this.logMsg(msg);
      this.save();
      return { ok: true, child, evolved: decision.evolved };
    },

    markDiscovered(c) {
      if (!this.state.discovered[c.species]) {
        this.state.discovered[c.species] = true;
      }
    },

    // ---- Exploration ----------------------------------------------------
    // Send a creature on an expedition into a biome. Resolves immediately into
    // a randomized outcome (coins, a wild egg, and/or a rare mutation trait),
    // advances the calendar, and builds the creature's biome exposure.
    canExplore(creatureId, kindKey) {
      const kind = EVO.EXPEDITIONS[kindKey];
      if (!kind) return { ok: false, msg: 'Unknown expedition.' };
      const c = this.getCreature(creatureId);
      if (!c || !this.state.stable.find((x) => x.id === creatureId)) return { ok: false, msg: 'Pick a creature to send.' };
      if (this.state.coins < kind.cost) return { ok: false, msg: `Costs ${kind.cost} coins.` };
      return { ok: true };
    },

    explore(creatureId, biome, kindKey) {
      const check = this.canExplore(creatureId, kindKey);
      if (!check.ok) return check;
      const kind = EVO.EXPEDITIONS[kindKey];
      const c = this.getCreature(creatureId);
      this.state.coins -= kind.cost;

      const finds = { coins: 0, egg: null, trait: null };
      // Coins always.
      finds.coins = R.int(kind.coinRange[0], kind.coinRange[1]);
      this.state.coins += finds.coins;

      // Rare trait discovery (attaches to the explorer if it has room).
      if (R.chance(kind.rareChance)) {
        const existing = c.traits || [];
        if (existing.length < 2) {
          const t = R.pick(EVO.TRAIT_KEYS.filter((k) => !existing.includes(k)));
          if (t) { c.traits = existing.concat(t); finds.trait = t; }
        }
      }

      // Wild egg: a creature strongly leaning into the explored biome.
      if (R.chance(kind.eggChance)) {
        const g = EVO.makeWildGenome(Math.min(0.8, 0.4 + this.state.day * 0.015));
        const ak = 'adapt_' + biome;
        g[ak] = [R.int(35, 65), R.int(35, 65)];
        const eggTraits = R.chance(0.12) ? [R.pick(EVO.TRAIT_KEYS)] : [];
        const egg = EVO.makeCreature(g, { generation: 1, traits: eggTraits });
        egg.foundBiome = biome;
        finds.egg = egg;
      }

      // Build exposure & advance calendar.
      c.biomeExposure[biome] = (c.biomeExposure[biome] || 0) + kind.exposure;
      c.age++;
      this.state.stats.explored++;
      this.state.day += kind.days;
      this.refreshMarket();

      const b = EVO.BIOMES[biome];
      let msg = `${c.name} explored ${b.name}: +${finds.coins} coins`;
      if (finds.trait) msg += `, discovered the ${EVO.TRAITS[finds.trait].name} trait`;
      if (finds.egg) msg += ', found a wild egg';
      this.logMsg(msg + '.');
      this.save();
      return { ok: true, finds };
    },

    // Accept a found egg into the stable (if there's room).
    keepEgg(egg) {
      if (this.state.stable.length >= this.state.stableCap) return { ok: false, msg: 'Stable is full.' };
      this.state.stable.push(egg);
      this.markDiscovered(egg);
      this.logMsg(`${egg.name} hatched into your stable.`);
      this.save();
      return { ok: true };
    },

    // ---- Goals ----------------------------------------------------------
    // Returns any goals newly completed this check (and pays them out).
    checkGoals() {
      const newly = [];
      EVO.GOALS.forEach((g) => {
        if (!this.state.goalsDone[g.key] && g.test(this.state)) {
          this.state.goalsDone[g.key] = this.state.day;
          this.state.coins += g.reward;
          newly.push(g);
          this.logMsg(`Goal complete — ${g.name}! +${g.reward} coins.`);
        }
      });
      if (newly.length) this.save();
      return newly;
    },

    // ---- Racing ---------------------------------------------------------
    // Record results after a race is simulated & animated by the UI.
    recordRace(result, playerId, biome, entryFee) {
      const pos = result.order.indexOf(playerId);
      const player = this.getCreature(playerId);
      if (player) {
        player.races++;
        player.biomeExposure[biome] = (player.biomeExposure[biome] || 0) + 1;
        if (pos === 0) player.wins++;
        player.age++;
      }
      const prize = EVO.racePrize(pos, entryFee);
      this.state.coins += prize;
      this.state.stats.racesRun++;
      if (pos === 0) this.state.stats.wins++;
      this.state.day++;
      if (this.state.day % 2 === 0) this.refreshMarket();
      this.logMsg(`${player ? player.name : 'Your racer'} finished #${pos + 1} at ${EVO.BIOMES[biome].name}. +${prize} coins.`);
      this.save();
      return { pos, prize };
    },
  });

  // ---- Economy tunables ---------------------------------------------------
  EVO.BREED_COST = 40;
  EVO.MUT_RATE = 0.14;
  EVO.RACE_ENTRY = 15;

  EVO.priceOf = function (c) {
    return Math.round(30 + EVO.rating(c) * 2.4 + (EVO.SPECIES[c.species].tier || 0) * 40);
  };

  // The biome to apply as breeding pressure: whichever biome the pair has
  // collectively raced the most. Ties break toward the parents' best adaptation.
  EVO.combinedPressure = function (mom, dad) {
    const totals = {};
    EVO.BIOME_KEYS.forEach((b) => {
      totals[b] = (mom.biomeExposure[b] || 0) + (dad.biomeExposure[b] || 0);
    });
    let best = null;
    EVO.BIOME_KEYS.forEach((b) => {
      if (totals[b] > 0 && (!best || totals[b] > totals[best])) best = b;
    });
    return best; // null if neither parent has raced — no pressure yet
  };

  EVO.inheritExposure = function (mom, dad) {
    const e = {};
    EVO.BIOME_KEYS.forEach((b) => {
      e[b] = Math.floor(((mom.biomeExposure[b] || 0) + (dad.biomeExposure[b] || 0)) / 4);
    });
    return e;
  };

  // Breeding predictor: simulate N offspring to estimate stat ranges and the
  // probability of a metamorphosis. Powers the in-lab planning preview so the
  // player can make an informed cross instead of guessing.
  EVO.predictBreed = function (mom, dad, samples) {
    samples = samples || 160;
    const pressure = EVO.combinedPressure(mom, dad);
    const ranges = {};
    EVO.STAT_GENES.forEach((k) => { ranges[k] = { min: Infinity, max: -Infinity, sum: 0 }; });
    let evolveHits = 0;
    let evolveTarget = null;
    for (let i = 0; i < samples; i++) {
      const g = EVO.breedGenome(mom.genome, dad.genome, pressure, EVO.MUT_RATE);
      const decision = EVO.decideSpecies(mom, dad, g);
      if (decision.evolved) { evolveHits++; evolveTarget = decision.species; }
      const spBonus = (EVO.SPECIES[decision.species] || {}).statBonus || {};
      EVO.STAT_GENES.forEach((k) => {
        const v = (g[k][0] + g[k][1]) / 2 + (spBonus[k] || 0);
        const r = ranges[k];
        if (v < r.min) r.min = v;
        if (v > r.max) r.max = v;
        r.sum += v;
      });
    }
    const stat = {};
    EVO.STAT_GENES.forEach((k) => {
      stat[k] = { min: Math.round(ranges[k].min), max: Math.round(ranges[k].max), avg: Math.round(ranges[k].sum / samples) };
    });
    return { stat, evolveChance: evolveHits / samples, evolveTarget, pressure };
  };
})();
