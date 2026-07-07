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
    const tonic = !!c.tonic; // stamina tonic consumable: boosted next race
    return {
      // Top speed leans on the biome's key stat plus adaptation.
      topSpeed: (s.speed * 0.7 + s[leanStat] * 0.3) * adaptMul,
      stamina: s.stamina * adaptMul * (tonic ? 1.15 : 1),
      accel: s.accel,
      agility: s.agility,
      adaptMul,
      startEnergy: tonic ? 115 : 100,
    };
  };

  // Run a full race. Returns { order:[creatureId...], frames:[[pos...]...], meta }.
  // Positions are 0..1 fraction of track. Deterministic-ish per call (uses RNG).
  EVO.simulateRace = function (racers, biome, opts) {
    opts = opts || {};
    const trackLen = 1000;
    const ticks = 520;
    const profiles = racers.map((c) => EVO.racerProfile(c, biome));

    const state = racers.map((c, i) => ({
      id: c.id,
      idx: i,
      pos: 0,
      vel: 0,
      energy: profiles[i].startEnergy || 100,
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
          const jitter = (1 - p.agility / 160) * R.gauss(0, 0.7);
          let step = Math.max(0, st.vel * 0.09 + jitter);

          // Energy drains; stamina slows the drain. Low energy caps speed.
          // Scaled for the longer race so stamina decides the final stretch.
          const drain = 0.28 - (p.stamina / 100) * 0.18;
          st.energy = Math.max(0, st.energy - drain);

          st.pos += step;
          if (st.pos >= trackLen && st.finishedTick == null) {
            st.pos = trackLen;
            st.finishedTick = t;
          }
        }
        posRow.push(Math.min(1, st.pos / trackLen));
      }
      frames.push(posRow);
      // Stop once the whole field is home — no dead air after the finish.
      if (state.every((s) => s.finishedTick != null)) break;
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

    // Photo finish: the top two crossed (or ended) within a whisker.
    const photoFinish = ranked.length >= 2 && (
      (ranked[0].finished && ranked[1].finished && Math.abs(ranked[0].finishedTick - ranked[1].finishedTick) <= 7) ||
      (!ranked[1].finished && Math.abs(ranked[0].pos - ranked[1].pos) <= trackLen * 0.015)
    );

    return {
      order: ranked.map((r) => r.id),
      orderIdx: ranked.map((r) => r.idx),
      frames,
      biome,
      ticks,
      photoFinish,
    };
  };

  // Generate commentary beats from the frame data: start call, checkpoint
  // leader calls, lead-change interjections, and a closing-stretch call.
  // Returns [{frame, text}] sorted by frame; the UI shows each as the
  // animation passes it.
  EVO.raceCommentary = function (racers, result, playerId) {
    const frames = result.frames;
    const total = frames.length;
    const b = EVO.BIOMES[result.biome];
    const name = (i) => (racers[i].id === playerId ? 'your ' + racers[i].name : racers[i].name);
    const leaderAt = (f) => {
      const row = frames[Math.min(f, total - 1)];
      let best = 0;
      for (let i = 1; i < row.length; i++) if (row[i] > row[best]) best = i;
      return best;
    };

    const events = [{ frame: 0, text: `🏁 And they're off across ${b.name}!` }];

    // Lead changes, sampled coarsely so we call the fights, not the noise.
    let last = leaderAt(4);
    const swaps = [];
    for (let f = 12; f < total - 8; f += 12) {
      const l = leaderAt(f);
      if (l !== last) { swaps.push({ frame: f, idx: l }); last = l; }
    }
    swaps.slice(0, 3).forEach((s) => {
      events.push({ frame: s.frame, text: `⚡ ${name(s.idx)} surges into the lead!` });
    });

    // Checkpoint calls (skip any that land within 10 frames of a swap call).
    [[0.33, 'a third of the way in'], [0.62, 'into the back stretch'], [0.85, 'into the final stretch']].forEach(([frac, label]) => {
      const f = Math.floor(total * frac);
      if (events.some((e) => Math.abs(e.frame - f) < 12)) return;
      events.push({ frame: f, text: `${name(leaderAt(f))} leads ${label}.` });
    });

    if (result.photoFinish) {
      events.push({ frame: Math.floor(total * 0.94), text: '📸 Neck and neck — it\'s going to be a photo finish!' });
    }
    return events.sort((a, b2) => a.frame - b2.frame);
  };

  // Prize money by finishing position and race tier.
  EVO.PRIZES = [120, 60, 30, 15, 8, 5];
  EVO.racePrize = function (position, entryFee) {
    const base = EVO.PRIZES[position] || 0;
    return Math.round(base + (position === 0 ? entryFee * 1.5 : 0));
  };
})();
