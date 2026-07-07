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
| **Genetics** | Each creature carries two alleles per gene (4 core stats, 6 biome-adaptation genes, 8 visual genes including colour morphs and spines). Offspring inherit one allele per parent, plus mutation. Stats = the mean of the two alleles. |
| **Biomes** | Sunscorch Dunes 🏜️, Mirefen Bog 🐸, Skyreach Crags ⛰️, Hollowfrost Tundra ❄️, Cinderveil Wastes 🌋, Sapphire Shallows 🐚 — each rewards adapted creatures and penalizes the rest, so *fit matters more than raw stats*. |
| **Evolution tree** | Grubling → six Tier-1 biome specialists → six Tier-2 apex forms, **plus seven cross-biome hybrid apexes** bred from two different specialists adapted to both parent biomes. Metamorphosis triggers on breeding when offspring adaptation clears the tier threshold. |
| **Mutation traits** | Rare heritable perks (Swiftborn 💨, Ironhide 🛡️, Bioluminescent ✨, Twin-Tailed 🜛) found while exploring. Each gives a stat edge and bespoke art on the creature. |
| **Racing** | 5-racer animated sim with **live commentary** and **photo-finish slow-mo replays**. Effective speed blends stats with biome adaptation, energy drain (stamina), acceleration ramp, and agility-driven variance. Rival strength rubber-bands to your entrant. Top-3 pay prizes. |
| **Tournaments** | An 8-racer knockout Cup per season: survive your semifinal heat, race the final, take the champion's purse. |
| **Expeditions** | Send a creature into a biome (Scout / Trek / Deep) for coins, wild eggs that lean into that biome, and rare traits — plus exposure to steer evolution without racing. |
| **Items** | Gene Splicer 🧪 (boost a random stat gene), Exposure Serum 💉 (instant biome exposure), Stamina Tonic 🍵 (one-race energy boost). |
| **Breeding predictor** | A Monte-Carlo preview (160 simulated offspring) showing min–max stat ranges and the **% chance of metamorphosis** before you commit. |
| **Family tree** | Every creature's sheet shows a three-generation pedigree, kept even after ancestors are sold. |
| **Economy** | Earn coins from races, tournaments, expeditions, goals, and achievements; spend on breeding, entries, items, wild-market creatures, and stable expansion. |
| **Goals & achievements** | An 8-step guided goal ladder plus 13 long-tail achievements. |
| **Codex** | Tracks discovered species (with lore), mutation traits, achievements, and career stats. First launch opens a 5-step tutorial (replayable via the ? button). |

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

### ✅ v0.2 — Depth & feel
- [ ] Sound effects & light music (toggleable)
- [x] Race commentary and photo-finish replays
- [x] Lineage / family-tree viewer in the creature sheet
- [x] More visual gene expression (colour morphs: iridescent/albino/melanic, back spines, wider size range) and per-trait art
- [x] Difficulty curve tuning (rivals rubber-band to your entrant's rating) + a proper tutorial overlay

### ✅ v0.3 — Content & progression
- [x] Two more biomes (Cinderveil Wastes 🌋, Sapphire Shallows 🐚) + matching evolution branches
- [x] Cross-biome **hybrid** apex forms (6 named hybrids + the Chimerax fallback)
- [x] Tournaments / seasons: 8-racer knockout Cup with bracket view and ranked prizes
- [x] Items & consumables (Gene Splicer, Exposure Serum, Stamina Tonic)
- [x] Achievements (13) + expanded Codex lore for every species

### 🔬 v0.4 — Proposed (next up)
New feature proposals. Visual/UX experiments land first behind the in-game **🧪 Dev Tweaks** menu (see below) so they can be evaluated on-device before graduating to defaults — six are live there now (pixel art, synthwave theme, chaos mutations, gene inspector, fast races, free-entry sandbox).
- [ ] **Pixel-art render style** — 16×16 sprite renderer driven by the same genome · *prototype shipped, testable in Dev Tweaks now*
- [ ] **Synthwave UI theme** — neon palette · *prototype shipped, testable in Dev Tweaks now*
- [ ] Sound effects & light music, toggleable (carried over from v0.2)
- [ ] **Weather fronts** — per-race modifiers (sandstorm, downpour, whiteout) that temporarily shift biome bonuses and reward flexible bloodlines
- [ ] **Stud market** — hire out a champion for coins, or pay to borrow a stranger's bloodline for one cross
- [ ] **Hall of Fame** — retire a legend to grant its descendants a permanent lineage perk
- [ ] **Betting booth** — wager coins on rival-only exhibition heats you don't race in
- [ ] **Photo mode** — export a creature's portrait card (art + stats + pedigree) as a shareable image
- [ ] **Night races** — bioluminescent-trait-only events with unique prizes
- [ ] **Rival stables** — named recurring AI opponents whose bloodlines also evolve between seasons

### 🚀 v1.0 — Live game
- [ ] PWA manifest + service worker (installable, true offline)
- [ ] Cloud save / cross-device sync (optional account)
- [ ] Async multiplayer: share a creature's genome code; ghost-race friends' bloodlines
- [ ] Daily challenges & leaderboards
- [ ] Accessibility pass (screen-reader labels, colour-blind-safe palettes)

### 💡 Ideas parking lot
- Genome import/export codes for trading
- "Wild" world map you physically explore for legendary primordials
- Creature nicknames, favourites, and custom stable décor
- Endurance "grand tour" mode: one lineage, all six biomes back-to-back

## 🧪 Dev Tweaks (experimental features)

The game ships an in-game lab for exploratory features: **Stable tab → 🧪 Dev tweaks**. The menu groups experiments by category, shows how many are active (with a matching badge on the Dev button), applies toggles instantly, and has a one-tap **Reset tweaks**. Flags persist on the device *separately* from your save — so a game reset keeps them — and are defined in one registry ([`js/dev.js`](js/dev.js)): adding an entry (with a `group`) is all it takes to expose a new experiment.

Current experiments:
| Group | Toggle | What it does |
| --- | --- | --- |
| Visual style | 👾 **Pixel-art creatures** | Swaps the smooth vector art for a retro 16×16 sprite renderer driven by the *same genome* — hue, morphs, patterns, limbs, spines, tier features, and trait markers all carry over. |
| Visual style | 🌆 **Synthwave theme** | Recolours the whole app with a neon night-grid palette (magenta / cyan / deep violet) plus creature glow. |
| Gameplay | 🌪️ **Chaos mutations** | Cranks the mutation rate ~2.5× for wilder offspring and faster morph/trait discovery. |
| Gameplay | 🔬 **Gene inspector** | Adds a raw allele-pair table to the creature sheet, exposing the genotype behind every expressed gene. |
| Testing | ⏩ **Fast races** | Runs race animations at ~2.5× speed. |
| Testing | 🎲 **Free-entry sandbox** | Zeroes breeding, race, tournament, and expedition fees (market/shop prices stay real) for unconstrained testing. |

---

## 🧱 Project structure

```
index.html            # App shell + view markup
styles.css            # Mobile-first theme, animations, component styles
js/
  data.js             # Static data: biomes, genes, species tree, traits, expeditions, goals
  dev.js              # Dev Tweaks: registry + persistence for experimental feature flags
  genetics.js         # RNG, genome creation, inheritance, mutation, trait heredity
  creature.js         # Stat/adaptation derivation, rating, metamorphosis decisions
  render.js           # Procedural SVG creature art (vector + experimental pixel renderer)
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
