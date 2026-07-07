/**
 * WorkTrackerPro - Chaos Engineering Suite
 * Script 2: The DB Corruptor (chaos.idb.js)
 * Connects directly to IndexedDB bypassing application ORM state to inject poisoned data rows.
 */

(function() {
  window.__chaos_corrupt_db = async function() {
    console.warn("[Chaos DB] Accessing WorkTrackerProDB for direct data poisoning...");
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("WorkTrackerProDB", 1);
      
      request.onerror = (e) => {
        console.error("[Chaos DB] Failed to open database:", e);
        reject(e);
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const transaction = db.transaction("entries", "readwrite");
          const store = transaction.objectStore("entries");
          
          const getAllReq = store.getAll();
          
          getAllReq.onsuccess = () => {
            const records = getAllReq.result;
            if (records.length === 0) {
              console.warn("[Chaos DB] No entries found to corrupt. Please create some entries first!");
              // Put a brand new corrupted entry
              const corrupted = {
                date: new Date().toISOString().split('T')[0],
                hours: "cat", // String instead of number
                month: "2026-06",
                corruptedByChaos: true
              };
              store.put(corrupted);
              console.warn("[Chaos DB] Seeded a fresh corrupted entry with 'cat' hours:", corrupted);
              resolve(true);
              return;
            }
            
            // 1. Corrupt latest entry with 'cat' value
            const latest = records[0];
            latest.hours = "cat"; // Poisoned field
            latest.corruptedByChaos = true;
            store.put(latest);
            console.warn("[Chaos DB] Poisoned latest entry. Hours changed to string 'cat':", latest);
            
            if (records.length > 1) {
              // 2. Wipe hours property entirely on another record
              const second = records[1];
              delete second.hours;
              second.corruptedByChaos = true;
              store.put(second);
              console.warn("[Chaos DB] Deleted hours field entirely from record:", second);
            }
            
            if (records.length > 2) {
              // 3. Inject massive content (1MB+) into a date record's notes or extra fields
              const third = records[2];
              const massiveGarbage = "数据损坏".repeat(150000); // Massive payload
              third.garbagePayload = massiveGarbage;
              third.corruptedByChaos = true;
              store.put(third);
              console.warn("[Chaos DB] Injected 1MB+ massive Chinese buffer garbage into entry:", third.date);
            }
            
            resolve(true);
          };
          
          transaction.oncomplete = () => {
            console.log("%c[Chaos Laboratory] Database corruption transactions committed successfully!", "color: #ff9500; font-weight: bold;");
            // Prompt app to reload database
            if (window.__chaos_reload_store) {
              window.__chaos_reload_store();
            }
          };
          
          transaction.onerror = (err) => {
            console.error("[Chaos DB] Transaction failed:", err);
            reject(err);
          };
          
        } catch(err) {
          console.error("[Chaos DB] Execution failed:", err);
          reject(err);
        }
      };
    });
  };

  console.log("%c[Chaos Laboratory] DB Corruptor (chaos.idb.js) registered! Trigger with window.__chaos_corrupt_db()", "color: #ff9500; font-weight: bold;");
})();
