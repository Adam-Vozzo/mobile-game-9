/*
 * battle.js — Arena brawl simulation. A real-time auto-battler: combatants
 * seek, strike, and fire lineage abilities until one is left standing. Pure
 * model, like race.js — the UI animates from the frames/events it produces.
 *
 * Stat mapping: stamina→HP, speed→damage, accel→attack speed, agility→dodge
 * & crit. The arena's biome buffs adapted combatants (same lever as racing),
 * and brawling there builds exposure — battles drive evolution too.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const R = EVO.R;

  const ARENA = 100;        // logical arena is 100×100 units
  const ATTACK_RANGE = 11;
  const MAX_TICKS = 900;

  // Which abilities a creature's evolution grants it in the arena.
  EVO.abilitiesFor = function (c) {
    const sp = EVO.SPECIES[c.species] || EVO.SPECIES.grubling;
    if (sp.biome) return [sp.biome];
    if (sp.biomes) return sp.biomes.slice(); // hybrids wield both lineages
    if (sp.hybrid) return ['chaos'];         // chimerax
    return [];                               // grublings fight bare-clawed
  };

  EVO.battlerProfile = function (c, biome) {
    const s = EVO.stats(c);
    const adapt = EVO.adaptation(c)[biome];
    const adaptMul = 0.85 + (adapt / 100) * 0.3;
    const traits = c.traits || [];
    const tier = (EVO.SPECIES[c.species] || {}).tier || 0;
    return {
      maxHp: Math.round((70 + s.stamina * 1.8) * adaptMul * (c.tonic ? 1.12 : 1)),
      dmg: (6 + s.speed * 0.16) * adaptMul,
      atkCd: Math.max(14, Math.round((38 - s.accel * 0.22) * (traits.includes('swiftborn') ? 0.8 : 1))),
      move: 0.55 + s.speed * 0.012,
      dodge: Math.min(0.28, s.agility / 400),
      crit: Math.min(0.2, s.agility / 500),
      armor: traits.includes('ironhide') ? 0.82 : 1,     // incoming dmg mult
      dazzle: traits.includes('bioluminescent') ? 0.1 : 0, // attackers miss more
      twin: traits.includes('twin_tailed') ? 0.18 : 0,   // double-strike chance
      power: tier === 2 ? 1.35 : 1,                      // ability strength
      abilities: EVO.abilitiesFor(c),
    };
  };

  // Run a full brawl. Returns { order, orderIdx, frames, events, winnerId }.
  EVO.simulateBattle = function (combatants, biome) {
    const profiles = combatants.map((c) => EVO.battlerProfile(c, biome));
    const corners = [[16, 16], [84, 16], [16, 84], [84, 84], [50, 12], [50, 88]];
    const state = combatants.map((c, i) => ({
      id: c.id, idx: i,
      x: corners[i][0], y: corners[i][1],
      hp: profiles[i].maxHp,
      alive: true, koTick: null,
      atkTimer: R.int(6, 20),
      abTimer: R.int(50, 90),
      abNext: 0,               // hybrids alternate abilities
      slow: 0, stun: 0,
      burn: null,              // {left, timer, dmg}
    }));

    const frames = [];
    const events = [];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const living = () => state.filter((s) => s.alive);

    const damage = (t, tick, amount, srcIdx, kind) => {
      const st = state[t];
      if (!st.alive) return;
      const dealt = Math.max(1, Math.round(amount * profiles[t].armor));
      st.hp -= dealt;
      events.push({ tick, type: kind || 'hit', actor: srcIdx, target: t, amount: dealt });
      if (st.hp <= 0) {
        st.hp = 0; st.alive = false; st.koTick = tick;
        events.push({ tick, type: 'ko', target: t, actor: srcIdx });
      }
    };

    const castAbility = (i, tick) => {
      const st = state[i], p = profiles[i];
      if (!p.abilities.length) return false;
      let key = p.abilities[st.abNext % p.abilities.length];
      st.abNext++;
      if (key === 'chaos') key = R.pick(['dune', 'bog', 'crag', 'tundra', 'ash', 'reef']);
      const foes = living().filter((s) => s.idx !== i);
      if (!foes.length) return false;
      const target = foes.reduce((a, b) => (dist(st, a) < dist(st, b) ? a : b));
      const ab = EVO.ABILITIES[key];
      events.push({ tick, type: 'ability', actor: i, target: target.idx, ability: key, text: `${ab.emoji} ${ab.name}` });

      if (key === 'dune') {          // blink behind target + heavy strike
        st.x = R.clamp(target.x + R.float(-6, 6), 6, ARENA - 6);
        st.y = R.clamp(target.y + R.float(-6, 6), 6, ARENA - 6);
        damage(target.idx, tick, p.dmg * 1.6 * p.power, i, 'ability-hit');
      } else if (key === 'bog') {    // slow
        target.slow = Math.max(target.slow, 80);
        damage(target.idx, tick, p.dmg * 0.6 * p.power, i, 'ability-hit');
      } else if (key === 'crag') {   // stun slam
        target.stun = Math.max(target.stun, 40);
        damage(target.idx, tick, p.dmg * 2.0 * p.power, i, 'ability-hit');
      } else if (key === 'tundra') { // AoE chill
        foes.forEach((f) => {
          if (dist(st, f) < 34) {
            f.slow = Math.max(f.slow, 50);
            damage(f.idx, tick, p.dmg * 0.9 * p.power, i, 'ability-hit');
          }
        });
      } else if (key === 'ash') {    // ignite
        target.burn = { left: 60, timer: 10, dmg: Math.round(2 + p.power * 2.5) };
        damage(target.idx, tick, p.dmg * 0.8 * p.power, i, 'ability-hit');
      } else if (key === 'reef') {   // heal + shove
        const heal = Math.round(p.maxHp * 0.22 * p.power);
        st.hp = Math.min(p.maxHp, st.hp + heal);
        events.push({ tick, type: 'heal', actor: i, target: i, amount: heal });
        const dx = target.x - st.x, dy = target.y - st.y, d = Math.hypot(dx, dy) || 1;
        target.x = R.clamp(target.x + (dx / d) * 24, 4, ARENA - 4);
        target.y = R.clamp(target.y + (dy / d) * 24, 4, ARENA - 4);
      }
      return true;
    };

    let tick = 0;
    for (; tick < MAX_TICKS; tick++) {
      for (const st of state) {
        if (!st.alive) continue;
        const p = profiles[st.idx];

        // Status upkeep.
        if (st.slow > 0) st.slow--;
        if (st.burn) {
          if (--st.burn.timer <= 0) {
            st.burn.timer = 10;
            damage(st.idx, tick, st.burn.dmg / (p.armor || 1), -1, 'burn'); // burn ignores armor
          }
          if (--st.burn.left <= 0) st.burn = null;
        }
        if (!st.alive) continue;
        if (st.stun > 0) { st.stun--; continue; }

        const foes = living().filter((s) => s.idx !== st.idx);
        if (!foes.length) break;
        const target = foes.reduce((a, b) => (dist(st, a) < dist(st, b) ? a : b));
        const d = dist(st, target);

        // Ability first when it's up.
        if (--st.abTimer <= 0) {
          if (castAbility(st.idx, tick)) st.abTimer = 120 + R.int(0, 30);
          else st.abTimer = 60; // grubling: retry sooner but never casts
        }
        if (!st.alive) continue;

        if (d > ATTACK_RANGE) {
          // Seek target; a light mutual repulsion keeps the pile readable.
          const mv = p.move * (st.slow > 0 ? 0.6 : 1);
          st.x += ((target.x - st.x) / d) * mv;
          st.y += ((target.y - st.y) / d) * mv;
          for (const o of foes) {
            const od = dist(st, o);
            if (od < 7 && od > 0.01) {
              st.x += ((st.x - o.x) / od) * 0.5;
              st.y += ((st.y - o.y) / od) * 0.5;
            }
          }
          st.x = R.clamp(st.x, 4, ARENA - 4);
          st.y = R.clamp(st.y, 4, ARENA - 4);
        } else if (--st.atkTimer <= 0) {
          st.atkTimer = Math.round(p.atkCd * (st.slow > 0 ? 1.4 : 1));
          // Basic strike: dodge, crit, twin-tail follow-up.
          const evade = profiles[target.idx].dodge + profiles[target.idx].dazzle;
          if (R.chance(evade)) {
            events.push({ tick, type: 'dodge', actor: st.idx, target: target.idx });
          } else {
            const crit = R.chance(p.crit);
            damage(target.idx, tick, p.dmg * (crit ? 1.6 : 1), st.idx, crit ? 'crit' : 'hit');
            if (R.chance(p.twin)) damage(target.idx, tick, p.dmg * 0.6, st.idx, 'hit');
          }
        }
      }

      frames.push(state.map((s) => ({ x: s.x, y: s.y, hp: s.hp, alive: s.alive })));
      if (living().length <= 1) break;
    }

    // Ranking: survivors by remaining HP, then the fallen by how long they lasted.
    const ranked = state.slice().sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (a.alive) return b.hp - a.hp;
      return b.koTick - a.koTick;
    });
    return {
      order: ranked.map((s) => s.id),
      orderIdx: ranked.map((s) => s.idx),
      frames, events, biome,
      winnerId: ranked[0].id,
      maxHps: profiles.map((p) => p.maxHp),
    };
  };

  // Commentary beats for the announcer line: the bell, first blood, each KO.
  EVO.battleCommentary = function (combatants, result, playerId) {
    const name = (i) => (combatants[i].id === playerId ? 'your ' + combatants[i].name : combatants[i].name);
    const lines = [{ frame: 0, text: `🔔 The bell rings at ${EVO.BIOMES[result.biome].name}!` }];
    const firstHit = result.events.find((e) => e.type === 'hit' || e.type === 'crit' || e.type === 'ability-hit');
    if (firstHit && firstHit.actor >= 0) lines.push({ frame: firstHit.tick, text: `💢 First blood to ${name(firstHit.actor)}!` });
    result.events.filter((e) => e.type === 'ko').forEach((e) => {
      lines.push({ frame: e.tick, text: `💥 ${name(e.target)} is knocked out${e.actor >= 0 ? ' by ' + name(e.actor) : ''}!` });
    });
    return lines.sort((a, b) => a.frame - b.frame);
  };

  // Prize money by placement.
  EVO.BATTLE_PRIZES = [110, 50, 22, 10];
  EVO.battlePrize = function (position, entryFee) {
    return Math.round((EVO.BATTLE_PRIZES[position] || 0) + (position === 0 ? entryFee * 1.5 : 0));
  };
})();
