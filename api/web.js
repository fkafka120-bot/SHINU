// api/web.js — DESU Multi-Provider AI (Groq, Gemini, OpenRouter, Pollinations) & Omni-Search Backend
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
};

const fetchWithTimeout = async (url, options = {}, ms = 6500) => {
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

const ACRONYMS = {
    ai: 'Artificial intelligence',
    ml: 'Machine learning',
    llm: 'Large language model',
    nlp: 'Natural language processing',
    cpu: 'Central processing unit',
    gpu: 'Graphics processing unit',
    api: 'Application programming interface'
};

const isBadText = txt => {
    if (!txt || typeof txt !== 'string') return true;
    const t = txt.trim();
    return (
        t.length < 2 ||
        t.includes('Free limit reached') ||
        t.includes('enter.pollinations.ai') ||
        t.includes('45 seconds') ||
        t.startsWith('<!DOCTYPE')
    );
};

// Cascades across Groq -> Gemini -> OpenRouter -> Pollinations
async function runLLM(messages, maxTokens = 900) {
    // 1. Groq (Llama 3.3 70B - Ultra Fast & Free)
    if (process.env.GROQ_API_KEY) {
        try {
            const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages,
                    temperature: 0.5,
                    max_tokens: maxTokens
                })
            }, 6000);
            if (r.ok) {
                const d = await r.json();
                const reply = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadText(reply)) return { reply, provider: 'groq' };
            }
        } catch (e) {}
    }

    // 2. Google Gemini 2.5 Flash (Free via Google AI Studio)
    if (process.env.GEMINI_API_KEY) {
        try {
            const sysMsg = messages.find(m => m.role === 'system')?.content || '';
            const contents = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const r = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: sysMsg ? { parts: [{ text: sysMsg }] } : undefined,
                        contents
                    })
                },
                6500
            );
            if (r.ok) {
                const d = await r.json();
                const reply = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (!isBadText(reply)) return { reply, provider: 'gemini' };
            }
        } catch (e) {}
    }

    // 3. OpenRouter Free Tier
    if (process.env.OPENROUTER_API_KEY) {
        try {
            const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
                    messages
                })
            }, 6500);
            if (r.ok) {
                const d = await r.json();
                const reply = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadText(reply)) return { reply, provider: 'openrouter' };
            }
        } catch (e) {}
    }

    // 4. Zero-Key Fallback
    for (const model of ['openai', 'mistral']) {
        try {
            const r = await fetchWithTimeout('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, seed: Math.floor(Math.random() * 999999) })
            }, 5500);
            if (r.ok) {
                const d = await r.json();
                const reply = (d?.choices?.[0]?.message?.content || '').trim();
                if (!isBadText(reply)) return { reply, provider: `pollinations-${model}` };
            }
        } catch (e) {}
    }

    return null;
}

async function wikiLookup(q, strict = false, ms = 3200) {
    try {
        const cleanQ = String(q).trim();
        const expanded = ACRONYMS[cleanQ.toLowerCase()] || cleanQ;
        const qt = toks(expanded);
        const searchTerm = qt.length ? qt.join(' ') : expanded;

        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&utf8=&format=json&srlimit=5`;
        const searchRes = await fetchWithTimeout(searchUrl, { headers }, ms);
        const searchData = await searchRes.json();
        const results = searchData?.query?.search || [];
        if (!results.length) return { found: false };

        const score = r => {
            const tt = toks(r.title);
            if (r.title.toLowerCase() === expanded.toLowerCase()) return 1;
            return qt.length ? qt.filter(w => tt.includes(w)).length / qt.length : 0;
        };

        const wantsMedia = /\b(song|album|movie|film|series|band|singer)\b/i.test(cleanQ);
        const nonMedia = results.filter(r =>
            !/\((song|album|EP|film|TV series|band|video game)\)/i.test(r.title) &&
            !/\b(studio album|lead single|television series|recording artist|video game)\b/i.test(r.snippet)
        );
        const pool = (!wantsMedia && nonMedia.length) ? nonMedia : results;
        const best = pool.map(r => ({ r, s: score(r) })).sort((a, b) => b.s - a.s)[0];
        if (strict && best.s < 0.5) return { found: false };

        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(best.r.title)}`;
        const sumRes = await fetchWithTimeout(sumUrl, { headers }, ms);
        const sumData = await sumRes.json();
        if (!sumData || !sumData.extract || sumData.type === 'disambiguation') return { found: false };

        const relatedTopic = pool.length > 1 ? pool[1].title : null;
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
    } catch (e) {
        return [];
    }
}

async function redditLookup(q, ms = 3400) {
    try {
        const r = await fetchWithTimeout(
            `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=3&raw_json=1`,
            { headers },
            ms
        );
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
    } catch (e) {
        return [];
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const source = req.query.source || (req.body && req.body.source);
        const q = String(req.query.q || (req.body && req.body.q) || '').trim().slice(0, 1200);
        if (!q) return res.status(400).json({ error: 'Missing q' });

        // 1. AI CHAT & DYNAMIC CODE GENERATION ROUTE
        if (source === 'ai' || source === 'codegen') {
            const body = req.body || {};
            const messages = Array.isArray(body.messages) ? body.messages : [
                { role: 'system', content: String(body.system || 'You are Desu, an intelligent AI assistant.') },
                { role: 'user', content: q }
            ];
            const out = await runLLM(messages, source === 'codegen' ? 1100 : 750);
            if (out && out.reply) {
                return res.status(200).json({ reply: out.reply, provider: out.provider });
            }
            return res.status(200).json({ rateLimited: true });
        }

        // 2. OMNI-SEARCH ROUTE
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
