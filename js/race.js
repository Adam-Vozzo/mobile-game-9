/*
 * race.js — Race simulation. Pure model that steps racers along a track;
 * the UI layer animates from the per-tick positions this produces.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const R = EVO.R;

  // Compute a racer's effective performance profile on a given biome.
  // Biome adaptation is the fulcrum: a well-adapted creature gets a real
  // edge, a poorly-adapted one is dragged down — which is why *where* you
  // race, and what you've bred for, matters.
  EVO.racerProfile = function (c, biome) {
    const s = EVO.stats(c);
    const adapt = EVO.adaptation(c)[biome]; // 0..100
    // Adaptation maps to a multiplier roughly 0.78 .. 1.28.
    const adaptMul = 0.78 + (adapt / 100) * 0.5;
    const leanStat = EVO.BIOME_STAT[biome];
    return {
      // Top speed leans on the biome's key stat plus adaptation.
      topSpeed: (s.speed * 0.7 + s[leanStat] * 0.3) * adaptMul,
      stamina: s.stamina * adaptMul,
      accel: s.accel,
      agility: s.agility,
      adaptMul,
    };
  };

  // Run a full race. Returns { order:[creatureId...], frames:[[pos...]...], meta }.
  // Positions are 0..1 fraction of track. Deterministic-ish per call (uses RNG).
  EVO.simulateRace = function (racers, biome, opts) {
    opts = opts || {};
    const trackLen = 1000;
    const ticks = 240;
    const profiles = racers.map((c) => EVO.racerProfile(c, biome));

    const state = racers.map((c, i) => ({
      id: c.id,
      idx: i,
      pos: 0,
      vel: 0,
      energy: 100,
      finishedTick: null,
    }));

    const frames = [];
    for (let t = 0; t < ticks; t++) {
      const posRow = [];
      for (let i = 0; i < state.length; i++) {
        const st = state[i];
        const p = profiles[i];
        if (st.pos < trackLen) {
          // Accelerate toward top speed; higher accel closes the gap faster.
          const target = p.topSpeed * (0.55 + (st.energy / 100) * 0.45);
          const accelRate = 0.02 + (p.accel / 100) * 0.06;
          st.vel += (target - st.vel) * accelRate;

          // Agility adds/removes small per-tick variance (racing luck / footing).
          const jitter = (1 - p.agility / 160) * R.gauss(0, 0.9);
          let step = Math.max(0, st.vel * 0.09 + jitter);

          // Energy drains; stamina slows the drain. Low energy caps speed.
          const drain = 0.55 - (p.stamina / 100) * 0.35;
          st.energy = Math.max(0, st.energy - drain);

          st.pos += step;
          if (st.pos >= trackLen && st.finishedTick == null) {
            st.pos = trackLen;
            st.finishedTick = t + st.pos / (st.vel || 1) * 0; // marker
            st.finishedTick = t;
          }
        }
        posRow.push(Math.min(1, st.pos / trackLen));
      }
      frames.push(posRow);
    }

    // Final ranking: by finish tick, then by distance covered.
    const ranked = state
      .map((st) => ({
        id: st.id,
        idx: st.idx,
        finished: st.finishedTick != null,
        finishedTick: st.finishedTick == null ? Infinity : st.finishedTick,
        pos: st.pos,
      }))
      .sort((a, b) => {
        if (a.finishedTick !== b.finishedTick) return a.finishedTick - b.finishedTick;
        return b.pos - a.pos;
      });

    return {
      order: ranked.map((r) => r.id),
      orderIdx: ranked.map((r) => r.idx),
      frames,
      biome,
      ticks,
    };
  };

  // Prize money by finishing position and race tier.
  EVO.PRIZES = [120, 60, 30, 15, 8, 5];
  EVO.racePrize = function (position, entryFee) {
    const base = EVO.PRIZES[position] || 0;
    return Math.round(base + (position === 0 ? entryFee * 1.5 : 0));
  };
})();
