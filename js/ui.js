/*
 * ui.js — DOM rendering, navigation, and interaction glue.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const Game = EVO.Game;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Story-mode gating: which feature a tab needs (see EVO.FEATURE_CHAPTER).
  const TAB_FEATURE = { breed: 'breed', battle: 'battle', wilds: 'wilds', codex: 'codex' };

  const UI = (EVO.UI = {
    breedSel: { mom: null, dad: null }, // creature ids
    raceBiome: 'dune',
    raceRacerId: null,

    init() {
      this.cacheEls();
      this.bindTabs();
      this.bindStatic();
      this.applyDevStyles();
      this.renderAll();
    },

    cacheEls() {
      this.el = {
        coins: $('#coins'),
        day: $('#day'),
        views: {
          stable: $('#view-stable'),
          breed: $('#view-breed'),
          race: $('#view-race'),
          battle: $('#view-battle'),
          wilds: $('#view-wilds'),
          codex: $('#view-codex'),
        },
        goals: $('#goals'),
        stableGrid: $('#stable-grid'),
        stableInfo: $('#stable-info'),
        breedPool: $('#breed-pool'),
        momSlot: $('#mom-slot'),
        dadSlot: $('#dad-slot'),
        pressureNote: $('#pressure-note'),
        predictor: $('#predictor'),
        breedBtn: $('#breed-btn'),
        biomePicker: $('#biome-picker'),
        raceRacerGrid: $('#race-racer-grid'),
        track: $('#track'),
        trackWrap: $('#track-wrap'),
        raceBtn: $('#race-btn'),
        raceResults: $('#race-results'),
        explorePanel: $('#explore-panel'),
        marketGrid: $('#market-grid'),
        expandBtn: $('#expand-btn'),
        log: $('#log'),
        codex: $('#codex'),
        traitCodex: $('#trait-codex'),
        achievements: $('#achievements'),
        commentary: $('#commentary'),
        battleBiomePicker: $('#battle-biome-picker'),
        battleChampGrid: $('#battle-champ-grid'),
        battleBtn: $('#battle-btn'),
        arena: $('#arena'),
        arenaWrap: $('#arena-wrap'),
        battleCommentary: $('#battle-commentary'),
        battleResults: $('#battle-results'),
        tourneyBtn: $('#tourney-btn'),
        tourney: $('#tourney'),
        shop: $('#shop'),
        helpBtn: $('#help-btn'),
        modalBack: $('#modal-back'),
        modal: $('#modal'),
        toast: $('#toast'),
      };
    },

    bindTabs() {
      $$('.tab').forEach((t) => {
        t.addEventListener('click', () => this.showTab(t.dataset.tab));
      });
    },

    showTab(name) {
      if (TAB_FEATURE[name] && !EVO.unlocked(TAB_FEATURE[name])) {
        const req = EVO.FEATURE_CHAPTER[TAB_FEATURE[name]];
        const ch = EVO.CHAPTERS[req - 1];
        this.toast(`🔒 Unlocks in Chapter ${req} — ${ch ? ch.title : ''}`);
        return;
      }
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      Object.keys(this.el.views).forEach((k) => {
        this.el.views[k].classList.toggle('active', k === name);
      });
      if (name === 'stable') { this.renderStory(); this.renderGoals(); this.renderStable(); }
      if (name === 'breed') this.renderBreed();
      if (name === 'race') this.renderRace();
      if (name === 'battle') this.renderBattle();
      if (name === 'wilds') this.renderWilds();
      if (name === 'codex') this.renderCodex();
    },

    bindStatic() {
      this.el.breedBtn.addEventListener('click', () => this.doBreed());
      this.el.raceBtn.addEventListener('click', () => this.doRace());
      this.el.battleBtn.addEventListener('click', () => this.doBattle());
      this.el.expandBtn.addEventListener('click', () => {
        const r = Game.expandStable();
        this.toast(r.ok ? 'Stable expanded!' : r.msg);
        this.renderHeader();
        this.renderWilds();
      });
      $('#reset-btn').addEventListener('click', () => {
        if (confirm('Reset all progress and start a new game?')) {
          Game.reset();
          this.breedSel = { mom: null, dad: null };
          this.renderAll();
          this.toast('New game started.');
          this.showChapterBriefing();
        }
      });
      this.el.helpBtn.addEventListener('click', () => this.showChapterBriefing());
      this.el.tourneyBtn.addEventListener('click', () => this.startTournament());
      $('#dev-btn').addEventListener('click', () => this.showDevTweaks());
      this.el.modalBack.addEventListener('click', (e) => {
        if (e.target === this.el.modalBack) this.closeModal();
      });
    },

    renderAll() {
      this.renderHeader();
      this.renderStory();
      this.renderTabLocks();
      this.renderGoals();
      this.renderStable();
      this.renderBreed();
      this.renderRace();
      this.renderBattle();
      this.renderWilds();
      this.renderCodex();
    },

    // Grey out tab-bar entries whose feature hasn't been unlocked yet.
    renderTabLocks() {
      $$('.tab').forEach((t) => {
        const f = TAB_FEATURE[t.dataset.tab];
        t.classList.toggle('locked', !!(f && !EVO.unlocked(f)));
      });
      $('#goals-block').style.display = EVO.unlocked('goals') ? '' : 'none';
      $('#tournament-block').style.display = EVO.unlocked('tournament') ? '' : 'none';
      $('#shop-block').style.display = EVO.unlocked('shop') ? '' : 'none';
    },

    // ---- Story panel -------------------------------------------------------
    renderStory() {
      const box = $('#story');
      if (!box) return;
      const ch = EVO.CHAPTERS[Game.state.chapter - 1];
      if (!ch) { box.innerHTML = ''; return; }
      if (!ch.objectives.length) {
        box.innerHTML = `<div class="story-panel done">
          <div class="story-top"><span class="story-ch">${ch.emoji} Story complete</span></div>
          <div class="story-hint">${ch.hint}</div>
        </div>`;
        return;
      }
      const objs = ch.objectives.map((o) => {
        const done = o.test(Game.state);
        const [cur, max] = o.prog ? o.prog(Game.state) : [done ? 1 : 0, 1];
        return `<div class="story-obj ${done ? 'done' : ''}">
          <span class="story-check">${done ? '✓' : '◻︎'}</span>
          <span class="story-desc">${o.desc}</span>
          <span class="story-prog">${cur}/${max}</span>
        </div>`;
      }).join('');
      box.innerHTML = `<div class="story-panel">
        <div class="story-top">
          <span class="story-ch">${ch.emoji} Chapter ${ch.num}/6 — ${ch.title}</span>
          <button class="story-more" id="story-more">📖</button>
        </div>
        <div class="story-mentor">${EVO.MENTOR.emoji} <i>“${ch.hint}”</i></div>
        ${objs}
      </div>`;
      const more = $('#story-more');
      if (more) more.addEventListener('click', () => this.showChapterBriefing());
    },

    // Run after any action that changes progress: advance the story, then
    // award goals/achievements (once those systems have been unlocked).
    afterAction() {
      const completed = Game.checkChapter();
      if (EVO.unlocked('goals')) {
        const newly = Game.checkGoals();
        if (newly.length) {
          newly.forEach((g, i) => setTimeout(() => this.toast(`🎯 ${g.name}! +${g.reward} coins`), i * 900));
          this.renderGoals();
        }
      }
      this.renderHeader();
      this.renderStory();
      if (completed) {
        // Unlock tabs/sections for the new chapter — but preserve the race
        // track & results (a race often IS what completed the chapter).
        this.renderTabLocks();
        this.renderGoals();
        this.renderStable();
        this.renderBreed();
        this.renderRace(true);
        this.renderBattle(true);
        this.renderWilds();
        this.renderCodex();
        this.showChapterModal(completed);
      }
    },

    renderHeader() {
      this.el.coins.textContent = Game.state.coins;
      this.el.day.textContent = 'Day ' + Game.state.day;
    },

    // ---- Creature card ---------------------------------------------------
    creatureCard(c, opts) {
      opts = opts || {};
      const s = EVO.stats(c);
      const sp = EVO.SPECIES[c.species];
      const adapt = EVO.adaptation(c);
      const div = document.createElement('div');
      div.className = 'ccard' + (opts.selectable ? ' selectable' : '') + (opts.selected ? ' selected' : '');
      div.dataset.id = c.id;

      const adaptCells = EVO.BIOME_KEYS.map((b) => {
        const pct = Math.min(100, adapt[b]);
        return `<div class="adapt-cell" title="${EVO.BIOMES[b].name}: ${adapt[b]}"><span style="width:${pct}%;background:${EVO.BIOMES[b].color}"></span></div>`;
      }).join('');

      const traitBadges = (c.traits || []).map((tk) => {
        const t = EVO.TRAITS[tk];
        return t ? `<span class="trait-badge" title="${t.name}: ${t.blurb}">${t.emoji}</span>` : '';
      }).join('') + (c.tonic ? '<span class="trait-badge" title="Tonic-charged for the next race">🍵</span>' : '');

      div.innerHTML = `
        <span class="sex">${c.sex === 'M' ? '♂' : '♀'}</span>
        <span class="gen">G${c.generation}</span>
        ${traitBadges ? `<span class="trait-row">${traitBadges}</span>` : ''}
        <div class="art">${EVO.creatureSVG(c, 90)}</div>
        <div class="cname">${c.name}</div>
        <div class="cspecies">${sp.emoji} ${sp.name}${sp.tier ? ' • T' + sp.tier : ''}</div>
        <div class="statline">
          <span class="stat">SPD <b>${s.speed}</b></span>
          <span class="stat">STA <b>${s.stamina}</b></span>
          <span class="stat">ACC <b>${s.accel}</b></span>
          <span class="stat">AGI <b>${s.agility}</b></span>
        </div>
        <div class="adapt-row">${adaptCells}</div>
        <div class="rating">★ ${EVO.rating(c)}</div>
      `;
      if (opts.onClick) div.addEventListener('click', () => opts.onClick(c, div));
      else div.addEventListener('click', () => this.openDetail(c));
      return div;
    },

    // ---- Stable ----------------------------------------------------------
    renderStable() {
      const grid = this.el.stableGrid;
      grid.innerHTML = '';
      Game.state.stable.forEach((c) => grid.appendChild(this.creatureCard(c)));
      this.el.stableInfo.textContent = `${Game.state.stable.length} / ${Game.state.stableCap} pens • tap a creature for details`;
      this.renderLog();
    },

    renderLog() {
      const box = this.el.log;
      if (!box) return;
      if (!Game.state.log.length) { box.innerHTML = '<div class="entry">No history yet — go race!</div>'; return; }
      box.innerHTML = Game.state.log
        .map((e) => `<div class="entry"><b>D${e.day}</b> · ${e.msg}</div>`)
        .join('');
    },

    // ---- Goals -----------------------------------------------------------
    renderGoals() {
      const box = this.el.goals;
      if (!box) return;
      const done = Game.state.goalsDone;
      // Show completed at the end; surface the next few active goals first.
      const active = EVO.GOALS.filter((g) => !done[g.key]);
      const complete = EVO.GOALS.filter((g) => done[g.key]);
      const nextUp = active.slice(0, 3);
      let html = '';
      nextUp.forEach((g) => {
        html += `<div class="goal-item">
          <span class="goal-check">◻︎</span>
          <div class="goal-body"><div class="goal-name">${g.name}</div><div class="goal-desc">${g.desc}</div></div>
          <span class="goal-reward">+${g.reward}</span>
        </div>`;
      });
      if (!nextUp.length) html += '<div class="goal-item done"><span class="goal-check">✓</span><div class="goal-body"><div class="goal-name">All goals complete — you\'re a master breeder!</div></div></div>';
      const cCount = complete.length;
      html += `<div class="goal-progress">${cCount}/${EVO.GOALS.length} goals complete</div>`;
      box.innerHTML = html;
    },

    // ---- Breeding --------------------------------------------------------
    renderBreed() {
      // Slots
      this.renderBreedSlot('mom');
      this.renderBreedSlot('dad');
      // Pool = stable creatures, tap to assign to a slot
      const pool = this.el.breedPool;
      pool.innerHTML = '';
      Game.state.stable.forEach((c) => {
        const selected = this.breedSel.mom === c.id || this.breedSel.dad === c.id;
        pool.appendChild(this.creatureCard(c, {
          selectable: true,
          selected,
          onClick: (cr) => this.assignBreed(cr),
        }));
      });
      this.updatePressureNote();
      this.renderPredictor();
      this.updateBreedBtn();
    },

    renderPredictor() {
      const box = this.el.predictor;
      if (!box) return;
      const mom = this.breedSel.mom ? Game.getCreature(this.breedSel.mom) : null;
      const dad = this.breedSel.dad ? Game.getCreature(this.breedSel.dad) : null;
      const valid = mom && dad && mom.sex !== dad.sex && mom.id !== dad.id;
      if (!valid) { box.innerHTML = ''; return; }
      if (!EVO.unlocked('predictor')) {
        box.innerHTML = `<div class="predictor-card teaser">🔮 The Offspring Predictor unlocks in Chapter ${EVO.FEATURE_CHAPTER.predictor} — for now, breed on instinct.</div>`;
        return;
      }
      const p = EVO.predictBreed(mom, dad, 160);
      const labels = { speed: 'SPD', stamina: 'STA', accel: 'ACC', agility: 'AGI' };
      const bars = EVO.STAT_GENES.map((k) => {
        const s = p.stat[k];
        const lo = Math.min(100, s.min), hi = Math.min(100, s.max), avg = Math.min(100, s.avg);
        return `<div class="pred-stat">
          <div class="pred-label">${labels[k]}</div>
          <div class="pred-track">
            <span class="pred-range" style="left:${lo}%;width:${Math.max(2, hi - lo)}%"></span>
            <span class="pred-avg" style="left:${avg}%"></span>
          </div>
          <div class="pred-num">${s.min}–${s.max}</div>
        </div>`;
      }).join('');
      const pct = Math.round(p.evolveChance * 100);
      let evoLine = '';
      if (p.evolveTarget && pct > 0) {
        evoLine = `<div class="pred-evo">✨ ~${pct}% chance to evolve into a <b>${EVO.SPECIES[p.evolveTarget].name}</b></div>`;
      }
      box.innerHTML = `<div class="predictor-card">
        <div class="pred-head">Predicted offspring <span>(160 sims)</span></div>
        ${bars}
        ${evoLine}
      </div>`;
    },

    renderBreedSlot(which) {
      const slot = which === 'mom' ? this.el.momSlot : this.el.dadSlot;
      const id = this.breedSel[which];
      const c = id ? Game.getCreature(id) : null;
      if (!c) {
        slot.className = 'breed-slot';
        slot.innerHTML = `<div class="placeholder">${which === 'mom' ? '♀ Parent A' : '♂ Parent B'}<br>tap a creature below</div>`;
      } else {
        slot.className = 'breed-slot filled';
        slot.innerHTML = `<div class="art">${EVO.creatureSVG(c, 74)}</div><div class="cname">${c.name}</div><div class="cspecies">${c.sex === 'M' ? '♂' : '♀'} ${EVO.SPECIES[c.species].name}</div>`;
      }
    },

    assignBreed(c) {
      // If already assigned, unassign.
      if (this.breedSel.mom === c.id) { this.breedSel.mom = null; this.renderBreed(); return; }
      if (this.breedSel.dad === c.id) { this.breedSel.dad = null; this.renderBreed(); return; }
      // Assign to the slot matching its sex if free, else the other.
      const wantMom = c.sex === 'F';
      if (wantMom && !this.breedSel.mom) this.breedSel.mom = c.id;
      else if (!wantMom && !this.breedSel.dad) this.breedSel.dad = c.id;
      else if (!this.breedSel.mom) this.breedSel.mom = c.id;
      else if (!this.breedSel.dad) this.breedSel.dad = c.id;
      else { this.breedSel.dad = c.id; } // replace
      this.renderBreed();
    },

    updatePressureNote() {
      const note = this.el.pressureNote;
      const mom = this.breedSel.mom ? Game.getCreature(this.breedSel.mom) : null;
      const dad = this.breedSel.dad ? Game.getCreature(this.breedSel.dad) : null;
      if (!mom || !dad) {
        note.innerHTML = 'Select two parents. <b>Where they have raced</b> steers which biome their offspring adapt toward — and may trigger a metamorphosis.';
        return;
      }
      // Hybrid potential: two different tier-1 specialists can fuse lineages.
      const momSp = EVO.SPECIES[mom.species], dadSp = EVO.SPECIES[dad.species];
      if (momSp.tier === 1 && dadSp.tier === 1 && momSp.biome !== dadSp.biome) {
        const key = [momSp.biome, dadSp.biome].sort().join('|');
        const hy = EVO.SPECIES[EVO.HYBRIDS[key] || 'chimerax'];
        note.innerHTML = `⚡ <b>Hybrid potential!</b> A ${momSp.name} × ${dadSp.name} cross adapted to <b>both</b> ${EVO.BIOMES[momSp.biome].name} and ${EVO.BIOMES[dadSp.biome].name} can fuse into a <b>${hy.name}</b> — a cross-biome apex form.`;
        return;
      }
      const pressure = EVO.combinedPressure(mom, dad);
      if (!pressure) {
        note.innerHTML = 'Neither parent has raced yet, so there is <b>no evolutionary pressure</b>. Offspring will be a genetic blend. Race them first to direct their evolution!';
      } else {
        const b = EVO.BIOMES[pressure];
        // Preview evolution potential
        const baseSp = EVO.SPECIES[mom.species].tier <= EVO.SPECIES[dad.species].tier ? mom.species : dad.species;
        const next = (EVO.EVOLVE_NEXT[baseSp] || {})[pressure];
        let extra = '';
        if (next) extra = ` If adaptation is high enough, offspring may evolve into a <b>${EVO.SPECIES[next].name}</b>.`;
        note.innerHTML = `Evolutionary pressure: <b>${b.emoji} ${b.name}</b>. Offspring adaptation will be pushed toward this biome.${extra}`;
      }
    },

    updateBreedBtn() {
      const btn = this.el.breedBtn;
      const check = (this.breedSel.mom && this.breedSel.dad)
        ? Game.canBreed(this.breedSel.mom, this.breedSel.dad)
        : { ok: false, msg: 'Pick two parents' };
      btn.disabled = !check.ok;
      btn.textContent = check.ok ? `Breed (−${EVO.devCost(EVO.BREED_COST)} coins)` : check.msg;
    },

    doBreed() {
      const r = Game.breed(this.breedSel.mom, this.breedSel.dad);
      if (!r.ok) { this.toast(r.msg); return; }
      this.breedSel = { mom: null, dad: null };
      this.showOffspring(r.child, r.evolved);
      this.renderBreed();
      this.renderStable();
      this.renderCodex();
      this.afterAction();
    },

    showOffspring(child, evolved) {
      const sp = EVO.SPECIES[child.species];
      const s = EVO.stats(child);
      const traitLine = (child.traits || []).length
        ? `<p style="text-align:center;color:var(--accent)">${child.traits.map((tk) => EVO.TRAITS[tk].emoji + ' ' + EVO.TRAITS[tk].name).join(' · ')}</p>` : '';
      this.openModalHTML(`
        <h2 style="text-align:center">${evolved ? '✨ Metamorphosis! ✨' : 'A new hatchling!'}</h2>
        <div class="big-art">${EVO.creatureSVG(child, 150)}</div>
        <h3 style="text-align:center;margin-bottom:2px">${child.name}</h3>
        <p style="text-align:center;color:var(--muted);margin-top:0">${sp.emoji} ${sp.name} • Gen ${child.generation}</p>
        ${evolved ? `<p style="text-align:center;color:var(--accent2)">${sp.blurb}</p>` : ''}
        ${traitLine}
        <div class="detail-grid">
          <div class="box"><div class="k">Speed</div><div class="v">${s.speed}</div></div>
          <div class="box"><div class="k">Stamina</div><div class="v">${s.stamina}</div></div>
          <div class="box"><div class="k">Accel</div><div class="v">${s.accel}</div></div>
          <div class="box"><div class="k">Agility</div><div class="v">${s.agility}</div></div>
        </div>
        <button class="btn primary block" onclick="EVO.UI.closeModal()">Nice!</button>
      `);
    },

    // ---- Race ------------------------------------------------------------
    renderRace(preserveResults) {
      // If the story locked our current selection (e.g. after a reset), fall back.
      if (!EVO.unlocked('biome_' + this.raceBiome)) this.raceBiome = 'dune';
      // Biome picker (locked biomes tease their unlock chapter)
      const bp = this.el.biomePicker;
      bp.innerHTML = '';
      EVO.BIOME_KEYS.forEach((k) => {
        const b = EVO.BIOMES[k];
        const open = EVO.unlocked('biome_' + k);
        const card = document.createElement('button');
        card.className = 'biome-card' + (this.raceBiome === k ? ' selected' : '') + (open ? '' : ' locked');
        card.style.setProperty('--biome', b.color);
        if (open) {
          card.innerHTML = `<div class="bemoji">${b.emoji}</div><div class="bname">${b.name}</div><div class="bblurb">${b.blurb}</div>`;
          card.addEventListener('click', () => { this.raceBiome = k; this.renderRace(); });
        } else {
          const req = EVO.FEATURE_CHAPTER['biome_' + k];
          card.innerHTML = `<div class="bemoji">🔒</div><div class="bname">???</div><div class="bblurb">Unlocks in Chapter ${req}</div>`;
          card.addEventListener('click', () => this.toast(`🔒 A new land opens in Chapter ${req}.`));
        }
        bp.appendChild(card);
      });
      // Theme the track panel to the selected biome.
      if (this.el.trackWrap) this.el.trackWrap.className = 'track-wrap biome-' + this.raceBiome;

      // Racer picker (choose which of your creatures competes)
      const grid = this.el.raceRacerGrid;
      grid.innerHTML = '';
      if (!this.raceRacerId || !Game.getCreature(this.raceRacerId) ||
          !Game.state.stable.find((c) => c.id === this.raceRacerId)) {
        this.raceRacerId = Game.state.stable[0] ? Game.state.stable[0].id : null;
      }
      Game.state.stable.forEach((c) => {
        grid.appendChild(this.creatureCard(c, {
          selectable: true,
          selected: this.raceRacerId === c.id,
          onClick: (cr) => { this.raceRacerId = cr.id; this.renderRace(); },
        }));
      });

      const entry = EVO.devCost(EVO.RACE_ENTRY);
      this.el.raceBtn.disabled = !this.raceRacerId || Game.state.coins < entry;
      this.el.raceBtn.textContent = Game.state.coins < entry
        ? 'Need coins to enter' : `Enter Race (−${entry} coins)`;
      if (!preserveResults) {
        this.el.raceResults.innerHTML = '';
        this.el.track.innerHTML = '';
        this.el.commentary.textContent = '';
        this.el.commentary.classList.remove('banner');
      }
      this.el.tourneyBtn.textContent = `🏆 Enter the Season ${Game.seasonNumber()} Cup (−${EVO.devCost(EVO.TOURNAMENT.entry)} coins)`;
      this.el.tourneyBtn.disabled = Game.state.coins < EVO.devCost(EVO.TOURNAMENT.entry);
      if (!this._tourney) this.el.tourney.innerHTML = '';
    },

    // ---- Tournament -------------------------------------------------------
    startTournament() {
      if (this._racing || this._tourney) return;
      const check = Game.canTournament(this.raceRacerId);
      if (!check.ok) { this.toast(check.msg); return; }
      Game.payTournamentEntry();
      this.renderHeader();

      const playerId = this.raceRacerId;
      const biome = this.raceBiome;
      const player = Game.getCreature(playerId);
      const q = EVO.rivalQuality(player, Game.state.day, 0.08);
      const rivals = [];
      for (let i = 0; i < 7; i++) rivals.push(EVO.makeRival(q, biome));

      this._tourney = {
        playerId, biome,
        semiA: [player, rivals[0], rivals[1], rivals[2]],
        semiB: [rivals[3], rivals[4], rivals[5], rivals[6]],
        finalists: [],
        semiBOrder: null,
      };
      this.renderBracket('Semifinal A — your heat. Top 2 advance!');
      this.runTournamentHeat();
    },

    runTournamentHeat() {
      const T = this._tourney;
      this._racing = true;
      const result = EVO.simulateRace(T.semiA, T.biome);
      this.animateRace(T.semiA, result, () => {
        this._racing = false;
        const byId = {}; T.semiA.forEach((c) => (byId[c.id] = c));
        const placed = result.order.map((id) => byId[id]);
        T.semiAOrder = placed;
        // Simulate the other heat instantly.
        const resB = EVO.simulateRace(T.semiB, T.biome);
        const byIdB = {}; T.semiB.forEach((c) => (byIdB[c.id] = c));
        T.semiBOrder = resB.order.map((id) => byIdB[id]);
        T.finalists = [placed[0], placed[1], T.semiBOrder[0], T.semiBOrder[1]];
        const advanced = placed[0].id === T.playerId || placed[1].id === T.playerId;

        if (advanced) {
          this.renderBracket('You advanced! The final awaits.', true);
        } else {
          // Eliminated: resolve the final without the player.
          const resF = EVO.simulateRace(T.finalists, T.biome);
          const byIdF = {}; T.finalists.forEach((c) => (byIdF[c.id] = c));
          T.finalOrder = resF.order.map((id) => byIdF[id]);
          const rec = Game.recordTournament('out', T.playerId, T.biome);
          this.renderHeader();
          this.renderBracket(`Knocked out in the semis. ${T.finalOrder[0].name} took the cup. +${rec.prize} consolation.`);
          this._tourney = null;
          this.renderStable();
          this.afterAction();
        }
      }, T.playerId);
    },

    runTournamentFinal() {
      const T = this._tourney;
      if (!T || this._racing) return;
      this._racing = true;
      const result = EVO.simulateRace(T.finalists, T.biome);
      this.animateRace(T.finalists, result, () => {
        this._racing = false;
        const byId = {}; T.finalists.forEach((c) => (byId[c.id] = c));
        T.finalOrder = result.order.map((id) => byId[id]);
        const place = result.order.indexOf(T.playerId) + 1;
        const rec = Game.recordTournament(place, T.playerId, T.biome);
        this.renderHeader();
        const msg = place === 1
          ? `🏆 CHAMPION! ${byId[T.playerId].name} wins the Season ${Game.seasonNumber()} Cup! +${rec.prize} coins.`
          : `Final result: #${place}. +${rec.prize} coins.`;
        this.renderBracket(msg);
        this._tourney = null;
        this.renderStable();
        this.renderCodex();
        this.afterAction();
      }, T.playerId);
    },

    renderBracket(statusMsg, showFinalBtn) {
      const T = this._tourney;
      const box = this.el.tourney;
      const you = (c) => c && T && c.id === T.playerId;
      const heat = (title, list, order) => {
        const rows = (order || list).map((c, i) => `
          <div class="bk-row ${you(c) ? 'you' : ''} ${order && i < 2 ? 'adv' : ''}">
            <span>${order ? (i + 1) + '.' : '•'}</span> ${you(c) ? '<b>' + c.name + '</b>' : c.name}
            ${order && i < 2 ? '<span class="bk-tag">▲</span>' : ''}
          </div>`).join('');
        return `<div class="bk-heat"><div class="bk-title">${title}</div>${rows}</div>`;
      };
      let html = `<div class="bracket"><div class="bk-status">${statusMsg}</div><div class="bk-heats">`;
      if (T) {
        html += heat('Semifinal A', T.semiA, T.semiAOrder);
        html += heat('Semifinal B', T.semiB, T.semiBOrder);
        if (T.finalOrder) html += heat('Final', T.finalists, T.finalOrder);
        html += '</div>';
        if (showFinalBtn) html += '<button class="btn gold block" id="final-btn" style="margin-top:10px">🏁 Race the Final</button>';
      } else {
        html += '</div>';
      }
      html += '</div>';
      box.innerHTML = html;
      const fb = $('#final-btn');
      if (fb) fb.addEventListener('click', () => this.runTournamentFinal());
    },

    buildField(playerId, count, qualityBoost) {
      // Player racer + AI rivals rubber-banded to the entrant's rating.
      const player = Game.getCreature(playerId);
      const field = [player];
      const q = EVO.rivalQuality(player, Game.state.day, qualityBoost || 0);
      for (let i = 0; i < (count || 4); i++) {
        field.push(EVO.makeRival(q, this.raceBiome));
      }
      return field;
    },

    doRace() {
      if (this._racing) return;
      if (this._tourney) { this.toast('Finish the tournament first!'); return; }
      const entryFee = EVO.devCost(EVO.RACE_ENTRY);
      if (Game.state.coins < entryFee) { this.toast('Not enough coins.'); return; }
      Game.state.coins -= entryFee;
      this.renderHeader();

      // Snapshot the entrant & biome now — the player can tap around during
      // the animation, and results must record against the creature that ran.
      const playerId = this.raceRacerId;
      const biome = this.raceBiome;
      this._racing = true;
      const field = this.buildField(playerId);
      const result = EVO.simulateRace(field, biome);
      this.animateRace(field, result, () => {
        this._racing = false;
        const rec = Game.recordRace(result, playerId, biome, entryFee);
        this.renderHeader();
        this.showResults(field, result, rec, playerId);
        this.renderStable();
        this.renderCodex();
        this.afterAction();
        // Note: don't call renderRace() here — it would clear the track &
        // results we just rendered. showResults() already syncs the button.
      }, playerId);
    },

    // opts: {startFrac, speed, banner, silent} — used by photo-finish replays.
    animateRace(field, result, done, playerId, opts) {
      opts = opts || {};
      const track = this.el.track;
      track.innerHTML = '';
      if (!opts.silent) this.el.raceResults.innerHTML = '';
      this.el.raceBtn.disabled = true;

      const commentaryBox = this.el.commentary;
      const events = opts.silent ? [] : EVO.raceCommentary(field, result, playerId);
      let nextEvent = 0;
      commentaryBox.textContent = opts.banner || '';
      commentaryBox.classList.toggle('banner', !!opts.banner);

      const lanes = field.map((c, i) => {
        const lane = document.createElement('div');
        lane.className = 'lane';
        const isPlayer = c.id === playerId;
        lane.innerHTML = `<div class="lname">${isPlayer ? '▶ ' : ''}${c.name}</div><div class="finish"></div>`;
        const racer = document.createElement('div');
        racer.className = 'racer' + (isPlayer ? ' player' : '');
        racer.innerHTML = EVO.creatureSVG(c, 40);
        lane.appendChild(racer);
        track.appendChild(lane);
        return racer;
      });

      const frames = result.frames;
      const total = frames.length;
      let f = opts.startFrac ? Math.floor(total * opts.startFrac) : 0;
      const speedup = opts.speed || (EVO.DEV.fastRaces ? 5 : 2); // frames per tick
      const step = () => {
        const fi = Math.min(Math.floor(f), total - 1);
        const row = frames[fi];
        for (let i = 0; i < lanes.length; i++) {
          const laneW = lanes[i].parentElement.clientWidth - 44;
          lanes[i].style.transform = `translate(${row[i] * laneW}px, -50%)`;
        }
        while (nextEvent < events.length && events[nextEvent].frame <= fi) {
          commentaryBox.textContent = events[nextEvent].text;
          commentaryBox.classList.remove('pop');
          void commentaryBox.offsetWidth; // restart the pop animation
          commentaryBox.classList.add('pop');
          nextEvent++;
        }
        f += speedup;
        if (f < total) {
          requestAnimationFrame(step);
        } else {
          setTimeout(done, 350);
        }
      };
      requestAnimationFrame(step);
    },

    // Slow-motion replay of the final stretch, with a photo-finish banner.
    replayFinish(field, result, playerId) {
      if (this._racing) return;
      this._racing = true;
      this.animateRace(field, result, () => {
        this._racing = false;
        this.el.commentary.textContent = '📸 What a finish!';
        this.el.raceBtn.disabled = Game.state.coins < EVO.devCost(EVO.RACE_ENTRY);
      }, playerId, { startFrac: 0.78, speed: 0.55, banner: '📸 PHOTO FINISH — SLOW-MOTION REPLAY', silent: true });
    },

    showResults(field, result, rec, playerId) {
      const box = this.el.raceResults;
      const byId = {};
      field.forEach((c) => (byId[c.id] = c));
      let html = '<div class="section-title">Results</div>';
      if (result.photoFinish) {
        html += '<div class="photo-banner">📸 PHOTO FINISH!</div>';
      }
      result.order.forEach((id, pos) => {
        const c = byId[id];
        const you = id === playerId;
        const prize = EVO.racePrize(pos, EVO.devCost(EVO.RACE_ENTRY));
        html += `<div class="result-row ${you ? 'you' : ''}">
          <span class="place">${['🥇','🥈','🥉'][pos] || (pos + 1)}</span>
          <span class="rname">${you ? '<b>' + c.name + ' (you)</b>' : c.name}</span>
          ${prize ? `<span class="prize">+${prize}</span>` : ''}
        </div>`;
      });
      if (result.photoFinish) {
        html += '<button class="btn block sm" id="replay-btn">📸 Watch photo-finish replay</button>';
      }
      if (rec.pos === 0) html += '<p class="hint" style="text-align:center">🏆 Victory! Race this lineage in the same biome, then breed to push its evolution.</p>';
      this.el.track.parentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.innerHTML = html;
      const rp = $('#replay-btn');
      if (rp) rp.addEventListener('click', () => this.replayFinish(field, result, playerId));
      this.el.raceBtn.disabled = Game.state.coins < EVO.devCost(EVO.RACE_ENTRY);
    },

    // ---- Battle Arena ------------------------------------------------------
    renderBattle(preserveResults) {
      if (!this.battleBiome || !EVO.unlocked('biome_' + this.battleBiome)) this.battleBiome = 'dune';
      const bp = this.el.battleBiomePicker;
      bp.innerHTML = '';
      EVO.BIOME_KEYS.forEach((k) => {
        const b = EVO.BIOMES[k];
        const open = EVO.unlocked('biome_' + k);
        const card = document.createElement('button');
        card.className = 'biome-card' + (this.battleBiome === k ? ' selected' : '') + (open ? '' : ' locked');
        card.style.setProperty('--biome', b.color);
        if (open) {
          card.innerHTML = `<div class="bemoji">${b.emoji}</div><div class="bname">${b.name}</div><div class="bblurb">${b.blurb}</div>`;
          card.addEventListener('click', () => { this.battleBiome = k; this.renderBattle(); });
        } else {
          const req = EVO.FEATURE_CHAPTER['biome_' + k];
          card.innerHTML = `<div class="bemoji">🔒</div><div class="bname">???</div><div class="bblurb">Unlocks in Chapter ${req}</div>`;
          card.addEventListener('click', () => this.toast(`🔒 A new land opens in Chapter ${req}.`));
        }
        bp.appendChild(card);
      });

      const grid = this.el.battleChampGrid;
      grid.innerHTML = '';
      if (!this.battleChampId || !Game.state.stable.find((c) => c.id === this.battleChampId)) {
        this.battleChampId = Game.state.stable[0] ? Game.state.stable[0].id : null;
      }
      Game.state.stable.forEach((c) => {
        grid.appendChild(this.creatureCard(c, {
          selectable: true,
          selected: this.battleChampId === c.id,
          onClick: (cr) => { this.battleChampId = cr.id; this.renderBattle(); },
        }));
      });

      const entry = EVO.devCost(EVO.RACE_ENTRY);
      this.el.battleBtn.disabled = !this.battleChampId || Game.state.coins < entry;
      this.el.battleBtn.textContent = Game.state.coins < entry
        ? 'Need coins to enter' : `⚔️ Enter Brawl (−${entry} coins)`;
      if (!preserveResults) {
        this.el.battleResults.innerHTML = '';
        this.el.arena.innerHTML = '';
        this.el.battleCommentary.textContent = '';
      }
      this.el.arenaWrap.className = 'arena-wrap biome-' + this.battleBiome;
    },

    doBattle() {
      if (this._fighting || this._racing) return;
      const entryFee = EVO.devCost(EVO.RACE_ENTRY);
      if (Game.state.coins < entryFee) { this.toast('Not enough coins.'); return; }
      Game.state.coins -= entryFee;
      this.renderHeader();

      const playerId = this.battleChampId;
      const biome = this.battleBiome;
      const player = Game.getCreature(playerId);
      this._fighting = true;
      const q = EVO.rivalQuality(player, Game.state.day, 0.02);
      const field = [player];
      for (let i = 0; i < 3; i++) {
        const rival = EVO.makeRival(q, biome);
        // Arena rivals are often evolved brawlers, so enemy abilities fly
        // too — and the arena showcases what evolution buys you.
        if (EVO.R.chance(0.6)) {
          const b = EVO.R.chance(0.6) ? biome : EVO.R.pick(EVO.BIOME_KEYS.filter((k) => EVO.unlocked('biome_' + k)));
          rival.species = EVO.EVOLVE_NEXT.grubling[b];
        }
        field.push(rival);
      }
      const result = EVO.simulateBattle(field, biome);
      this.animateBattle(field, result, playerId, () => {
        this._fighting = false;
        const rec = Game.recordBattle(result, playerId, biome, entryFee);
        this.renderHeader();
        this.showBattleResults(field, result, rec, playerId);
        this.renderStable();
        this.afterAction();
      });
    },

    animateBattle(field, result, playerId, done) {
      const arena = this.el.arena;
      arena.innerHTML = '';
      this.el.battleResults.innerHTML = '';
      this.el.battleBtn.disabled = true;

      const commentary = this.el.battleCommentary;
      const lines = EVO.battleCommentary(field, result, playerId);
      let nextLine = 0;

      // Build one sprite (art + hp bar + name) per combatant.
      const sprites = field.map((c, i) => {
        const el = document.createElement('div');
        el.className = 'battler' + (c.id === playerId ? ' player' : '');
        el.innerHTML = `
          <div class="b-hpbar"><span style="width:100%"></span></div>
          <div class="b-art">${EVO.creatureSVG(c, 48)}</div>
          <div class="b-name">${c.id === playerId ? '▶ ' : ''}${c.name}</div>`;
        arena.appendChild(el);
        return { el, hp: el.querySelector('.b-hpbar span'), maxHp: result.maxHps[i], ko: false };
      });

      const floatText = (x, y, text, cls) => {
        const f = document.createElement('div');
        f.className = 'dmg-float ' + (cls || '');
        f.textContent = text;
        f.style.left = x + '%';
        f.style.top = y + '%';
        arena.appendChild(f);
        setTimeout(() => f.remove(), 900);
      };

      const frames = result.frames;
      const total = frames.length;
      const events = result.events;
      let nextEvent = 0;
      let f = 0;
      const speedup = EVO.DEV.fastRaces ? 5 : 2;
      const shots = []; // projectiles in flight: {el, targetIdx, arriveFi, x, y}

      const step = () => {
        const fi = Math.min(Math.floor(f), total - 1);
        const row = frames[fi];
        for (let i = 0; i < sprites.length; i++) {
          const s = row[i], sp = sprites[i];
          sp.el.style.left = s.x + '%';
          sp.el.style.top = s.y + '%';
          sp.hp.style.width = Math.max(0, (s.hp / sp.maxHp) * 100) + '%';
          sp.hp.parentElement.classList.toggle('low', s.hp / sp.maxHp < 0.3);
          if (!s.alive && !sp.ko) { sp.ko = true; sp.el.classList.add('ko'); }
        }
        // Home in-flight projectiles onto their (moving) targets.
        for (let s = shots.length - 1; s >= 0; s--) {
          const sh = shots[s];
          const t = row[sh.targetIdx];
          const remain = Math.max(1, (sh.arriveFi - fi) / speedup); // rAF steps left
          sh.x += (t.x - sh.x) / remain;
          sh.y += (t.y - sh.y) / remain;
          sh.el.style.left = sh.x + '%';
          sh.el.style.top = sh.y + '%';
          if (fi >= sh.arriveFi) {
            floatText(t.x, t.y, '✸', 'impact');
            sh.el.remove();
            shots.splice(s, 1);
          }
        }
        while (nextEvent < events.length && events[nextEvent].tick <= fi) {
          const e = events[nextEvent++];
          const pos = row[e.target] || row[e.actor] || { x: 50, y: 50 };
          if (e.type === 'hit' || e.type === 'crit' || e.type === 'ability-hit' || e.type === 'burn') {
            floatText(pos.x, pos.y - 8, '−' + e.amount, e.type === 'crit' ? 'crit' : (e.type === 'burn' ? 'burn' : ''));
            if (e.type === 'crit') floatText(pos.x, pos.y - 16, 'CRIT!', 'crit');
          } else if (e.type === 'heal') {
            floatText(pos.x, pos.y - 8, '+' + e.amount, 'heal');
          } else if (e.type === 'dodge') {
            floatText(pos.x, pos.y - 8, 'miss', 'miss');
          } else if (e.type === 'lunge') {
            // Quick pounce pulse on the attacker.
            const ael = sprites[e.actor].el;
            ael.classList.remove('lunging');
            void ael.offsetWidth;
            ael.classList.add('lunging');
          } else if (e.type === 'projectile') {
            const el = document.createElement('div');
            el.className = 'projectile';
            el.textContent = e.emoji;
            el.style.left = e.from.x + '%';
            el.style.top = e.from.y + '%';
            arena.appendChild(el);
            shots.push({ el, targetIdx: e.target, arriveFi: e.arrive, x: e.from.x, y: e.from.y });
          } else if (e.type === 'nova') {
            const apos = row[e.actor] || { x: 50, y: 50 };
            const ring = document.createElement('div');
            ring.className = 'nova-ring';
            ring.style.left = apos.x + '%';
            ring.style.top = apos.y + '%';
            arena.appendChild(ring);
            setTimeout(() => ring.remove(), 800);
          } else if (e.type === 'ability') {
            const apos = row[e.actor] || { x: 50, y: 50 };
            floatText(apos.x, apos.y - 14, e.text, 'ability');
          }
        }
        while (nextLine < lines.length && lines[nextLine].frame <= fi) {
          commentary.textContent = lines[nextLine].text;
          commentary.classList.remove('pop');
          void commentary.offsetWidth;
          commentary.classList.add('pop');
          nextLine++;
        }
        f += speedup;
        if (f < total) requestAnimationFrame(step);
        else setTimeout(done, 500);
      };
      requestAnimationFrame(step);
    },

    showBattleResults(field, result, rec, playerId) {
      const byId = {};
      field.forEach((c) => (byId[c.id] = c));
      let html = '<div class="section-title">Brawl results</div>';
      result.order.forEach((id, pos) => {
        const c = byId[id];
        const you = id === playerId;
        const prize = EVO.battlePrize(pos, EVO.devCost(EVO.RACE_ENTRY));
        const abilities = EVO.abilitiesFor(c).map((k) => EVO.ABILITIES[k].emoji).join('');
        html += `<div class="result-row ${you ? 'you' : ''}">
          <span class="place">${pos === 0 ? '👑' : ['', '🥈', '🥉'][pos] || (pos + 1)}</span>
          <span class="rname">${you ? '<b>' + c.name + ' (you)</b>' : c.name} ${abilities}</span>
          ${prize ? `<span class="prize">+${prize}</span>` : ''}
        </div>`;
      });
      if (rec.pos === 0) {
        html += '<p class="hint" style="text-align:center">👑 Last one standing! Brawling here builds this biome\'s exposure — breed the victor to push its evolution.</p>';
      }
      this.el.battleResults.innerHTML = html;
      this.el.battleCommentary.textContent = rec.pos === 0
        ? `👑 ${byId[playerId].name} wins the brawl!`
        : `Winner: ${byId[result.winnerId].name}`;
      this.el.battleBtn.disabled = Game.state.coins < EVO.devCost(EVO.RACE_ENTRY);
      this.el.arenaWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    // ---- Wilds (Expeditions + Shop + Market) ------------------------------
    renderWilds() {
      this.renderExplore();
      this.renderShop();
      this.renderMarket();
    },

    renderShop() {
      const box = this.el.shop;
      if (!box) return;
      box.innerHTML = EVO.ITEM_KEYS.map((k) => {
        const it = EVO.ITEMS[k];
        const owned = Game.state.items[k] || 0;
        const afford = Game.state.coins >= it.cost;
        return `<div class="shop-item">
          <div class="shop-emoji">${it.emoji}</div>
          <div class="shop-body">
            <div class="shop-name">${it.name} ${owned ? `<span class="shop-owned">×${owned}</span>` : ''}</div>
            <div class="shop-blurb">${it.blurb}</div>
          </div>
          <button class="btn sm gold" data-item="${k}" ${afford ? '' : 'disabled'}>🪙 ${it.cost}</button>
        </div>`;
      }).join('');
      $$('[data-item]', box).forEach((b) => b.addEventListener('click', () => {
        const r = Game.buyItem(b.dataset.item);
        this.toast(r.ok ? `${EVO.ITEMS[b.dataset.item].name} added to your kit.` : r.msg);
        this.renderHeader();
        this.renderShop();
        this.afterAction();
      }));
    },

    renderExplore() {
      const box = this.el.explorePanel;
      if (!box) return;
      // Ensure a valid selected explorer.
      if (!this.exploreId || !Game.state.stable.find((c) => c.id === this.exploreId)) {
        this.exploreId = Game.state.stable[0] ? Game.state.stable[0].id : null;
      }
      if (!this.exploreBiome || !EVO.unlocked('biome_' + this.exploreBiome)) this.exploreBiome = 'dune';

      const biomeBtns = EVO.BIOME_KEYS.filter((k) => EVO.unlocked('biome_' + k)).map((k) => {
        const b = EVO.BIOMES[k];
        return `<button class="xbiome ${this.exploreBiome === k ? 'sel' : ''}" data-biome="${k}" style="--biome:${b.color}">
          <span class="xb-emoji">${b.emoji}</span><span class="xb-name">${b.name.split(' ')[0]}</span></button>`;
      }).join('');

      const explorer = this.exploreId ? Game.getCreature(this.exploreId) : null;
      const explorerCards = Game.state.stable.map((c) =>
        `<button class="xcreature ${this.exploreId === c.id ? 'sel' : ''}" data-cid="${c.id}">
           <div class="xc-art">${EVO.creatureSVG(c, 46)}</div><div class="xc-name">${c.name}</div>
         </button>`).join('');

      const kinds = Object.keys(EVO.EXPEDITIONS).map((kk) => {
        const k = EVO.EXPEDITIONS[kk];
        const fee = EVO.devCost(k.cost);
        const afford = Game.state.coins >= fee;
        return `<button class="xkind btn ${afford ? '' : 'disabled-look'}" data-kind="${kk}" ${afford ? '' : 'disabled'}>
          <div class="xk-name">${k.name}</div>
          <div class="xk-meta">🪙${fee} · ${k.days}d · ${Math.round(k.rareChance * 100)}% rare</div>
        </button>`;
      }).join('');

      box.innerHTML = `
        <div class="explore-card">
          <div class="xrow-label">Where to?</div>
          <div class="xbiomes">${biomeBtns}</div>
          <div class="xrow-label">Send which creature?</div>
          <div class="xcreatures">${explorerCards}</div>
          <div class="xrow-label">Expedition length</div>
          <div class="xkinds">${kinds}</div>
        </div>`;

      $$('.xbiome', box).forEach((b) => b.addEventListener('click', () => { this.exploreBiome = b.dataset.biome; this.renderExplore(); }));
      $$('.xcreature', box).forEach((b) => b.addEventListener('click', () => { this.exploreId = b.dataset.cid; this.renderExplore(); }));
      $$('.xkind', box).forEach((b) => b.addEventListener('click', () => this.doExplore(b.dataset.kind)));
    },

    doExplore(kindKey) {
      const r = Game.explore(this.exploreId, this.exploreBiome, kindKey);
      if (!r.ok) { this.toast(r.msg); return; }
      this.renderHeader();
      this.showExploreResult(r.finds);
      this.renderStable();
      this.renderCodex();
      this.afterAction();
    },

    showExploreResult(finds) {
      const b = EVO.BIOMES[this.exploreBiome];
      let inner = `<h2 style="text-align:center">${b.emoji} Expedition report</h2>
        <p style="text-align:center;color:var(--accent);font-weight:700">+${finds.coins} coins</p>`;
      if (finds.trait) {
        const t = EVO.TRAITS[finds.trait];
        inner += `<div class="pressure-note" style="border-left-color:var(--accent)"><b>${t.emoji} ${t.name}</b> — ${t.blurb} The explorer now carries this trait.</div>`;
      }
      if (finds.egg) {
        const egg = finds.egg;
        const s = EVO.stats(egg);
        const full = Game.state.stable.length >= Game.state.stableCap;
        inner += `
          <div class="section-title" style="text-align:center">A wild egg hatched!</div>
          <div class="big-art">${EVO.creatureSVG(egg, 130)}</div>
          <h3 style="text-align:center;margin:0">${egg.name}</h3>
          <p style="text-align:center;color:var(--muted);margin-top:2px">${egg.sex === 'M' ? '♂' : '♀'} ${EVO.SPECIES[egg.species].name} · best in ${b.name}</p>
          <div class="detail-grid">
            <div class="box"><div class="k">Speed</div><div class="v">${s.speed}</div></div>
            <div class="box"><div class="k">Stamina</div><div class="v">${s.stamina}</div></div>
            <div class="box"><div class="k">Accel</div><div class="v">${s.accel}</div></div>
            <div class="box"><div class="k">Agility</div><div class="v">${s.agility}</div></div>
          </div>
          <div class="btnrow">
            <button class="btn ghost sm block" id="egg-release">Release</button>
            <button class="btn primary block" id="egg-keep" ${full ? 'disabled' : ''}>${full ? 'Stable full' : 'Keep in stable'}</button>
          </div>`;
      } else {
        inner += `<button class="btn primary block" onclick="EVO.UI.closeModal()">Onward!</button>`;
      }
      this.openModalHTML(inner);
      const keep = $('#egg-keep'); const rel = $('#egg-release');
      if (keep) keep.addEventListener('click', () => {
        const res = Game.keepEgg(finds.egg);
        this.toast(res.ok ? `${finds.egg.name} joined your stable!` : res.msg);
        if (res.ok) { this.closeModal(); this.renderStable(); this.renderCodex(); this.renderExplore(); this.afterAction(); }
      });
      if (rel) rel.addEventListener('click', () => this.closeModal());
    },

    // ---- Market ----------------------------------------------------------
    renderMarket() {
      const grid = this.el.marketGrid;
      grid.innerHTML = '';
      if (!Game.state.market.length) {
        grid.innerHTML = '<div class="empty">Market restocks every couple of days.</div>';
      }
      Game.state.market.forEach((c) => {
        const card = this.creatureCard(c, { onClick: (cr) => this.openMarketDetail(cr) });
        const priceTag = document.createElement('div');
        priceTag.className = 'rating';
        priceTag.style.color = 'var(--accent)';
        priceTag.textContent = '🪙 ' + c.price;
        card.appendChild(priceTag);
        grid.appendChild(card);
      });
      this.el.expandBtn.textContent = `Expand stable (+2 pens) · 🪙 ${Game.expandCost()}`;
      this.el.expandBtn.disabled = Game.state.coins < Game.expandCost();
    },

    openMarketDetail(c) {
      const s = EVO.stats(c);
      const canAfford = Game.state.coins >= c.price;
      const full = Game.state.stable.length >= Game.state.stableCap;
      this.openModalHTML(`
        <div class="big-art">${EVO.creatureSVG(c, 150)}</div>
        <h3 style="text-align:center;margin-bottom:2px">${c.name}</h3>
        <p style="text-align:center;color:var(--muted);margin-top:0">${c.sex === 'M' ? '♂' : '♀'} ${EVO.SPECIES[c.species].name}</p>
        ${this.statDetailHTML(c)}
        <button class="btn gold block" id="buy-btn" ${(!canAfford || full) ? 'disabled' : ''}>
          ${full ? 'Stable full' : (canAfford ? 'Buy · 🪙 ' + c.price : 'Not enough coins')}
        </button>
      `);
      const buy = $('#buy-btn');
      if (buy) buy.addEventListener('click', () => {
        const r = Game.buy(c.id);
        this.toast(r.ok ? `${c.name} joined your stable!` : r.msg);
        if (r.ok) { this.closeModal(); this.renderHeader(); this.renderWilds(); this.renderStable(); this.renderCodex(); this.afterAction(); }
      });
    },

    // ---- Codex -----------------------------------------------------------
    renderCodex() {
      const box = this.el.codex;
      // Order: tier, then hybrids after pure forms, then name.
      const order = Object.keys(EVO.SPECIES).sort((a, b) => {
        const A = EVO.SPECIES[a], B = EVO.SPECIES[b];
        if (A.tier !== B.tier) return A.tier - B.tier;
        if (!!A.hybrid !== !!B.hybrid) return A.hybrid ? 1 : -1;
        return A.name.localeCompare(B.name);
      });
      box.innerHTML = order.map((key) => {
        const sp = EVO.SPECIES[key];
        const known = Game.state.discovered[key];
        const where = sp.biome ? ' • ' + EVO.BIOMES[sp.biome].name
          : (sp.biomes ? ' • ' + sp.biomes.map((b) => EVO.BIOMES[b].emoji).join('+') + ' hybrid' : (sp.hybrid ? ' • hybrid' : ''));
        return `<div class="codex-item ${known ? '' : 'locked'}">
          <div class="cx-emoji">${known ? sp.emoji : '❔'}</div>
          <div>
            <div class="cx-name">${known ? sp.name : '???'}</div>
            <div class="cx-tier">Tier ${sp.tier}${where}</div>
            <div class="cx-blurb">${known ? sp.blurb : (sp.hybrid ? 'Undiscovered hybrid — breed two different specialists adapted to both their biomes.' : 'Undiscovered — evolve or acquire to reveal.')}</div>
            ${known && sp.lore ? `<div class="cx-lore">“${sp.lore}”</div>` : ''}
          </div>
        </div>`;
      }).join('');

      // Achievements
      this.el.achievements.innerHTML = EVO.ACHIEVEMENTS.map((a) => {
        const done = Game.state.achievementsDone[a.key];
        return `<div class="goal-item ${done ? 'done' : ''}">
          <span class="goal-check">${done ? '🏅' : '◻︎'}</span>
          <div class="goal-body"><div class="goal-name">${a.name}</div><div class="goal-desc">${a.desc}</div></div>
          <span class="goal-reward">${done ? 'D' + done : '+' + a.reward}</span>
        </div>`;
      }).join('');
      // Trait glossary — reveal blurb once any owned/seen creature carries it.
      const seenTraits = new Set();
      Game.state.stable.forEach((c) => (c.traits || []).forEach((t) => seenTraits.add(t)));
      this.el.traitCodex.innerHTML = EVO.TRAIT_KEYS.map((tk) => {
        const t = EVO.TRAITS[tk];
        const known = seenTraits.has(tk);
        return `<div class="codex-item ${known ? '' : 'locked'}">
          <div class="cx-emoji">${known ? t.emoji : '❔'}</div>
          <div><div class="cx-name">${known ? t.name : '???'}</div>
          <div class="cx-blurb">${known ? t.blurb : 'Undiscovered mutation — find it while exploring.'}</div></div>
        </div>`;
      }).join('');

      const st = Game.state.stats;
      $('#codex-stats').innerHTML =
        `Races: <b>${st.racesRun}</b> · Wins: <b>${st.wins}</b> · Brawls: <b>${st.battlesFought || 0}</b> · KO wins: <b>${st.battleWins || 0}</b> · Bred: <b>${st.bred}</b> · Explored: <b>${st.explored || 0}</b> · Evolutions: <b>${st.evolutions}</b> · Cups won: <b>${st.tournamentsWon || 0}</b>`;
    },

    // ---- Detail modal ----------------------------------------------------
    statDetailHTML(c) {
      const s = EVO.stats(c);
      const adapt = EVO.adaptation(c);
      const statBar = (label, v, max) => `
        <div class="box"><div class="k">${label}</div><div class="v">${v}</div>
        <div class="bar"><span style="width:${Math.min(100, (v / (max||120)) * 100)}%"></span></div></div>`;
      const adaptBars = EVO.BIOME_KEYS.map((b) => `
        <div class="box"><div class="k">${EVO.BIOMES[b].emoji} ${EVO.BIOMES[b].name.split(' ')[0]}</div>
        <div class="v">${adapt[b]}</div>
        <div class="bar"><span style="width:${Math.min(100, adapt[b])}%;background:${EVO.BIOMES[b].color}"></span></div></div>`).join('');
      return `
        <div class="detail-grid">
          ${statBar('Speed', s.speed)}
          ${statBar('Stamina', s.stamina)}
          ${statBar('Accel', s.accel)}
          ${statBar('Agility', s.agility)}
        </div>
        <div class="section-title">Biome adaptation</div>
        <div class="detail-grid">${adaptBars}</div>
      `;
    },

    // Family tree: this creature, its parents, and grandparents, resolved
    // from the permanent pedigree registry (so sold ancestors still show).
    lineageHTML(c) {
      const ped = Game.state.pedigree || {};
      const node = (id) => (id && ped[id]) || null;
      const boxFor = (p, label) => {
        if (!p) return `<div class="tree-box wild">${label}<br>🌿 Wild</div>`;
        const sp = EVO.SPECIES[p.s] || EVO.SPECIES.grubling;
        return `<div class="tree-box">${p.x === 'M' ? '♂' : '♀'} <b>${p.n}</b><br><span>${sp.emoji} ${sp.name}</span></div>`;
      };
      const pIds = c.parents || [null, null];
      const mom = node(pIds[0]), dad = node(pIds[1]);
      if (!mom && !dad) return '<p class="hint" style="text-align:center">🌿 Wild-caught — no recorded ancestry.</p>';
      const gp = (p) => (p && p.p) || [null, null];
      const [gm1, gf1] = gp(mom).map(node);
      const [gm2, gf2] = gp(dad).map(node);
      const hasGrand = gm1 || gf1 || gm2 || gf2;
      return `<div class="tree">
        ${hasGrand ? `<div class="tree-row">${boxFor(gm1, '')}${boxFor(gf1, '')}${boxFor(gm2, '')}${boxFor(gf2, '')}</div>` : ''}
        <div class="tree-row parents">${boxFor(mom, '')}${boxFor(dad, '')}</div>
        <div class="tree-row"><div class="tree-box self">⭐ <b>${c.name}</b></div></div>
      </div>`;
    },

    // Raw allele readout (gene inspector Dev Tweak). Shows both alleles per
    // gene so you can see the genotype behind the expressed phenotype.
    geneInspectorHTML(c) {
      const g = c.genome;
      const PATTERN = EVO.PATTERNS, LIMB = EVO.LIMBS, MORPH = ['normal', 'iridescent', 'albino', 'melanic'];
      const rowN = (label, key) => `<tr><td>${label}</td><td>${g[key][0]} / ${g[key][1]}</td><td>${Math.round((g[key][0] + g[key][1]) / 2)}</td></tr>`;
      const rowE = (label, key, map) => `<tr><td>${label}</td><td>${map[g[key][0]] ?? g[key][0]} / ${map[g[key][1]] ?? g[key][1]}</td><td>${map[g[key][0]] ?? g[key][0]}</td></tr>`;
      const stats = EVO.STAT_GENES.map((k) => rowN(k, k)).join('');
      const adapt = EVO.BIOME_KEYS.map((b) => rowN(EVO.BIOMES[b].name.split(' ')[0], 'adapt_' + b)).join('');
      const vis = [
        rowN('hue°', 'hue'), rowE('pattern', 'pattern', PATTERN), rowN('bodySize', 'bodySize'),
        rowE('limb', 'limb', LIMB), rowN('eyes', 'eyes'), rowN('horn', 'horn'),
        rowE('morph', 'sheen', MORPH), rowN('spikes', 'spikes'),
      ].join('');
      return `<div class="section-title">🔬 Gene inspector</div>
        <div class="gene-table-wrap"><table class="gene-table">
          <thead><tr><th>gene</th><th>alleles</th><th>expressed</th></tr></thead>
          <tbody>${stats}${adapt}${vis}</tbody>
        </table></div>`;
    },

    openDetail(c) {
      const sp = EVO.SPECIES[c.species];
      const best = EVO.bestBiome(c);
      const traitLine = (c.traits || []).length
        ? `<p style="text-align:center;color:var(--accent)">${c.traits.map((tk) => EVO.TRAITS[tk].emoji + ' ' + EVO.TRAITS[tk].name).join(' · ')}</p>` : '';
      const abilityKeys = EVO.abilitiesFor(c);
      const abilityLine = abilityKeys.length
        ? `<p class="ability-line">${abilityKeys.map((k) => { const a = EVO.ABILITIES[k]; return `<span title="${a.blurb}">${a.emoji} ${a.name}</span>`; }).join(' · ')}</p>`
        : '<p class="ability-line none">⚔️ No arena ability — evolve this bloodline to arm it.</p>';
      const items = Game.state.items || {};
      const inStable = !!Game.state.stable.find((x) => x.id === c.id);
      const itemRow = inStable ? `
        <div class="section-title">Use an item</div>
        <div class="item-row">
          <button class="btn sm" id="use-splicer" ${items.splicer ? '' : 'disabled'}>🧪 Splice ${items.splicer ? '×' + items.splicer : ''}</button>
          <button class="btn sm" id="use-serum" ${items.serum ? '' : 'disabled'}>💉 Serum ${items.serum ? '×' + items.serum : ''}</button>
          <button class="btn sm" id="use-tonic" ${items.tonic && !c.tonic ? '' : 'disabled'}>${c.tonic ? '🍵 Charged' : '🍵 Tonic' + (items.tonic ? ' ×' + items.tonic : '')}</button>
        </div>
        <div class="serum-biomes" id="serum-biomes" style="display:none">${EVO.BIOME_KEYS.map((b) =>
          `<button class="xbiome" data-serum="${b}" style="--biome:${EVO.BIOMES[b].color}"><span class="xb-emoji">${EVO.BIOMES[b].emoji}</span><span class="xb-name">${EVO.BIOMES[b].name.split(' ')[0]}</span></button>`).join('')}
        </div>` : '';
      this.openModalHTML(`
        <div class="big-art">${EVO.creatureSVG(c, 150)}</div>
        <h3 style="text-align:center;margin-bottom:2px">${c.name}${c.tonic ? ' 🍵' : ''}</h3>
        <p style="text-align:center;color:var(--muted);margin-top:0">
          ${c.sex === 'M' ? '♂' : '♀'} ${sp.emoji} ${sp.name} • Gen ${c.generation} • ★${EVO.rating(c)}
        </p>
        ${traitLine}
        ${abilityLine}
        <p class="hint" style="text-align:center">Best on: ${EVO.BIOMES[best].emoji} ${EVO.BIOMES[best].name} · ${c.races} races, ${c.wins} wins · ${c.battles || 0} brawls, ${c.battleWins || 0} KO wins</p>
        ${this.statDetailHTML(c)}
        ${EVO.DEV.geneInspector ? this.geneInspectorHTML(c) : ''}
        <div class="section-title">Family tree</div>
        ${this.lineageHTML(c)}
        ${itemRow}
        <div class="btnrow">
          <button class="btn ghost sm" id="detail-sell">Sell · 🪙 ${Math.round(EVO.priceOf(c) * 0.6)}</button>
          <button class="btn primary block" onclick="EVO.UI.closeModal()">Close</button>
        </div>
      `);
      const sellBtn = $('#detail-sell');
      if (sellBtn) sellBtn.addEventListener('click', () => {
        if (!confirm(`Sell ${c.name}?`)) return;
        const r = Game.sell(c.id);
        this.toast(r.ok ? `Sold for ${r.value} coins.` : r.msg);
        if (r.ok) {
          this.closeModal(); this.renderHeader(); this.renderStable(); this.renderBreed(); this.renderRace();
        }
      });
      const splice = $('#use-splicer');
      if (splice) splice.addEventListener('click', () => {
        const r = Game.useSplicer(c.id);
        this.toast(r.ok ? `🧪 ${r.gene} +${r.boost}!` : r.msg);
        if (r.ok) { this.renderStable(); this.openDetail(Game.getCreature(c.id)); }
      });
      const serumBtn = $('#use-serum');
      if (serumBtn) serumBtn.addEventListener('click', () => {
        const p = $('#serum-biomes');
        p.style.display = p.style.display === 'none' ? 'grid' : 'none';
      });
      $$('[data-serum]').forEach((b) => b.addEventListener('click', () => {
        const r = Game.useSerum(c.id, b.dataset.serum);
        this.toast(r.ok ? `💉 +4 ${EVO.BIOMES[b.dataset.serum].name} exposure.` : r.msg);
        if (r.ok) this.openDetail(Game.getCreature(c.id));
      }));
      const tonicBtn = $('#use-tonic');
      if (tonicBtn) tonicBtn.addEventListener('click', () => {
        const r = Game.useTonic(c.id);
        this.toast(r.ok ? `🍵 ${c.name} is charged for the next race!` : r.msg);
        if (r.ok) { this.renderStable(); this.openDetail(Game.getCreature(c.id)); }
      });
    },

    // ---- Story modals --------------------------------------------------------
    // Mentor briefing for the CURRENT chapter: story intro + live objectives.
    // Doubles as the help screen (the ? button), with the manual a tap away.
    showChapterBriefing() {
      const ch = EVO.CHAPTERS[Math.min(Game.state.chapter, EVO.CHAPTERS.length) - 1];
      const paras = ch.intro.map((p) => `<p class="mentor-line">${p}</p>`).join('');
      const objs = ch.objectives.length ? `
        <div class="section-title">Chapter objectives</div>
        ${ch.objectives.map((o) => {
          const done = o.test(Game.state);
          const [cur, max] = o.prog ? o.prog(Game.state) : [done ? 1 : 0, 1];
          return `<div class="story-obj ${done ? 'done' : ''}"><span class="story-check">${done ? '✓' : '◻︎'}</span><span class="story-desc">${o.desc}</span><span class="story-prog">${cur}/${max}</span></div>`;
        }).join('')}` : '';
      this.openModalHTML(`
        <div class="mentor-head">
          <span class="mentor-avatar">${EVO.MENTOR.emoji}</span>
          <div><div class="mentor-name">${EVO.MENTOR.name}</div>
          <div class="mentor-sub">${ch.emoji} ${ch.num <= 6 ? 'Chapter ' + ch.num + '/6 — ' : ''}${ch.title}</div></div>
        </div>
        ${paras}
        ${objs}
        <div class="btnrow" style="margin-top:12px">
          <button class="btn ghost sm" id="manual-btn">📖 Manual</button>
          <button class="btn primary block" onclick="EVO.UI.closeModal()">Let's go</button>
        </div>
      `);
      $('#manual-btn').addEventListener('click', () => this.showTutorial());
    },

    // Celebration when a chapter's objectives are completed: what was earned,
    // what just unlocked, and the mentor's intro to the next chapter.
    showChapterModal(completed) {
      const next = EVO.CHAPTERS[completed.num]; // num is 1-based → next chapter
      const unlockList = completed.unlocks.map((s) => `<div class="unlock-row">✨ ${s}</div>`).join('');
      const nextIntro = next ? next.intro.map((p) => `<p class="mentor-line">${p}</p>`).join('') : '';
      this.openModalHTML(`
        <h2 style="text-align:center">${completed.emoji} Chapter ${completed.num} complete!</h2>
        <p style="text-align:center;color:var(--accent2);font-weight:700">${completed.title}</p>
        ${unlockList ? `<div class="section-title">Unlocked</div>${unlockList}` : ''}
        ${next ? `
          <div class="mentor-head" style="margin-top:14px">
            <span class="mentor-avatar">${EVO.MENTOR.emoji}</span>
            <div><div class="mentor-name">${EVO.MENTOR.name}</div>
            <div class="mentor-sub">${next.emoji} ${next.num <= 6 ? 'Chapter ' + next.num + '/6 — ' : ''}${next.title}</div></div>
          </div>
          ${nextIntro}` : ''}
        <button class="btn primary block" style="margin-top:12px" onclick="EVO.UI.closeModal()">${next && next.num <= 6 ? 'Onward!' : 'The world is yours 🌅'}</button>
      `);
    },

    // ---- Dev Tweaks ---------------------------------------------------------
    // Toggle menu for exploratory features (see js/dev.js for the registry).
    // Flags persist separately from the save, so a game reset keeps them.
    // The menu is grouped by category, shows a live active count, and can
    // clear everything at once.
    showDevTweaks() {
      // Group the registry by `group`, preserving first-seen order.
      const groups = [];
      EVO.DEV_TWEAKS.forEach((t) => {
        let g = groups.find((x) => x.name === t.group);
        if (!g) { g = { name: t.group, items: [] }; groups.push(g); }
        g.items.push(t);
      });
      const row = (t) => `
        <label class="dev-row ${EVO.DEV[t.key] ? 'on' : ''}" data-row="${t.key}">
          <span class="dev-emoji">${t.emoji}</span>
          <span class="dev-body">
            <span class="dev-name">${t.name}</span>
            <span class="dev-blurb">${t.blurb}</span>
          </span>
          <span class="switch"><input type="checkbox" data-dev="${t.key}" ${EVO.DEV[t.key] ? 'checked' : ''} aria-label="${t.name}"><i></i></span>
        </label>`;
      const sections = groups.map((g) =>
        `<div class="dev-group-label">${g.name}</div>${g.items.map(row).join('')}`).join('');

      this.openModalHTML(`
        <div class="dev-head">
          <h2>🧪 Dev Tweaks</h2>
          <span class="dev-count" id="dev-count"></span>
        </div>
        <p class="hint">Experimental features under evaluation — they may change or disappear. Toggles apply instantly and persist across game resets.</p>
        ${sections}
        <div class="btnrow" style="margin-top:14px">
          <button class="btn ghost sm" id="dev-clear">Reset tweaks</button>
          <button class="btn primary block" onclick="EVO.UI.closeModal()">Done</button>
        </div>
      `);

      const updateCount = () => {
        const n = EVO.devActive();
        const el = $('#dev-count');
        el.textContent = n ? `${n} active` : 'none active';
        el.classList.toggle('lit', n > 0);
        const clr = $('#dev-clear');
        if (clr) clr.disabled = n === 0;
      };
      const applyToggle = (key, on) => {
        EVO.DEV[key] = on;
        EVO.saveDev();
        this.applyDevStyles();
        this.renderAll(); // re-render so art/economy flips apply instantly
      };

      $$('[data-dev]').forEach((input) => input.addEventListener('change', () => {
        applyToggle(input.dataset.dev, input.checked);
        const rowEl = $(`[data-row="${input.dataset.dev}"]`);
        if (rowEl) rowEl.classList.toggle('on', input.checked);
        updateCount();
        this.toast(`${input.checked ? '✓ Enabled' : '✕ Disabled'}: ${EVO.DEV_TWEAKS.find((t) => t.key === input.dataset.dev).name}`);
      }));
      $('#dev-clear').addEventListener('click', () => {
        if (!EVO.devActive()) return;
        EVO.DEV_TWEAKS.forEach((t) => (EVO.DEV[t.key] = false));
        EVO.saveDev();
        this.applyDevStyles();
        this.renderAll();
        this.showDevTweaks(); // rebuild the menu in its cleared state
        this.toast('All tweaks reset.');
      });
      updateCount();
    },

    // Apply/remove document-level effects of style tweaks (theme classes),
    // and reflect the active count on the Dev button. Called on boot and on
    // every toggle so flags survive reloads.
    applyDevStyles() {
      document.documentElement.classList.toggle('synthwave', !!EVO.DEV.synthwave);
      const btn = $('#dev-btn');
      if (btn) {
        const n = EVO.devActive();
        btn.textContent = n ? `🧪 Dev tweaks · ${n}` : '🧪 Dev tweaks';
        btn.classList.toggle('has-active', n > 0);
      }
    },

    // ---- Tutorial ---------------------------------------------------------
    TUTORIAL_STEPS: [
      { emoji: '🧬', title: 'Welcome to Evolve Racers', body: 'Breed creatures, race them for coins, and shape their evolution. <b>You are the selection pressure</b> — where a bloodline lives decides what it becomes.' },
      { emoji: '🏁', title: 'Race the biomes', body: 'Each track belongs to a biome. A creature\'s <b>adaptation</b> to that biome matters more than raw stats — the coloured bars on every card show where it thrives. Racing there builds its <b>exposure</b>.' },
      { emoji: '💞', title: 'Breed with intent', body: 'Pick two parents in the Lab. The biome they\'ve raced or explored most pushes their offspring\'s adaptation that way, and the <b>predictor</b> shows stat ranges and evolution odds before you commit.' },
      { emoji: '✨', title: 'Trigger metamorphosis', body: 'Push a lineage\'s adaptation past the threshold and its next offspring is <b>born a new species</b> — stronger, and visibly different. Cross two <i>different</i> specialists to discover rare <b>hybrids</b>.' },
      { emoji: '⚔️', title: 'Brawl in the arena', body: 'Battles are the other path to glory: four creatures, one arena, last one standing. Stats become HP, damage, and dodge — and an evolved bloodline\'s <b>lineage ability</b> (dashes, burns, frost novas…) can turn a fight. Brawling in a biome builds exposure just like racing.' },
      { emoji: '🧭', title: 'Explore & compete', body: 'Send creatures on <b>expeditions</b> for eggs, coins, and mutation traits. Buy items in the shop, chase the goal ladder, and enter <b>tournaments</b> for the big prizes. Good luck, breeder!' },
    ],

    showTutorial() {
      this._tutStep = 0;
      this.renderTutorialStep();
    },

    renderTutorialStep() {
      const i = this._tutStep;
      const steps = this.TUTORIAL_STEPS;
      const s = steps[i];
      const dots = steps.map((_, j) => `<span class="tut-dot ${j === i ? 'on' : ''}"></span>`).join('');
      const last = i === steps.length - 1;
      this.openModalHTML(`
        <div class="tut">
          <div class="tut-emoji">${s.emoji}</div>
          <h2>${s.title}</h2>
          <p>${s.body}</p>
          <div class="tut-dots">${dots}</div>
          <div class="btnrow">
            ${last ? '' : '<button class="btn ghost sm" id="tut-skip">Skip</button>'}
            <button class="btn primary block" id="tut-next">${last ? "Let's evolve! 🧬" : 'Next'}</button>
          </div>
        </div>
      `);
      const finish = () => {
        Game.state.tutorialDone = true;
        Game.save();
        this.closeModal();
      };
      $('#tut-next').addEventListener('click', () => {
        if (last) return finish();
        this._tutStep++;
        this.renderTutorialStep();
      });
      const skip = $('#tut-skip');
      if (skip) skip.addEventListener('click', finish);
    },

    // ---- Modal / toast helpers ------------------------------------------
    openModalHTML(html) {
      this.el.modal.innerHTML = html;
      this.el.modalBack.classList.add('open');
    },
    closeModal() { this.el.modalBack.classList.remove('open'); },

    toast(msg) {
      const t = this.el.toast;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    },
  });
})();
