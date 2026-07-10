/*
 * dev.js — Dev Tweaks: persistent toggles for exploratory features.
 * Flags live in their own localStorage key so they survive game resets,
 * and everything here is safe to flip live (renderers/UI re-read EVO.DEV).
 *
 * To propose a new experiment, add one entry to EVO.DEV_TWEAKS (+ a default
 * in EVO.DEV) and read the flag wherever it applies — the menu renders
 * itself from this registry, grouped by `group`.
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const KEY = 'evo-dev-tweaks-v1';

  EVO.DEV_TWEAKS = [
    // -- Visual style ------------------------------------------------------
    { key: 'pixelArt', group: 'Visual style', emoji: '👾', name: 'Pixel-art creatures',
      blurb: 'Render every creature as a retro 16×16 sprite instead of the smooth vector look.' },
    { key: 'synthwave', group: 'Visual style', emoji: '🌆', name: 'Synthwave theme',
      blurb: 'Neon night-grid palette — magenta, cyan, and deep violet across the whole app.' },
    // -- Gameplay experiments ----------------------------------------------
    { key: 'chaosMutations', group: 'Gameplay experiments', emoji: '🌪️', name: 'Chaos mutations',
      blurb: 'Crank the mutation rate ~2.5×. Wilder offspring, faster colour-morph and trait discovery.' },
    { key: 'geneInspector', group: 'Gameplay experiments', emoji: '🔬', name: 'Gene inspector',
      blurb: 'Show the raw allele pairs behind every gene in the creature sheet.' },
    // -- Testing tools -------------------------------------------------------
    { key: 'fastRaces', group: 'Testing tools', emoji: '⏩', name: 'Fast races',
      blurb: 'Run race animations at ~2.5× speed. Handy for long test sessions.' },
    { key: 'sandbox', group: 'Testing tools', emoji: '🎲', name: 'Free-entry sandbox',
      blurb: 'Breeding, race, tournament, and expedition fees cost 0. Market and shop prices stay real.' },
    { key: 'storyFree', group: 'Testing tools', emoji: '🗝️', name: 'Free roam',
      blurb: 'Ignore story-mode locks — every system and biome is available regardless of chapter.' },
  ];

  EVO.DEV = { pixelArt: false, synthwave: false, chaosMutations: false, geneInspector: false, fastRaces: false, sandbox: false, storyFree: false };

  // How many experiments are currently on (for badges/counters).
  EVO.devActive = function () {
    return EVO.DEV_TWEAKS.filter((t) => EVO.DEV[t.key]).length;
  };

  // Effective fee under the sandbox flag.
  EVO.devCost = function (n) { return EVO.DEV.sandbox ? 0 : n; };

  // Effective mutation rate under the chaos flag.
  EVO.mutRate = function () { return EVO.DEV.chaosMutations ? 0.35 : EVO.MUT_RATE; };

  EVO.loadDev = function () {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      Object.keys(EVO.DEV).forEach((k) => { if (typeof d[k] === 'boolean') EVO.DEV[k] = d[k]; });
    } catch (e) { /* corrupted flags are not worth crashing over */ }
  };

  EVO.saveDev = function () {
    try { localStorage.setItem(KEY, JSON.stringify(EVO.DEV)); } catch (e) { /* ignore */ }
  };

  EVO.loadDev();
})();
