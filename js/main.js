/*
 * main.js — Bootstrap. Loads/creates the save and starts the UI.
 */
(function () {
  const EVO = window.EVO;
  function boot() {
    if (!EVO.Game.load()) {
      EVO.Game.newGame();
    }
    EVO.UI.init();
    EVO.UI.showTab('stable');
    if (!EVO.Game.state.tutorialDone) EVO.UI.showTutorial();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
