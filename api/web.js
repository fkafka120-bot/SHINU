// api/web.js — DESU Multi-Provider AI, Dynamic Code Synthesizer (Three.js / Canvas / Audio) & Omni-Search
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
};

const fetchWithTimeout = async (url, options = {}, ms = 5500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const STOP = new Set(
    'a an the is are was were of in on at to for from and or your my me you i it this that what who how why when where which do does did can could would should tell about explain define describe give show write'.split(' ')
);

const toks = s =>
    (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));

const isBadResponse = txt => {
    if (!txt || typeof txt !== 'string') return true;
    const t = txt.trim();
    return (
        t.length < 2 ||
        t.includes('Free limit reached') ||
        t.includes('enter.pollinations.ai') ||
        t.includes('45 seconds') ||
        t.startsWith('<!DOCTYPE') ||
        t.startsWith('<html')
    );
};

async function runLLM(messages, clientKey = '') {
    const groqKey = (clientKey && clientKey.startsWith('gsk_')) ? clientKey : process.env.GROQ_API_KEY;
    const geminiKey = (clientKey && clientKey.startsWith('AIza')) ? clientKey : process.env.GEMINI_API_KEY;
    const openRouterKey = (clientKey && clientKey.startsWith('sk-or-')) ? clientKey : process.env.OPENROUTER_API_KEY;

    // 1. Groq (Llama 3.3 70B - Ultra Fast)
    if (groqKey) {
        try {
            const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.4, max_tokens: 1400 })
            }, 5500);
            if (r.ok) {
                const d = await r.json();
                const text = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadResponse(text)) return text;
            }
        } catch (e) {}
    }

    // 2. Google Gemini 2.5 Flash
    if (geminiKey) {
        try {
            const sys = messages.find(m => m.role === 'system')?.content || '';
            const contents = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: sys }] },
                    contents
                })
            }, 5500);
            if (r.ok) {
                const d = await r.json();
                const text = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (!isBadResponse(text)) return text;
            }
        } catch (e) {}
    }

    // 3. OpenRouter
    if (openRouterKey) {
        try {
            const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
                body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages })
            }, 5500);
            if (r.ok) {
                const d = await r.json();
                const text = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadResponse(text)) return text;
            }
        } catch (e) {}
    }

    // 4. Zero-Key Pollinations Multi-Model Cascade
    for (const model of ['openai', 'qwen-coder', 'mistral']) {
        try {
            const r = await fetchWithTimeout('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, seed: Math.floor(Math.random() * 999999) })
            }, 5000);
            if (r.ok) {
                const d = await r.json();
                const text = (d?.choices?.[0]?.message?.content || '').trim();
                if (!isBadResponse(text)) return text;
            }
        } catch (e) {}
    }

    return null;
}

async function wikiLookup(q, strict = false, ms = 3200) {
    try {
        const cleanQ = String(q).trim();
        const qt = toks(cleanQ);
        const searchTerm = qt.length ? qt.join(' ') : cleanQ;

        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&utf8=&format=json&srlimit=5`;
        const searchRes = await fetchWithTimeout(searchUrl, { headers }, ms);
        const searchData = await searchRes.json();
        const results = searchData?.query?.search || [];
        if (!results.length) return { found: false };

        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(results[0].title)}`;
        const sumRes = await fetchWithTimeout(sumUrl, { headers }, ms);
        const sumData = await sumRes.json();
        if (!sumData || !sumData.extract || sumData.type === 'disambiguation') return { found: false };

        const relatedTopic = results.length > 1 ? results[1].title : null;
        return { found: true, summary: sumData, relatedTopic };
    } catch (e) {
        return { found: false };
    }
}

async function googleWebLookup(q, ms = 3600) {
    try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const response = await fetchWithTimeout(ddgUrl, { headers }, ms);
        const html = await response.text();
        const results = [];
        const regex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 3) {
            let rawUrl = match[1];
            const uddg = rawUrl.match(/uddg=([^&]+)/);
            if (uddg) rawUrl = decodeURIComponent(uddg[1]);
            const title = match[2].replace(/<[^>]+>/g, '').trim();
            const snippet = match[3].replace(/<[^>]+>/g, '').trim();
            if (title && /^https?:\/\//i.test(rawUrl) && !rawUrl.includes('wikipedia.org')) {
                results.push({ title, url: rawUrl, snippet });
            }
        }
        return results;
    } catch (e) { return []; }
}

async function redditLookup(q, ms = 3400) {
    try {
        const r = await fetchWithTimeout(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=3&raw_json=1`, { headers }, ms);
        if (r.ok) {
            const data = await r.json();
            if (data?.data?.children?.length) {
                return data.data.children.map(c => ({
                    title: c.data.title,
                    subreddit: c.data.subreddit,
                    score: c.data.score,
                    comments: c.data.num_comments,
                    url: `https://www.reddit.com${c.data.permalink}`
                }));
            }
        }
    } catch (e) {}
    return [];
}

