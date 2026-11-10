// api/web.js — Vercel serverless backend for Desu
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

const withCap = (promise, ms) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

const STOP = new Set('a an the is are was were of in on at to for from and or your my me you i it this that what who how why when where which do does did can tell about explain define describe'.split(' '));
const toks = s => (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));

// Finds the Wikipedia article that really matches the query (strict = must share words with the title)
async function wikiLookup(q, strict, ms = 3000) {
    const qt = toks(q);
    const searchTerm = qt.length ? qt.join(' ') : q;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&utf8=&format=json&srlimit=5`;
    const searchRes = await fetchWithTimeout(searchUrl, { headers }, ms);
    const searchData = await searchRes.json();
    const results = searchData?.query?.search || [];
    if (!results.length) return { found: false };

    const score = r => {
        const tt = toks(r.title);
        return qt.length ? qt.filter(w => tt.includes(w)).length / qt.length : 0;
    };

    const wantsMedia = /\b(song|album|movie|film|series|band|singer)\b/i.test(q);
    const nonMedia = results.filter(r =>
        !/\((song|album|EP|film|TV series|band)\)/i.test(r.title) &&
        !/\b(studio album|lead single|television series|recording artist)\b/i.test(r.snippet)
    );
    const pool = (!wantsMedia && nonMedia.length) ? nonMedia : results;
    const best = pool.map(r => ({ r, s: score(r) })).sort((a, b) => b.s - a.s)[0];
    if (strict && best.s < 0.5) return { found: false };

    const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(best.r.title)}`;
    const sumRes = await fetchWithTimeout(sumUrl, { headers }, ms);
    const sumData = await sumRes.json();
    if (!sumData || !sumData.extract) return { found: false };
    if (strict && sumData.type === 'disambiguation') return { found: false };
    return { found: true, summary: sumData };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const source = req.query.source || (req.body && req.body.source);
        const q = String(req.query.q || (req.body && req.body.q) || '').trim().slice(0, 600);
        if (!q) return res.status(400).json({ error: 'Missing q' });

        // 1. AI (grounded with a Wikipedia reference, personalized with the user's profile)
        if (source === 'ai') {
            const body = req.body || {};
            const history = Array.isArray(body.history) ? body.history : [];
            const memory = Array.isArray(body.memory) ? body.memory : [];
            const profile = body.profile || {};

            const memoryContext = memory.length
                ? `\nKey facts:\n` + memory.slice(-15).map(m => `- ${m.trigger}: ${m.response}`).join('\n')
                : '';

            let reference = '';
            if (body.lookup) {
                const w = await withCap(wikiLookup(q, true, 2000).catch(() => null), 2500);
                if (w && w.found) {
                    reference = `\nReference (Wikipedia, "${w.summary.title}"): ${String(w.summary.extract).slice(0, 700)}\nUse the reference only if it is clearly about what the user asked; otherwise ignore it.`;
                }
            }

            const botName = String(profile.botName || 'Desu').slice(0, 20);
            const systemPrompt = `You are ${botName}, a fast, natural, accurate AI assistant. Answer directly and concisely in plain conversational paragraphs or short bullet points. Accuracy comes first: if you are not sure, say so briefly instead of guessing, and never invent facts, names, numbers or sources. If the user tells you something about themselves or gives you an instruction (like a new name for you), acknowledge it naturally. Today is ${new Date().toDateString()}. ${String(profile.text || '').slice(0, 600)} Never mention rate limits.${reference}${memoryContext}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6).map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '').slice(0, 1500)
                })),
                { role: 'user', content: q }
            ];

            const isRateLimitedText = (txt) =>
                !txt || txt.includes('Free limit reached') || txt.includes('enter.pollinations.ai') || txt.includes('45 seconds');

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
                    }, 3200);

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

        // 2. Instagram & Facebook public indexer
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
                if (title && /^https?:\/\//i.test(rawUrl) && rawUrl.includes(domain)) results.push({ title, url: rawUrl, snippet });
            }
            return res.status(200).json({ results });
        }

        // 3. Reddit (falls back to Hacker News)
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

        // 4. Wikipedia (add &strict=1 to require a close title match)
        if (source === 'wiki') {
            const result = await wikiLookup(q, req.query.strict === '1', 3000);
            return res.status(200).json(result);
        }

        // 5. Internet Archive
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
