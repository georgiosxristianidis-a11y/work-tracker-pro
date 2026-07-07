import { useState } from 'react';
import { db } from '../lib/db';

export function useAiInsight(
  settings: any,
  addToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void
) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cachedInsights, setCachedInsights] = useState<Record<string, string>>({});
  const [aiLangOverride, setAiLangOverride] = useState<'ENG' | 'RUS' | 'GR' | null>(null);

  const generateAiInsight = async () => {
    if (isAiLoading) return;
    if (settings.strictOfflineMode) {
      addToast('AI Insight disabled by Strict Offline Mode', 'warning');
      return;
    }
    setIsAiLoading(true);
    try {
      const allEntries = await db.getAllEntries();
      const history = allEntries.slice(0, 100).map(e => `${e.date}: ${e.hours}h`).join(', ');
      
      const langMap: Record<string, string> = { ENG: 'English', RUS: 'Russian', GR: 'Greek' };
      const currentLang = aiLangOverride || settings.language;
      const targetLang = langMap[currentLang] || 'English';

      // Advanced caching based on history hash and language
      const cacheKey = `${history}-${targetLang}`;
      if (cachedInsights[cacheKey]) {
        setAiInsight(cachedInsights[cacheKey]);
        setIsAiLoading(false);
        return;
      }

      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, targetLang })
      });
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      
      const insight = data.text || "No insights available yet.";
      setAiInsight(insight);
      
      // Update cache
      setCachedInsights(prev => ({...prev, [cacheKey]: insight}));
      
    } catch (e) {
      addToast('AI Insight failed', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  return {
    aiInsight,
    setAiInsight,
    isAiLoading,
    generateAiInsight,
    aiLangOverride,
    setAiLangOverride
  };
}
