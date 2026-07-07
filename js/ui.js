/*
 * ui.js — DOM rendering, navigation, and interaction glue.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const Game = EVO.Game;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const UI = (EVO.UI = {
    breedSel: { mom: null, dad: null }, // creature ids
    raceBiome: 'dune',
    raceRacerId: null,

    init() {
      this.cacheEls();
      this.bindTabs();
      this.bindStatic();
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
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      Object.keys(this.el.views).forEach((k) => {
        this.el.views[k].classList.toggle('active', k === name);
      });
      if (name === 'stable') { this.renderGoals(); this.renderStable(); }
      if (name === 'breed') this.renderBreed();
      if (name === 'race') this.renderRace();
      if (name === 'wilds') this.renderWilds();
      if (name === 'codex') this.renderCodex();
    },

    bindStatic() {
      this.el.breedBtn.addEventListener('click', () => this.doBreed());
      this.el.raceBtn.addEventListener('click', () => this.doRace());
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
        }
      });
      this.el.modalBack.addEventListener('click', (e) => {
        if (e.target === this.el.modalBack) this.closeModal();
      });
    },

    renderAll() {
      this.renderHeader();
      this.renderGoals();
      this.renderStable();
      this.renderBreed();
      this.renderRace();
      this.renderWilds();
      this.renderCodex();
    },

    // Run after any action that changes progress: award goals + toast.
    afterAction() {
      const newly = Game.checkGoals();
      this.renderHeader();
      if (newly.length) {
        newly.forEach((g, i) => setTimeout(() => this.toast(`🎯 ${g.name}! +${g.reward} coins`), i * 900));
        this.renderGoals();
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
      }).join('');

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
      btn.textContent = check.ok ? `Breed (−${EVO.BREED_COST} coins)` : check.msg;
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
    renderRace() {
      // Biome picker
      const bp = this.el.biomePicker;
      bp.innerHTML = '';
      EVO.BIOME_KEYS.forEach((k) => {
        const b = EVO.BIOMES[k];
        const card = document.createElement('button');
        card.className = 'biome-card' + (this.raceBiome === k ? ' selected' : '');
        card.style.setProperty('--biome', b.color);
        card.innerHTML = `<div class="bemoji">${b.emoji}</div><div class="bname">${b.name}</div><div class="bblurb">${b.blurb}</div>`;
        card.addEventListener('click', () => { this.raceBiome = k; this.renderRace(); });
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

      this.el.raceBtn.disabled = !this.raceRacerId || Game.state.coins < EVO.RACE_ENTRY;
      this.el.raceBtn.textContent = Game.state.coins < EVO.RACE_ENTRY
        ? 'Need coins to enter' : `Enter Race (−${EVO.RACE_ENTRY} coins)`;
      this.el.raceResults.innerHTML = '';
      this.el.track.innerHTML = '';
    },

    buildField(playerId) {
      // Player racer + 4 AI rivals scaled to the day for difficulty.
      const player = Game.getCreature(playerId);
      const field = [player];
      const q = Math.min(0.8, 0.35 + Game.state.day * 0.02);
      for (let i = 0; i < 4; i++) {
        const rival = EVO.makeCreature(EVO.makeWildGenome(q + EVO.R.float(-0.12, 0.15)), { generation: 1 });
        rival.name = EVO.randomName();
        // Give rivals some adaptation to the chosen biome so it matters.
        const ak = 'adapt_' + this.raceBiome;
        rival.genome[ak] = [EVO.R.int(20, 70), EVO.R.int(20, 70)];
        field.push(rival);
      }
      return field;
    },

    doRace() {
      if (this._racing) return;
      if (Game.state.coins < EVO.RACE_ENTRY) { this.toast('Not enough coins.'); return; }
      Game.state.coins -= EVO.RACE_ENTRY;
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
        const rec = Game.recordRace(result, playerId, biome, EVO.RACE_ENTRY);
        this.renderHeader();
        this.showResults(field, result, rec, playerId);
        this.renderStable();
        this.renderCodex();
        this.afterAction();
        // Note: don't call renderRace() here — it would clear the track &
        // results we just rendered. showResults() already syncs the button.
      }, playerId);
    },

    animateRace(field, result, done, playerId) {
      const track = this.el.track;
      track.innerHTML = '';
      this.el.raceResults.innerHTML = '';
      this.el.raceBtn.disabled = true;

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
      let f = 0;
      const speedup = 2; // frames per animation tick
      const step = () => {
        const row = frames[Math.min(f, total - 1)];
        for (let i = 0; i < lanes.length; i++) {
          const laneW = lanes[i].parentElement.clientWidth - 44;
          lanes[i].style.transform = `translate(${row[i] * laneW}px, -50%)`;
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

    showResults(field, result, rec, playerId) {
      const box = this.el.raceResults;
      const byId = {};
      field.forEach((c) => (byId[c.id] = c));
      let html = '<div class="section-title">Results</div>';
      result.order.forEach((id, pos) => {
        const c = byId[id];
        const you = id === playerId;
        const prize = EVO.racePrize(pos, EVO.RACE_ENTRY);
        html += `<div class="result-row ${you ? 'you' : ''}">
          <span class="place">${['🥇','🥈','🥉'][pos] || (pos + 1)}</span>
          <span class="rname">${you ? '<b>' + c.name + ' (you)</b>' : c.name}</span>
          ${prize ? `<span class="prize">+${prize}</span>` : ''}
        </div>`;
      });
      if (rec.pos === 0) html += '<p class="hint" style="text-align:center">🏆 Victory! Race this lineage in the same biome, then breed to push its evolution.</p>';
      this.el.track.parentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      box.innerHTML = html;
      this.el.raceBtn.disabled = Game.state.coins < EVO.RACE_ENTRY;
    },

    // ---- Wilds (Expeditions + Market) -----------------------------------
    renderWilds() {
      this.renderExplore();
      this.renderMarket();
    },

    renderExplore() {
      const box = this.el.explorePanel;
      if (!box) return;
      // Ensure a valid selected explorer.
      if (!this.exploreId || !Game.state.stable.find((c) => c.id === this.exploreId)) {
        this.exploreId = Game.state.stable[0] ? Game.state.stable[0].id : null;
      }
      if (!this.exploreBiome) this.exploreBiome = 'dune';

      const biomeBtns = EVO.BIOME_KEYS.map((k) => {
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
        const afford = Game.state.coins >= k.cost;
        return `<button class="xkind btn ${afford ? '' : 'disabled-look'}" data-kind="${kk}" ${afford ? '' : 'disabled'}>
          <div class="xk-name">${k.name}</div>
          <div class="xk-meta">🪙${k.cost} · ${k.days}d · ${Math.round(k.rareChance * 100)}% rare</div>
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
      const order = ['grubling', 'dunestrider', 'bogfin', 'craghorn', 'frostpelt', 'mirageraptor', 'leviatoad', 'thunderpeak', 'glaciarch'];
      box.innerHTML = order.map((key) => {
        const sp = EVO.SPECIES[key];
        const known = Game.state.discovered[key];
        return `<div class="codex-item ${known ? '' : 'locked'}">
          <div class="cx-emoji">${known ? sp.emoji : '❔'}</div>
          <div>
            <div class="cx-name">${known ? sp.name : '???'}</div>
            <div class="cx-tier">Tier ${sp.tier}${sp.biome ? ' • ' + EVO.BIOMES[sp.biome].name : ''}</div>
            <div class="cx-blurb">${known ? sp.blurb : 'Undiscovered — evolve or acquire to reveal.'}</div>
          </div>
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
        `Races: <b>${st.racesRun}</b> · Wins: <b>${st.wins}</b> · Bred: <b>${st.bred}</b> · Explored: <b>${st.explored || 0}</b> · Evolutions: <b>${st.evolutions}</b>`;
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

    openDetail(c) {
      const sp = EVO.SPECIES[c.species];
      const best = EVO.bestBiome(c);
      const parents = c.parents ? c.parents.map((id) => {
        const p = Game.getCreature(id); return p ? p.name : '—';
      }).join(' × ') : 'Wild-caught';
      const traitLine = (c.traits || []).length
        ? `<p style="text-align:center;color:var(--accent)">${c.traits.map((tk) => EVO.TRAITS[tk].emoji + ' ' + EVO.TRAITS[tk].name).join(' · ')}</p>` : '';
      this.openModalHTML(`
        <div class="big-art">${EVO.creatureSVG(c, 150)}</div>
        <h3 style="text-align:center;margin-bottom:2px">${c.name}</h3>
        <p style="text-align:center;color:var(--muted);margin-top:0">
          ${c.sex === 'M' ? '♂' : '♀'} ${sp.emoji} ${sp.name} • Gen ${c.generation} • ★${EVO.rating(c)}
        </p>
        ${traitLine}
        <p class="hint" style="text-align:center">Lineage: ${parents}<br>Best on: ${EVO.BIOMES[best].emoji} ${EVO.BIOMES[best].name} · ${c.races} races, ${c.wins} wins</p>
        ${this.statDetailHTML(c)}
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
