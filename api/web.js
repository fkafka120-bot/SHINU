// api/web.js — DESU Provider-Independent Inference & Knowledge Backend
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
};

const fetchWithTimeout = async (url, options = {}, ms = 4500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const withCap = (promise, ms) =>
    Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

const STOP = new Set(
    'a an the is are was were of in on at to for from and or your my me you i it this that what who how why when where which do does did can could would should tell about explain define describe give show write'.split(' ')
);

const toks = s =>
    (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));

// Common acronym expansion so short queries like "AI" resolve accurately
const ACRONYMS = {
    ai: 'Artificial intelligence',
    ml: 'Machine learning',
    llm: 'Large language model',
    nlp: 'Natural language processing',
    cpu: 'Central processing unit',
    gpu: 'Graphics processing unit',
    api: 'Application programming interface',
    dna: 'DNA',
    rna: 'RNA'
};

async function wikiLookup(q, strict, ms = 3200) {
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
    if (!sumData || !sumData.extract) return { found: false };
    if (strict && sumData.type === 'disambiguation') return { found: false };

    const relatedTopic = pool.length > 1 ? pool[1].title : null;
    return { found: true, summary: sumData, relatedTopic };
}

// ============================================================================
// PROVIDER-INDEPENDENT AI INFERENCE ROUTER
// Cascades across: 1. Env-Configured Providers (Groq/OpenRouter/Gemini) -> 2. Free Multi-Endpoint Fallback
// ============================================================================
const isBadResponse = txt => {
    if (!txt || typeof txt !== 'string') return true;
    const t = txt.trim();
    if (t.length < 2) return true;
    return (
        t.includes('Free limit reached') ||
        t.includes('enter.pollinations.ai') ||
        t.includes('45 seconds') ||
        t.includes('Rate limit') ||
        t.startsWith('<!DOCTYPE') ||
        t.startsWith('<html')
    );
};

async function runProviderInference(messages) {
    // Provider A: Optional Groq Free Cloud Key (if set in Vercel Environment Variables)
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
                    temperature: 0.6,
                    max_tokens: 600
                })
            }, 4200);
            if (r.ok) {
                const d = await r.json();
                const text = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadResponse(text)) return { reply: text, provider: 'groq' };
            }
        } catch (e) {}
    }

    // Provider B: Optional OpenRouter Free Models (if set in Vercel Environment Variables)
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
            }, 4500);
            if (r.ok) {
                const d = await r.json();
                const text = d?.choices?.[0]?.message?.content?.trim();
                if (!isBadResponse(text)) return { reply: text, provider: 'openrouter' };
            }
        } catch (e) {}
    }

    // Provider C: Zero-Key OpenAI-Compatible Endpoint (`https://text.pollinations.ai/openai`)
    for (const modelName of ['openai', 'mistral', 'openai-fast']) {
        try {
            const r = await fetchWithTimeout('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages,
                    seed: Math.floor(Math.random() * 1000000)
                })
            }, 4200);
            if (r.ok) {
                const contentType = r.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const d = await r.json();
                    const text = (d?.choices?.[0]?.message?.content || d?.reply || '').trim();
                    if (!isBadResponse(text)) return { reply: text, provider: `pollinations-openai-${modelName}` };
                } else {
                    const text = (await r.text()).trim();
                    if (!isBadResponse(text)) return { reply: text, provider: `pollinations-raw-${modelName}` };
                }
            }
        } catch (e) {}
    }

    // Provider D: Legacy Root POST + Fast GET Fallback
    try {
        const lastUser = messages[messages.length - 1]?.content || '';
        const sys = messages[0]?.content || '';
        const getUrl = `https://text.pollinations.ai/${encodeURIComponent(lastUser)}?model=mistral&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent(sys.slice(0, 500))}`;
        const r = await fetchWithTimeout(getUrl, { headers }, 4200);
        if (r.ok) {
            const text = (await r.text()).trim();
            if (!isBadResponse(text)) return { reply: text, provider: 'pollinations-get' };
        }
    } catch (e) {}

    return null;
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

        // 1. CONVERSATIONAL AI ORCHESTRATOR
        if (source === 'ai') {
            const body = req.body || {};
            const history = Array.isArray(body.history) ? body.history : [];
            const memory = Array.isArray(body.memory) ? body.memory : [];
            const profile = body.profile || {};
            const mode = profile.mode || 'conversational';

            const modeInstructions = {
                conversational: 'Use a warm, natural, human-like conversational tone. Be concise, clear, and engaging.',
                educational: 'Use an Educational Mode: explain concepts step-by-step with clear structure, intuitive analogies, and foundational principles.',
                professional: 'Use a Professional Mode: deliver executive, precise, structured, and analytical responses.'
            };

            const memoryContext = memory.length
                ? `\nVerified Memory Nodes:\n` + memory.slice(-15).map(m => `- ${m.trigger}: ${m.response}`).join('\n')
                : '';

            let reference = '';
            const sources = [];
            let suggestedFollowUp = '';

            if (body.lookup) {
                const w = await withCap(wikiLookup(q, true, 2200).catch(() => null), 2500);
                if (w && w.found && w.summary) {
                    const pageUrl = w.summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(w.summary.title)}`;
                    reference = `\nVerified Reference (Wikipedia - "${w.summary.title}"): ${String(w.summary.extract).slice(0, 750)}\nUse this reference if relevant to the user's intent.`;
                    sources.push({ title: `Wikipedia · ${w.summary.title}`, url: pageUrl });
                    if (w.relatedTopic) {
                        suggestedFollowUp = w.relatedTopic;
                    }
                }
            }

            const botName = String(profile.botName || 'Desu').slice(0, 20);
            const systemPrompt = `You are ${botName}, an independent, intelligent AI assistant with your own identity and memory.
${modeInstructions[mode] || modeInstructions.conversational}
Rules:
- Never sound like a search engine or dump raw encyclopedia headers.
- Maintain context across the conversation history.
- If the user asks about themselves (their name, likes, subjects) or about you (${botName}), use the User Profile and conversation history below.
- At the very end of your response, if the topic invites deeper exploration, you may append a new line starting with "FOLLOWUP: " followed by a short 3-to-6 word topic phrase (e.g. "FOLLOWUP: how neural networks train"). Omit it for simple greetings or personal chat.
Today is ${new Date().toDateString()}.
User Profile: ${String(profile.text || 'None recorded yet.').slice(0, 600)}${reference}${memoryContext}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6).map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '').slice(0, 1200)
                })),
                { role: 'user', content: q }
            ];

            const inference = await runProviderInference(messages);
            if (inference && inference.reply) {
                let cleanReply = inference.reply;
                const fwMatch = cleanReply.match(/\n*FOLLOWUP:\s*(.+)$/i);
                if (fwMatch) {
                    suggestedFollowUp = fwMatch[1].replace(/[?.!]+$/, '').trim();
                    cleanReply = cleanReply.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim();
                }

                return res.status(200).json({
                    reply: cleanReply,
                    sources,
                    followUp: suggestedFollowUp || null,
                    provider: inference.provider
                });
            }

            // If all external LLM providers timed out, but we have a verified Wikipedia reference, synthesize a natural response locally!
            if (sources.length > 0 && reference) {
                const rawExtract = reference.replace(/^[\s\S]*?\):\s*/, '').replace(/\nUse this reference[\s\S]*$/, '');
                return res.status(200).json({
                    reply: rawExtract,
                    sources,
                    followUp: suggestedFollowUp || null,
                    provider: 'local-knowledge-synthesis'
                });
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

        // 4. Wikipedia
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
