// api/web.js — Fast Vercel Serverless Backend (Zero Rate-Limit Hang)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    };

    const fetchWithTimeout = async (url, options = {}, ms = 3800) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    };

    try {
        const source = req.query.source || (req.body && req.body.source);
        const q = req.query.q || (req.body && req.body.q);

        // 1. ULTRA-FAST MULTI-MODEL AI (Blocks 45s rate-limit errors)
        if (source === 'ai') {
            const history = (req.body && req.body.history) || [];
            const memory = (req.body && req.body.memory) || [];

            const memoryContext = memory.length
                ? `\nKey facts:\n` + memory.slice(-15).map(m => `- ${m.trigger}: ${m.response}`).join('\n')
                : '';

            const systemPrompt = `You are Shinu, a fast, natural, intelligent AI assistant. Answer directly, warmly, and concisely in plain conversational paragraphs or short bullet points. Never mention rate limits.${memoryContext}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6).map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '')
                })),
                { role: 'user', content: q }
            ];

            const isRateLimitedText = (txt) =>
                !txt || txt.includes('Free limit reached') || txt.includes('enter.pollinations.ai') || txt.includes('45 seconds');

            // Try fast models in sequence with short timeout
            for (const modelName of ['openai-fast', 'mistral', 'openai']) {
                try {
                    const aiRes = await fetchWithTimeout('https://text.pollinations.ai/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages,
                            model: modelName,
                            seed: Math.floor(Math.random() * 100000)
                        })
                    }, 3600);

                    if (aiRes.ok) {
                        const text = (await aiRes.text()).trim();
                        if (!isRateLimitedText(text)) {
                            return res.status(200).json({ reply: text });
                        }
                    }
                } catch (e) {}
            }

            return res.status(200).json({ rateLimited: true });
        }

        // 2. INSTAGRAM & FACEBOOK PUBLIC INDEXER
        if (source === 'insta' || source === 'fb') {
            const domain = source === 'insta' ? 'instagram.com' : 'facebook.com';
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${domain} ${q}`)}`;
            const response = await fetchWithTimeout(ddgUrl, { headers }, 4000);
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
                if (title && rawUrl.includes(domain)) results.push({ title, url: rawUrl, snippet });
            }
            return res.status(200).json({ results });
        }

        // 3. REDDIT
        if (source === 'reddit') {
            try {
                const r = await fetchWithTimeout(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=4&raw_json=1`, { headers }, 3500);
                if (r.ok) {
                    const data = await r.json();
                    if (data?.data?.children?.length) {
                        return res.status(200).json({ posts: data.data.children.map(c => c.data) });
                    }
                }
            } catch (e) {}
            const hn = await fetchWithTimeout(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=4`, {}, 3500);
            const hnData = await hn.json();
            return res.status(200).json({ hnHits: hnData.hits || [] });
        }

        // 4. FILTERED WIKIPEDIA (Instant 150ms Knowledge Lookup)
        if (source === 'wiki') {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&srlimit=5`;
            const searchRes = await fetchWithTimeout(searchUrl, { headers }, 3000);
            const searchData = await searchRes.json();
            const results = searchData?.query?.search || [];
            if (!results.length) return res.status(200).json({ found: false });

            const wantsMedia = /\b(song|album|movie|film|series|band|singer)\b/i.test(q);
            let chosen = results[0];
            if (!wantsMedia) {
                const nonMedia = results.find(r =>
                    !/\((song|album|EP|film|TV series|band)\)/i.test(r.title) &&
                    !/\b(studio album|lead single|television series|recording artist)\b/i.test(r.snippet)
                );
                if (nonMedia) chosen = nonMedia;
            }

            const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(chosen.title)}`;
            const sumRes = await fetchWithTimeout(sumUrl, { headers }, 3000);
            const sumData = await sumRes.json();
            return res.status(200).json({ found: true, summary: sumData });
        }

        // 5. INTERNET ARCHIVE
        if (source === 'archive') {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=year&rows=4&page=1&output=json`;
            const r = await fetchWithTimeout(url, { headers }, 3500);
            const data = await r.json();
            return res.status(200).json({ docs: data?.response?.docs || [] });
        }

        return res.status(400).json({ error: 'Invalid source' });
    } catch (err) {
        return res.status(200).json({ rateLimited: true });
    }
}
