/* ==========================================================================
   MAIN.JS — boot sequence.
   ========================================================================== */

(function boot() {
  const loaded = load();
  if (!loaded || !STATE.characterCreated) {
    STATE.characterCreated = false;
  }
  UI.renderAll();

  window.addEventListener("beforeunload", save);

  // Expose a manual reset for convenience in dev tools.
  window.resetGame = function () { wipeSave(); location.reload(); };
})();
