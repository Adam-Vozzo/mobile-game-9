# 🧬 Evolve Racers

**A mobile web game about breeding, racing, and *directing the evolution* of creatures.**
You don't just breed for the best stats — **you are the selection pressure.** Where your creatures race and explore reshapes their lineage over generations until it *metamorphoses* into an entirely new species.

Built as a single static site — pure HTML/CSS/vanilla JS, no build step, no backend, no dependencies — so it runs straight from **GitHub Pages** on any phone and saves your progress locally.

> ▶️ **Play:** once Pages is enabled (see [Deployment](#-deployment)), the game lives at
> `https://adam-vozzo.github.io/mobile-game-9/`

---

## 📱 Run it on your phone

1. **Enable GitHub Pages** for this repo: *Settings → Pages → Build and deployment → Source: **GitHub Actions***. The included workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) deploys on every push to `main`.
2. Open the Pages URL above on your phone's browser.
3. *(Optional)* Use the browser's **"Add to Home Screen"** — the game is configured to run full-screen like a native app.

Your stable, coins, and progress are saved to the device via `localStorage`. No account, no network needed after load.

### Run locally
It's all static files, so any static server works:
```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```
(Opening `index.html` directly via `file://` also works — the scripts use no ES modules or fetches.)

---

## 🎮 Game Design Document

### Concept
A cozy creature-collector / racing-sim in the spirit of *Faster Bunnies*, *Horsey Game*, and *Horse Reality* — breed animals, race them for prizes, and chase a better bloodline. **The twist:** genetics here are *directed*. Racing and exploring a biome applies real evolutionary pressure to a lineage, and cross the right thresholds and your creatures **physically evolve** into new, more powerful forms.

### The unique twist — Directed Evolution 🔬
Most breeding games average parent stats. Evolve Racers models the player as the **environmental selection pressure**:

- Every track and expedition belongs to a **biome** (Dunes, Bog, Crags, Tundra).
- Running or exploring a biome raises a creature's **biome exposure**.
- When two parents breed, the biome they've *collectively spent the most time in* biases their offspring's **adaptation genes** upward — an epigenetic-style push, not random drift.
- Push a lineage's adaptation past a **metamorphosis threshold** and the next offspring is **born a new species** — a Grubling becomes a desert **Dunestrider**, then an apex **Mirage Raptor**.

So the strategic fantasy is: *choose where your bloodline lives, and watch it become something built for that world.* It's visible, too — evolved forms grow crests, tails, wings, and biome-colored auras.

### Core loop
```
        ┌───────────────────────────────────────────┐
        │                                           │
   BREED a pair  ──►  RACE / EXPLORE a biome  ──►  EARN coins & exposure
        ▲                                           │
        │                                           ▼
   pick parents  ◄──  build adaptation  ◄──  METAMORPHOSIS unlocks new species
```
1. **Race** creatures on biome tracks for coins and to build exposure.
2. **Explore** biomes on expeditions to find coins, wild eggs, and rare mutation traits.
3. **Breed** two parents — the predictor shows likely offspring stats and evolution odds.
4. **Evolve** a lineage by concentrating its exposure until it metamorphoses.
5. **Expand** your stable, widen the gene pool from the market, and complete goals.

### Systems

| System | What it does |
| --- | --- |
| **Genetics** | Each creature carries two alleles per gene (4 core stats, 4 biome-adaptation genes, 6 visual genes). Offspring inherit one allele per parent, plus mutation. Stats = the mean of the two alleles. |
| **Biomes** | Sunscorch Dunes 🏜️, Mirefen Bog 🐸, Skyreach Crags ⛰️, Hollowfrost Tundra ❄️ — each rewards adapted creatures and penalizes the rest, so *fit matters more than raw stats*. |
| **Evolution tree** | Grubling → four Tier-1 biome specialists → four Tier-2 apex forms. Metamorphosis triggers on breeding when offspring adaptation clears the tier threshold. |
| **Mutation traits** | Rare heritable perks (Swiftborn 💨, Ironhide 🛡️, Bioluminescent ✨, Twin-Tailed 🜛) found while exploring. Each gives a stat edge and a visible tell. |
| **Racing** | 5-racer animated sim. Effective speed blends stats with biome adaptation, energy drain (stamina), acceleration ramp, and agility-driven variance. Top-3 pay prizes. |
| **Expeditions** | Send a creature into a biome (Scout / Trek / Deep) for coins, wild eggs that lean into that biome, and rare traits — plus exposure to steer evolution without racing. |
| **Breeding predictor** | A Monte-Carlo preview (160 simulated offspring) showing min–max stat ranges and the **% chance of metamorphosis** before you commit. |
| **Economy** | Earn coins from races, prizes, expeditions, and goals; spend on breeding, race entry, expeditions, wild-market creatures, and stable expansion. |
| **Goals** | An 8-step objective ladder that guides new players and drips rewards (first race → first win → first evolution → apex predator). |
| **Codex** | Tracks discovered species and mutation traits, plus career stats. |

### Procedural art
Every creature is drawn from its genome as an inline SVG — hue, pattern, body size, limb type (legs/fins/talons/paws), eye count, and horns are all heritable, so a bloodline is visually recognisable and **evolution is something you can see**, not just read.

### UX / controls
Single-hand, thumb-friendly, five-tab bottom nav: **Stable · Breed · Race · Wilds · Codex**. Tap any creature for a full stat/adaptation/lineage sheet. Respects `prefers-reduced-motion` and iOS safe-area insets.

---

## 🗺️ Roadmap

### ✅ v0.1 — Playable MVP (this build)
- [x] Static, offline-capable, mobile-first PWA-style site + GitHub Pages deploy
- [x] Genetics engine (alleles, inheritance, mutation, phenotype expression)
- [x] Procedural, heritable, animated SVG creature art
- [x] Four biomes and the animated race simulator
- [x] **Directed-evolution** breeding pressure + three-tier metamorphosis tree
- [x] Mutation traits + expeditions (exploration loop)
- [x] Breeding predictor, goals ladder, wild market, Codex
- [x] `localStorage` save/load

### 🔜 v0.2 — Depth & feel
- [ ] Sound effects & light music (toggleable)
- [ ] Race commentary and photo-finish replays
- [ ] Lineage / family-tree viewer in the creature sheet
- [ ] More visual gene expression (skins, sizes, colour morphs) and trait art
- [ ] Difficulty curve tuning + a proper tutorial overlay

### 🌱 v0.3 — Content & progression
- [ ] Two more biomes (e.g. Volcanic Ash, Deep Reef) + matching evolution branches
- [ ] Cross-biome **hybrid** apex forms (breed two different specialists)
- [ ] Tournaments / seasons with brackets and ranked prizes
- [ ] Items & consumables (gene splicers, exposure boosters, stamina tonics)
- [ ] Achievements + expanded Codex lore

### 🚀 v1.0 — Live game
- [ ] PWA manifest + service worker (installable, true offline)
- [ ] Cloud save / cross-device sync (optional account)
- [ ] Async multiplayer: share a creature's genome code; ghost-race friends' bloodlines
- [ ] Daily challenges & leaderboards
- [ ] Accessibility pass (screen-reader labels, colour-blind-safe palettes)

### 💡 Ideas parking lot
- Genome import/export codes for trading
- Weather that shifts biome bonuses per race
- "Wild" world map you physically explore for legendary primordials

---

## 🧱 Project structure

```
index.html            # App shell + view markup
styles.css            # Mobile-first theme, animations, component styles
js/
  data.js             # Static data: biomes, genes, species tree, traits, expeditions, goals
  genetics.js         # RNG, genome creation, inheritance, mutation, trait heredity
  creature.js         # Stat/adaptation derivation, rating, metamorphosis decisions
  render.js           # Procedural SVG creature art
  race.js             # Race performance model + simulation
  game.js             # Game state, economy, breeding, expeditions, goals, predictor, save/load
  ui.js               # DOM rendering, navigation, interaction
  main.js             # Bootstrap
.github/workflows/
  pages.yml           # GitHub Pages deploy (GitHub Actions)
```

Architecture: everything hangs off a single `window.EVO` namespace, loaded via ordered `<script>` tags — deliberately dependency-free and framework-free so it stays trivially deployable and hackable.

---

## 🛠️ Tech
Vanilla **HTML / CSS / JavaScript**. No frameworks, no bundler, no runtime dependencies. Art is procedural SVG; state is JSON in `localStorage`.

## 📄 License
MIT — see below. Have fun evolving weird little racers.
