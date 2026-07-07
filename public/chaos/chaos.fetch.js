/**
 * WorkTrackerPro - Chaos Engineering Suite
 * Script 1: The Network Blackhole (chaos.fetch.js)
 * Intercepts outbound network activity to verify offline resilience and error handling.
 */

(function() {
  const originalFetch = window.fetch;

  window.__chaos_fetch_active = false;

  try {
    window.fetch = async function(...args) {
      if (!window.__chaos_fetch_active) {
        return originalFetch.apply(this, args);
      }

      const rand = Math.random();
      console.warn(`[Chaos Fetch] Intercepted request to ${args[0]}. Random factor: ${rand.toFixed(2)}`);

      if (rand < 0.3) {
        // 1. Blackhole Drop (Network Error)
        console.error(`[Chaos Fetch] Simulating connection dropout (Failed to fetch)`);
        throw new TypeError("Failed to fetch");
      } else if (rand < 0.6) {
        // 2. High Latency Fuzzing (45s freeze)
        console.warn(`[Chaos Fetch] Simulating high latency metro line freeze (45 seconds)`);
        await new Promise(resolve => setTimeout(resolve, 45000));
        return originalFetch.apply(this, args);
      } else {
        // 3. 502 Bad Gateway HTML Response
        console.error(`[Chaos Fetch] Simulating 502 Bad Gateway server failure`);
        return new Response(
          "<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1><hr>nginx/1.25.1</center></body></html>",
          {
            status: 502,
            statusText: "Bad Gateway",
            headers: { "Content-Type": "text/html" }
          }
        );
      }
    };
  } catch (e) {
    console.warn("[Chaos Fetch] Could not override window.fetch", e);
  }

  console.log("%c[Chaos Laboratory] Network Blackhole (chaos.fetch.js) registered! Toggle with window.__chaos_fetch_active = true", "color: #ff3b30; font-weight: bold;");
})();
