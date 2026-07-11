/*
 * battle.js — Arena brawl simulation. A real-time auto-battler: combatants
 * circle, strafe, and kite around the arena, closing in for melee lunges and
 * firing lineage abilities — many as visible projectiles — until one is left
 * standing. Pure model, like race.js — the UI animates from frames/events.
 *
 * Stat mapping: stamina→HP, speed→damage, accel→attack speed, agility→dodge
 * & crit. The arena's biome buffs adapted combatants (same lever as racing),
 * and brawling there builds exposure — battles drive evolution too.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const R = EVO.R;

  const ARENA = 100;         // logical arena is 100×100 units
  const ATTACK_RANGE = 11;   // melee reach
  const CAST_RANGE = 70;     // max range for projectile abilities
  const MAX_TICKS = 2600;
  const SUDDEN_DEATH = 1900; // damage ramps after this so bouts always end

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
      maxHp: Math.round((95 + s.stamina * 2.3) * adaptMul * (c.tonic ? 1.12 : 1)),
      dmg: (4.5 + s.speed * 0.11) * adaptMul,
      atkCd: Math.max(28, Math.round((56 - s.accel * 0.26) * (traits.includes('swiftborn') ? 0.8 : 1))),
      move: 0.42 + s.speed * 0.009,
      dodge: Math.min(0.28, s.agility / 400),
      crit: Math.min(0.2, s.agility / 500),
      armor: traits.includes('ironhide') ? 0.82 : 1,       // incoming dmg mult
      dazzle: traits.includes('bioluminescent') ? 0.1 : 0, // attackers miss more
      twin: traits.includes('twin_tailed') ? 0.18 : 0,     // double-strike chance
      power: tier === 2 ? 1.35 : 1,                        // ability strength
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
      atkTimer: R.int(10, 40),
      abTimer: R.int(90, 170),
      abNext: 0,                       // hybrids alternate abilities
      slow: 0, stun: 0,
      burn: null,                      // {left, timer, dmg}
      mode: 'seek',                    // seek | strafe | retreat
      modeT: 0,
      orbitDir: R.pick([-1, 1]),
      orbitR: R.float(19, 28),
    }));

    const frames = [];
    const events = [];
    const pendingShots = [];           // projectiles in flight
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const living = () => state.filter((s) => s.alive);
    let suddenCalled = false;

    const damage = (t, tick, amount, srcIdx, kind) => {
      const st = state[t];
      if (!st.alive) return;
      const ramp = tick > SUDDEN_DEATH ? 1 + (tick - SUDDEN_DEATH) / 250 : 1;
      const dealt = Math.max(1, Math.round(amount * profiles[t].armor * ramp));
      st.hp -= dealt;
      events.push({ tick, type: kind || 'hit', actor: srcIdx, target: t, amount: dealt });
      if (st.hp <= 0) {
        st.hp = 0; st.alive = false; st.koTick = tick;
        events.push({ tick, type: 'ko', target: t, actor: srcIdx });
      }
    };

    // Projectile abilities land after a flight time — dodging happens with feet.
    const fireShot = (i, targetIdx, tick, key, ab) => {
      const st = state[i];
      const flight = Math.max(14, Math.round(dist(st, state[targetIdx]) * 0.9));
      events.push({ tick, type: 'projectile', actor: i, target: targetIdx, ability: key, emoji: ab.emoji, arrive: tick + flight, from: { x: st.x, y: st.y } });
      pendingShots.push({ arrive: tick + flight, actor: i, target: targetIdx, key });
    };

    const landShot = (shot, tick) => {
      const p = profiles[shot.actor];
      const target = state[shot.target];
      if (!target.alive) return;
      if (shot.key === 'bog') {          // mire glob: slow + dmg
        target.slow = Math.max(target.slow, 90);
        damage(shot.target, tick, p.dmg * 1.1 * p.power, shot.actor, 'ability-hit');
      } else if (shot.key === 'ash') {   // fireball: dmg + burn
        target.burn = { left: 84, timer: 12, dmg: Math.round(2 + p.power * 2.5) };
        damage(shot.target, tick, p.dmg * 1.0 * p.power, shot.actor, 'ability-hit');
      } else if (shot.key === 'reef') {  // wave: shove + dmg
        const st = state[shot.actor];
        const dx = target.x - st.x, dy = target.y - st.y, d = Math.hypot(dx, dy) || 1;
        target.x = R.clamp(target.x + (dx / d) * 26, 4, ARENA - 4);
        target.y = R.clamp(target.y + (dy / d) * 26, 4, ARENA - 4);
        damage(shot.target, tick, p.dmg * 0.7 * p.power, shot.actor, 'ability-hit');
      }
    };

    const castAbility = (i, tick) => {
      const st = state[i], p = profiles[i];
      if (!p.abilities.length) return false;
      let key = p.abilities[st.abNext % p.abilities.length];
      if (key === 'chaos') key = R.pick(['dune', 'bog', 'crag', 'tundra', 'ash', 'reef']);
      const foes = living().filter((s) => s.idx !== i);
      if (!foes.length) return false;
      const target = foes.reduce((a, b) => (dist(st, a) < dist(st, b) ? a : b));
      const d = dist(st, target);
      const ab = EVO.ABILITIES[key];

      // Range gates: projectiles need line distance, dashes mid-range,
      // the nova needs someone close. Not in range → hold the cast.
      if ((key === 'bog' || key === 'ash' || key === 'reef') && d > CAST_RANGE) return false;
      if ((key === 'dune' || key === 'crag') && d > 55) return false;
      if (key === 'tundra' && !foes.some((f) => dist(st, f) < 34)) return false;

      st.abNext++;
      events.push({ tick, type: 'ability', actor: i, target: target.idx, ability: key, text: `${ab.emoji} ${ab.name}` });

      if (key === 'dune') {              // blink behind target + heavy strike
        st.x = R.clamp(target.x + R.float(-6, 6), 6, ARENA - 6);
        st.y = R.clamp(target.y + R.float(-6, 6), 6, ARENA - 6);
        damage(target.idx, tick, p.dmg * 1.9 * p.power, i, 'ability-hit');
      } else if (key === 'crag') {       // leap slam: gap-close + stun
        st.x = R.clamp(target.x + R.float(-7, 7), 6, ARENA - 6);
        st.y = R.clamp(target.y + R.float(-7, 7), 6, ARENA - 6);
        target.stun = Math.max(target.stun, 55);
        damage(target.idx, tick, p.dmg * 2.3 * p.power, i, 'ability-hit');
      } else if (key === 'tundra') {     // frost nova around self
        events.push({ tick, type: 'nova', actor: i });
        foes.forEach((f) => {
          if (dist(st, f) < 34) {
            f.slow = Math.max(f.slow, 70);
            damage(f.idx, tick, p.dmg * 1.1 * p.power, i, 'ability-hit');
          }
        });
      } else if (key === 'reef') {       // heal now, wave in flight
        const heal = Math.round(p.maxHp * 0.18 * p.power);
        st.hp = Math.min(p.maxHp, st.hp + heal);
        events.push({ tick, type: 'heal', actor: i, target: i, amount: heal });
        fireShot(i, target.idx, tick, key, ab);
      } else {                           // bog / ash projectiles
        fireShot(i, target.idx, tick, key, ab);
      }
      return true;
    };

    let tick = 0;
    for (; tick < MAX_TICKS; tick++) {
      if (!suddenCalled && tick === SUDDEN_DEATH) {
        suddenCalled = true;
        events.push({ tick, type: 'sudden' });
      }

      // Land any projectiles due this tick.
      for (let s = pendingShots.length - 1; s >= 0; s--) {
        if (pendingShots[s].arrive <= tick) {
          landShot(pendingShots[s], tick);
          pendingShots.splice(s, 1);
        }
      }

      for (const st of state) {
        if (!st.alive) continue;
        const p = profiles[st.idx];

        // Status upkeep.
        if (st.slow > 0) st.slow--;
        if (st.burn) {
          if (--st.burn.timer <= 0) {
            st.burn.timer = 12;
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
        const lowHp = st.hp / p.maxHp < 0.3;

        // Cooldowns tick down whatever we're doing.
        if (st.atkTimer > 0) st.atkTimer--;
        if (st.abTimer > 0) st.abTimer--;

        // Fire an ability the moment it's up and in range — mid-strafe,
        // mid-retreat, wherever. This is the "walk around and shoot" feel.
        if (st.abTimer <= 0 && castAbility(st.idx, tick)) {
          st.abTimer = 220 + R.int(0, 60);
          // After casting, ranged lineages keep their distance.
          if (['bog', 'ash', 'reef', 'tundra'].includes(p.abilities[0])) {
            st.mode = 'strafe'; st.modeT = R.int(70, 130);
          }
        }
        if (!st.alive) continue;

        // Melee strike: only when committed (seek mode) and in reach.
        if (st.mode === 'seek' && d <= ATTACK_RANGE && st.atkTimer <= 0) {
          st.atkTimer = Math.round(p.atkCd * (st.slow > 0 ? 1.4 : 1));
          const evade = profiles[target.idx].dodge + profiles[target.idx].dazzle;
          events.push({ tick, type: 'lunge', actor: st.idx, target: target.idx });
          if (R.chance(evade)) {
            events.push({ tick, type: 'dodge', actor: st.idx, target: target.idx });
          } else {
            const crit = R.chance(p.crit);
            damage(target.idx, tick, p.dmg * (crit ? 1.6 : 1), st.idx, crit ? 'crit' : 'hit');
            if (R.chance(p.twin)) damage(target.idx, tick, p.dmg * 0.6, st.idx, 'hit');
          }
          // Break off after striking: back out, then circle back in.
          st.mode = 'retreat';
          st.modeT = lowHp ? R.int(60, 110) : R.int(30, 60);
          continue;
        }

        // ---- Movement: circle, kite, close in ----
        const mvBase = p.move * (st.slow > 0 ? 0.6 : 1);
        const ux = (target.x - st.x) / (d || 1);
        const uy = (target.y - st.y) / (d || 1);

        if (st.mode === 'retreat') {
          st.x -= ux * mvBase * 1.05;
          st.y -= uy * mvBase * 1.05;
          if (--st.modeT <= 0 || d > 40) {
            st.mode = 'strafe';
            st.modeT = R.int(50, 120);
            st.orbitR = R.float(18, 28);
            if (R.chance(0.4)) st.orbitDir *= -1;
          }
        } else if (st.mode === 'strafe') {
          // Orbit the target: tangential motion + drift toward the orbit ring.
          const tx = -uy * st.orbitDir, ty = ux * st.orbitDir;
          const radial = (d - st.orbitR) * 0.035; // >0 → drift inward
          st.x += (tx * 0.85 + ux * radial) * mvBase;
          st.y += (ty * 0.85 + uy * radial) * mvBase;
          if (R.chance(0.008)) st.orbitDir *= -1; // feints
          // Commit to an attack run when the swing is ready (hurt fighters
          // hang back longer and rely on abilities).
          if (--st.modeT <= 0 || (st.atkTimer <= 0 && (!lowHp || R.chance(0.02)))) {
            st.mode = 'seek';
          }
        } else { // seek: close the gap
          st.x += ux * mvBase;
          st.y += uy * mvBase;
          // Wounded fighters bail out of long approaches sometimes.
          if (lowHp && d < 18 && R.chance(0.05)) {
            st.mode = 'retreat'; st.modeT = R.int(50, 90);
          }
        }

        // Personal space: don't stack into one blob.
        for (const o of foes) {
          const od = dist(st, o);
          if (od < 8 && od > 0.01) {
            st.x += ((st.x - o.x) / od) * 0.45;
            st.y += ((st.y - o.y) / od) * 0.45;
          }
        }
        st.x = R.clamp(st.x, 5, ARENA - 5);
        st.y = R.clamp(st.y, 5, ARENA - 5);
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

  // Commentary beats for the announcer line.
  EVO.battleCommentary = function (combatants, result, playerId) {
    const name = (i) => (combatants[i].id === playerId ? 'your ' + combatants[i].name : combatants[i].name);
    const lines = [{ frame: 0, text: `🔔 The bell rings at ${EVO.BIOMES[result.biome].name}!` }];
    const firstHit = result.events.find((e) => (e.type === 'hit' || e.type === 'crit' || e.type === 'ability-hit') && e.actor >= 0);
    if (firstHit) lines.push({ frame: firstHit.tick, text: `💢 First blood to ${name(firstHit.actor)}!` });
    const firstCast = result.events.find((e) => e.type === 'ability');
    if (firstCast) lines.push({ frame: firstCast.tick, text: `${firstCast.text} — ${name(firstCast.actor)} opens up!` });
    result.events.filter((e) => e.type === 'sudden').forEach((e) => {
      lines.push({ frame: e.tick, text: '⏰ Sudden death — the crowd wants an ending!' });
    });
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
