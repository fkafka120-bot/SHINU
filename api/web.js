// api/web.js — Vercel Serverless Backend (LLM + Social + Web Search)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    try {
        // 1. REAL CONVERSATIONAL LLM BRAIN (POST or GET)
        const source = req.query.source || (req.body && req.body.source);
        const q = req.query.q || (req.body && req.body.q);

        if (source === 'ai') {
            const history = (req.body && req.body.history) || [];
            const memory = (req.body && req.body.memory) || [];

            const memoryContext = memory.length
                ? `\nLearned Neural Memory:\n` + memory.slice(-25).map(m => `- ${m.trigger}: ${m.response}`).join('\n')
                : '';

            const systemPrompt = `You are Shinu, a brilliant, direct, context-aware AI assistant created by David.
Rules:
1. Always answer the user's actual intent directly and intelligently.
2. Follow commands literally (e.g. if asked to write a word N times, do it; if asked to code, write clean code).
3. Maintain full context of previous messages in the conversation. Never return random song or movie titles unless explicitly asked about music/movies.
4. Keep responses concise, insightful, and well-structured.${memoryContext}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.slice(-8).map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '')
                })),
                { role: 'user', content: q }
            ];

            // Primary Free LLM Endpoint (Pollinations OpenAI-compatible POST)
            try {
                const aiRes = await fetch('https://text.pollinations.ai/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, model: 'openai', seed: 42 })
                });
                if (aiRes.ok) {
                    const text = await aiRes.text();
                    if (text && text.trim().length > 1) {
                        return res.status(200).json({ reply: text.trim(), source: 'Shinu Neural LLM' });
                    }
                }
            } catch (e) {}

            // Fallback GET LLM Endpoint
            const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(q)}?model=openai&system=${encodeURIComponent(systemPrompt)}`;
            const fbRes = await fetch(fallbackUrl);
            const fbText = await fbRes.text();
            return res.status(200).json({ reply: fbText.trim(), source: 'Shinu Neural LLM' });
        }

        // 2.INSTAGRAM & FACEBOOK PUBLIC WEB INDEXER (Free $0 via DuckDuckGo Lite HTML Scraper)
        if (source === 'insta' || source === 'fb') {
            const domain = source === 'insta' ? 'instagram.com' : 'facebook.com';
            const platformName = source === 'insta' ? 'Instagram' : 'Facebook';
            const searchQuery = `site:${domain} ${q}`;
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

            const response = await fetch(ddgUrl, { headers });
            const html = await response.text();

            const results = [];
            const regex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = regex.exec(html)) !== null && results.length < 4) {
                let rawUrl = match[1];
                const uddg = rawUrl.match(/uddg=([^&]+)/);
                if (uddg) rawUrl = decodeURIComponent(uddg[1]);
                const title = match[2].replace(/<[^>]+>/g, '').trim();
                const snippet = match[3].replace(/<[^>]+>/g, '').trim();
                if (title && rawUrl.includes(domain)) {
                    results.push({ title, url: rawUrl, snippet });
                }
            }

            return res.status(200).json({ platform: platformName, domain, results });
        }

        // 3. SERVER-SIDE REDDIT SEARCH (Never blocked by mobile browsers)
        if (source === 'reddit') {
            const endpoints = [
                `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=4&raw_json=1`,
                `https://old.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=4&raw_json=1`
            ];
            for (const ep of endpoints) {
                try {
                    const r = await fetch(ep, { headers });
                    if (r.ok) {
                        const data = await r.json();
                        if (data?.data?.children?.length) {
                            return res.status(200).json({ posts: data.data.children.map(c => c.data) });
                        }
                    }
                } catch (e) {}
            }
            // Fallback to HackerNews community search if Reddit rate-limits Vercel IP
            const hn = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=4`);
            const hnData = await hn.json();
            return res.status(200).json({ hnHits: hnData.hits || [] });
        }

        // 4. FILTERED WIKIPEDIA ENCYCLOPEDIA (Blocks songs/albums/films unless asked)
        if (source === 'wiki') {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&srlimit=5`;
            const searchRes = await fetch(searchUrl, { headers });
            const searchData = await searchRes.json();
            const results = searchData?.query?.search || [];
            if (!results.length) return res.status(200).json({ found: false });

            // Filter out random songs, albums, or TV episodes unless user explicitly asked for them
            const wantsMedia = /\b(song|album|movie|film|series|band|singer|track|ep)\b/i.test(q);
            let chosen = results[0];
            if (!wantsMedia) {
                const nonMedia = results.find(r =>
                    !/\((song|album|EP|film|TV series|band)\)/i.test(r.title) &&
                    !/\b(studio album|lead single|television series|recording artist)\b/i.test(r.snippet)
                );
                if (nonMedia) chosen = nonMedia;
            }

            const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(chosen.title)}`;
            const sumRes = await fetch(sumUrl, { headers });
            const sumData = await sumRes.json();
            return res.status(200).json({ found: true, summary: sumData });
        }

        // 5. INTERNET ARCHIVE
        if (source === 'archive') {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=year&rows=4&page=1&output=json`;
            const r = await fetch(url, { headers });
            const data = await r.json();
            return res.status(200).json({ docs: data?.response?.docs || [] });
        }

        return res.status(400).json({ error: 'Invalid source parameter' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

