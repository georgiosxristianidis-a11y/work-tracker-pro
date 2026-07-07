export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { history, targetLang } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
    }

    const prompt = `You are an AI assistant in a personal working hours tracker app. Analyze this work history and provide 3 short, analytical tips about work-life balance, overtime trends, or schedule consistency. 
CRITICAL RULES:
1. This is for a regular employee/worker. Do NOT mention clients, contracts, freelancing, raising rates, or finding new work.
2. Focus ONLY on health, schedule consistency, hours tracked, and resting patterns.
3. Respond strictly in ${targetLang}. 
4. Be extremely concise, no fluff, just 3 specific actionable points.
5. ABSOLUTELY NO EMOJIS. Use strict, corporate typographic symbols for list items (e.g., "▪" or "—").
6. Do NOT use any markdown formatting like bolding or stars.
History: ${history}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No insights available yet.";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Insight Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
