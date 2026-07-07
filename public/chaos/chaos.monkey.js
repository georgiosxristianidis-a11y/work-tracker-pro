/**
 * WorkTrackerPro - Chaos Engineering Suite
 * Script 3: The Gremlin Monkey (chaos.monkey.js)
 * Executes rapid random UI clicks on interactive nodes to find layout thrashing, modal stacking, or gesture errors.
 */

(function() {
  let monkeyInterval = null;

  window.__chaos_monkey_active = false;

  window.__chaos_monkey_start = function(clicksPerSecond = 50) {
    if (monkeyInterval) {
      clearInterval(monkeyInterval);
    }
    
    window.__chaos_monkey_active = true;
    console.warn(`[Chaos Monkey] Starting Gremlin Clicker at ${clicksPerSecond} interactions/sec...`);
    
    const delay = 1000 / clicksPerSecond;
    
    monkeyInterval = setInterval(() => {
      // Find all clickable buttons and action items
      const elements = Array.from(document.querySelectorAll("button, a, [onClick], [role='button'], input[type='checkbox']"));
      if (elements.length === 0) return;
      
      // Filter out high-risk destructive buttons (like Delete All Data) to avoid accidentally wiping user storage completely without intent,
      // but click general tabs, toggles, calendars, list entries, modals.
      const safeElements = elements.filter(el => {
        const text = el.textContent || "";
        return !text.toLowerCase().includes("delete all") && 
               !text.toLowerCase().includes("clear all") &&
               !text.toLowerCase().includes("стереть все");
      });
      
      const targetList = safeElements.length > 0 ? safeElements : elements;
      const randomEl = targetList[Math.floor(Math.random() * targetList.length)];
      
      if (randomEl) {
        try {
          // Highlight target briefly for visualization
          const origBorder = randomEl.style.outline;
          randomEl.style.outline = "2px solid #ff3b30";
          setTimeout(() => {
            if (randomEl) randomEl.style.outline = origBorder;
          }, 150);
          
          // Trigger click
          randomEl.click();
          console.log(`[Chaos Monkey] Clicked:`, randomEl.tagName, randomEl.className || randomEl.textContent?.substring(0, 15));
        } catch(e) {
          console.error(`[Chaos Monkey] Failed to click element:`, e);
        }
      }
    }, delay);
  };

  window.__chaos_monkey_stop = function() {
    if (monkeyInterval) {
      clearInterval(monkeyInterval);
      monkeyInterval = null;
    }
    window.__chaos_monkey_active = false;
    console.log("%c[Chaos Laboratory] UI Gremlin Monkey Stopped!", "color: #34c759; font-weight: bold;");
  };

  console.log("%c[Chaos Laboratory] Gremlin Monkey (chaos.monkey.js) registered! Control with window.__chaos_monkey_start(Hz) / window.__chaos_monkey_stop()", "color: #af52de; font-weight: bold;");
})();
