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
    // First run: the mentor's Chapter 1 briefing is the tutorial.
    if (!EVO.Game.state.tutorialDone) {
      EVO.UI.showChapterBriefing();
      EVO.Game.state.tutorialDone = true;
      EVO.Game.save();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
