/**
 * WorkTrackerPro - Chaos Engineering Suite
 * Script 4: The Amnesia Trigger (chaos.suspend.js)
 * Simulates mobile OS app suspension / Garbage Collection by clearing volatile in-memory state.
 */

(function() {
  window.__chaos_trigger_amnesia = function() {
    console.warn("[Chaos Suspend] Triggering memory amnesia... Wiping transient in-memory State stores.");
    
    try {
      // Access useAppStore state directly if it's exported or bound to window,
      // or we simulate state wipe by setting state properties to null or empty.
      if (window.__chaos_wipe_zustand) {
        window.__chaos_wipe_zustand();
        console.log("%c[Chaos Laboratory] Zustand state successfully cleared to emulate RAM swap-out!", "color: #5856d6; font-weight: bold;");
      } else {
        console.warn("[Chaos Suspend] Zustand binder not yet active. Clearing local storage session variables instead.");
        // Clear non-db memory
        sessionStorage.clear();
      }
    } catch (e) {
      console.error("[Chaos Suspend] Failed during state wipe:", e);
    }
  };

  console.log("%c[Chaos Laboratory] Amnesia Trigger (chaos.suspend.js) registered! Trigger with window.__chaos_trigger_amnesia()", "color: #5856d6; font-weight: bold;");
})();
