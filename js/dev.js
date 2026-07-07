/*
 * dev.js — Dev Tweaks: persistent toggles for exploratory features.
 * Flags live in their own localStorage key so they survive game resets,
 * and everything here is safe to flip live (renderers/UI re-read EVO.DEV).
 */
(function () {
  const EVO = (window.EVO = window.EVO || {});
  const KEY = 'evo-dev-tweaks-v1';

  // Registry of experimental toggles. The Dev Tweaks menu renders from this,
  // so adding a flag here is all it takes to expose a new experiment.
  EVO.DEV_TWEAKS = [
    { key: 'pixelArt', name: 'Pixel-art creatures', emoji: '👾',
      blurb: 'Render every creature in a retro 16×16 pixel style instead of the smooth vector look.' },
    { key: 'fastRaces', name: 'Fast races', emoji: '⏩',
      blurb: 'Run race animations at ~2.5× speed. Handy for testing long sessions.' },
  ];

  EVO.DEV = { pixelArt: false, fastRaces: false };

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
