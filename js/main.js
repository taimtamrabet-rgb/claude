/* ==========================================================================
   MAIN.JS — boot sequence.
   ========================================================================== */

(function boot() {
  migrateLegacySave();

  const activeSlot = getActiveSlot();
  if (activeSlot && hasSaveInSlot(activeSlot) && load(activeSlot)) {
    UI.renderAll();
  } else {
    UI.showSlotPicker({ forced: true });
  }

  window.addEventListener("beforeunload", () => { if (STATE.activeSlot) save(); });

  // Expose a manual reset for convenience in dev tools.
  window.resetGame = function () { wipeSave(); location.reload(); };
})();