async function socialLookup(platformCode, q, ms = 3600) {
    try {
        const domain = platformCode === 'insta' ? 'instagram.com' : 'facebook.com';
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${domain} ${q}`)}`;
        const response = await fetchWithTimeout(ddgUrl, { headers }, ms);
        const html = await response.text();
        const results = [];
        const regex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 3) {
            let rawUrl = match[1];
            const uddg = rawUrl.match(/uddg=([^&]+)/);
            if (uddg) rawUrl = decodeURIComponent(uddg[1]);
            const title = match[2].replace(/<[^>]+>/g, '').trim();
            const snippet = match[3].replace(/<[^>]+>/g, '').trim();
            if (title && /^https?:\/\//i.test(rawUrl) && rawUrl.includes(domain)) {
                results.push({ title, url: rawUrl, snippet });
            }
        }
        return results;
    } catch (e) { return []; }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const source = req.query.source || (req.body && req.body.source);
        const q = String(req.query.q || (req.body && req.body.q) || '').trim().slice(0, 800);
        const clientKey = String((req.body && req.body.apiKey) || '').trim();
        if (!q) return res.status(400).json({ error: 'Missing q' });

        // 1. DYNAMIC MEDIA CODE SYNTHESIZER (Three.js 3D, 2D Canvas, or Web Audio DSP)
        if (source === 'code_media') {
            const kind = (req.body && req.body.kind) || '2d';
            let sys = '';
            if (kind === '3d') {
                sys = `You are a Three.js r128 procedural 3D artist. Write ONLY raw JavaScript code (no markdown fences, no HTML) for the body of a function with signature:
(THREE, scene, camera, t, duration, state)
Rules:
- If (!state.initialized) { state.initialized = true; /* create Lights, THREE.Group/Meshes for the user's prompt and add to scene; store references on state */ }
- On every call, deterministically set positions/rotations/colors of your meshes using exact time 't' (in seconds, 0 to duration) and render.
- Represent the subject clearly using multiple recognizable 3D primitives (SphereGeometry, CylinderGeometry, BoxGeometry, ConeGeometry, TorusGeometry) with MeshStandardMaterial.
- Output ONLY valid JavaScript statements.`;
            } else if (kind === 'audio') {
                sys = `You are a Web Audio DSP sound designer. Write ONLY raw JavaScript code (no markdown fences) for the body of a sample generator function with signature:
(t, duration, Math)
where 't' is time in seconds (0 to duration), returning a single audio sample number between -1.0 and 1.0 that synthesizes the requested sound, instrument, or melody.`;
            } else {
                sys = `You are an HTML5 2D Canvas procedural animator. Write ONLY raw JavaScript code (no markdown fences) for the body of a function with signature:
(ctx, w, h, t, duration, Math)
Rules:
- Draw a complete, recognizable, detailed scene for the prompt using ctx paths, gradients, arcs, beziers, and polygons.
- All motion MUST be a deterministic function of 't' (time in seconds, 0 to duration) so scrubbing forward/backward works smoothly.
- Output ONLY valid JavaScript statements.`;
            }

            const rawCode = await runLLM([
                { role: 'system', content: sys },
                { role: 'user', content: `Write the procedural JS function body for: "${q}"` }
            ], clientKey);

            if (rawCode) {
                const cleaned = rawCode
                    .replace(/^```(?:javascript|js)?/i, '')
                    .replace(/```$/i, '')
                    .trim();
                return res.status(200).json({ code: cleaned });
            }
            return res.status(200).json({ code: null });
        }

        // 2. CONVERSATIONAL AI & STEP-BY-STEP MATH REASONING
        if (source === 'ai') {
            const body = req.body || {};
            const messages = Array.isArray(body.messages) ? body.messages : [
                { role: 'user', content: q }
            ];
            const reply = await runLLM(messages, clientKey);
            if (reply) return res.status(200).json({ reply });
            return res.status(200).json({ rateLimited: true });
        }

        // 3. OMNI-SEARCH (Google + Wikipedia + Reddit + Instagram)
        if (source === 'multisearch') {
            const [wiki, google, reddit, insta] = await Promise.all([
                wikiLookup(q, true, 3000),
                googleWebLookup(q, 3400),
                redditLookup(q, 3200),
                socialLookup('insta', q, 3400)
            ]);

            const sources = [];
            if (wiki.found && wiki.summary) {
                const wikiUrl = wiki.summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(wiki.summary.title)}`;
                sources.push({ title: `Wikipedia · ${wiki.summary.title}`, url: wikiUrl });
            }
            if (google.length > 0) {
                sources.push({ title: google[0].title, url: google[0].url });
            } else {
                sources.push({ title: `Google · ${q}`, url: `https://www.google.com/search?q=${encodeURIComponent(q)}` });
            }
            if (reddit.length > 0) {
                sources.push({ title: `Reddit · r/${reddit[0].subreddit}`, url: reddit[0].url });
            }
            if (insta.length > 0) {
                sources.push({ title: `Instagram · ${insta[0].title}`, url: insta[0].url });
            }

            return res.status(200).json({
                query: q,
                wiki: wiki.found ? {
                    title: wiki.summary.title,
                    extract: wiki.summary.extract,
                    thumbnail: wiki.summary?.thumbnail?.source || null,
                    url: wiki.summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(wiki.summary.title)}`,
                    relatedTopic: wiki.relatedTopic
                } : null,
                google,
                reddit,
                insta,
                sources
            });
        }

        if (source === 'insta' || source === 'fb') return res.status(200).json({ results: await socialLookup(source, q, 3800) });
        if (source === 'reddit') return res.status(200).json({ posts: await redditLookup(q, 3500) });
        if (source === 'wiki') return res.status(200).json(await wikiLookup(q, req.query.strict === '1', 3000));
        if (source === 'archive') {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=year&rows=4&page=1&output=json`;
            const r = await fetchWithTimeout(url, { headers }, 3500);
            const data = await r.json();
            return res.status(200).json({ docs: data?.response?.docs || [] });
        }

        return res.status(400).json({ error: 'Invalid source' });
    } catch (err) {
        return res.status(200).json({ error: true });
    }
}
