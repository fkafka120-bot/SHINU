// engine.js — DESU Orchestration, DESUCore Source & Follow-Up Integration
const menuToggle = document.getElementById('menuToggle');
const sideDrawer = document.getElementById('sideDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const centerStage = document.getElementById('centerStage');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const historyList = document.getElementById('historyList');
const newChatBtn = document.getElementById('newChatBtn');
const topicText = document.getElementById('topicText');
const quickHelpBtn = document.getElementById('quickHelpBtn');
const headerBrainPill = document.getElementById('headerBrainPill');

const trainModal = document.getElementById('trainModal');
const openTrainModalBtn = document.getElementById('openTrainModalBtn');
const closeTrainModal = document.getElementById('closeTrainModal');
const trainTriggerInput = document.getElementById('trainTriggerInput');
const trainResponseInput = document.getElementById('trainResponseInput');
const saveTrainBtn = document.getElementById('saveTrainBtn');
const harvestNowBtn = document.getElementById('harvestNowBtn');
const clearJunkBtn = document.getElementById('clearJunkBtn');
const exportBrainBtn = document.getElementById('exportBrainBtn');
const crawlerStatusText = document.getElementById('crawlerStatusText');
const memoryList = document.getElementById('memoryList');
const brainCountBadge = document.getElementById('brainCountBadge');

function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function safeUrl(u) { return /^https?:\/\//i.test(String(u)) ? String(u) : '#'; }

function formatCleanMarkdown(raw) {
    let safe = escapeHtml(raw);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/^\s*[-*]\s+/gm, '• ');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
}

menuToggle.onclick = () => { sideDrawer.classList.toggle('open'); drawerBackdrop.classList.toggle('active'); };
drawerBackdrop.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); };

// ============================================================================
// 1. NEURAL MEMORY DATABASE
// ============================================================================
const CORE_SEEDS = [
    { id: 's1', trigger: 'violence', response: 'Violence causes physical and psychological harm, erodes trust, and escalates conflict. Constructive dialogue, empathy, and the rule of law are the foundation of lasting resolution.', source: 'Core Knowledge' },
    { id: 's2', trigger: 'human behaviour', response: 'Human behaviour is the potential and expressed capacity for physical, mental, and social activity throughout human life, shaped by biology, psychology, culture, and environment.', source: 'Core Knowledge' },
    { id: 's3', trigger: 'curvature', response: 'In mathematics and physics, curvature measures how much a geometric object or spacetime deviates from being flat.', source: 'Core Knowledge' },
    { id: 's4', trigger: 'ai', response: 'Artificial intelligence (AI) is the capability of computational systems to perform tasks associated with human intelligence—such as learning, reasoning, problem-solving, perception, and decision-making.', source: 'Core Knowledge' }
];

let brain = [];
try {
    const saved = JSON.parse(load('shinu_brain_v3') || '[]');
    const cleaned = Array.isArray(saved)
        ? saved.filter(n => n && n.response && !n.response.includes('Free limit reached') && !n.response.includes('pollinations'))
        : [];
    brain = cleaned.length ? cleaned : [...CORE_SEEDS];
    store('shinu_brain_v3', JSON.stringify(brain));
} catch (e) { brain = [...CORE_SEEDS]; }

function saveBrain() {
    brain = brain.filter(n => n && n.response && !n.response.includes('Free limit reached'));
    if (brain.length > 250) brain = brain.slice(-250);
    store('shinu_brain_v3', JSON.stringify(brain));
    renderBrainUI();
}

function teachShinu(triggerRaw, responseRaw, source = 'Trained') {
    if (!responseRaw || responseRaw.includes('Free limit reached')) return null;
    const trigger = triggerRaw.toLowerCase().replace(/^(teach|learn|train)\s*:?\s*/i, '').replace(/[?.!,;:]+$/, '').trim();
    const response = responseRaw.trim();
    if (!trigger || !response) return null;

    const idx = brain.findIndex(b => b.trigger === trigger);
    const node = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), trigger, response, source, timestamp: Date.now() };
    if (idx >= 0) brain[idx] = node;
    else brain.push(node);
    saveBrain();
    return node;
}

function forgetTrigger(t) {
    brain = brain.filter(b => b.trigger !== t);
    saveBrain();
}

// Only matches direct concept lookups (so "How do I play the violin?" goes to AI instead of repeating the "violin" definition!)
function findMemoryMatch(query) {
    const q = query.toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    if (/^(how|why|when|where|can|could|should|would|write|code|compare|difference)\b/i.test(q)) {
        return brain.find(b => b.trigger === q) || null;
    }
    const stripped = Learn.core(query);
    return brain.find(b => b.trigger === q || b.trigger === stripped) || null;
}

function renderBrainUI() {
    brainCountBadge.textContent = `${brain.length}`;
    headerBrainPill.textContent = `🧠 ${brain.length}`;
    memoryList.innerHTML = '';
    [...brain].reverse().forEach(node => {
        const div = document.createElement('div');
        div.className = 'memory-node';
        div.innerHTML = `
            <div style="flex:1; min-width:0;">
                <strong>${escapeHtml(node.trigger)} <span style="font-size:10px; opacity:0.6;">(${escapeHtml(node.source || 'Memory')})</span></strong>
                <div style="color:var(--text-main); word-break:break-word;">${escapeHtml(node.response)}</div>
            </div>`;
        const del = document.createElement('button');
        del.textContent = '✕';
        del.onclick = () => { brain = brain.filter(b => b.id !== node.id); saveBrain(); };
        div.appendChild(del);
        memoryList.appendChild(div);
    });
}

async function deepLearnTopic(topicRaw, sourceLabel = 'Web Synthesis', strict = false) {
    const topic = topicRaw.replace(/^(teach\s+me\s+|teach|learn|train)\s*:?\s*/i, '').trim();
    if (!topic) return null;

    headerBrainPill.classList.add('learning');
    crawlerStatusText.textContent = `⚡ Learning "${topic}"...`;

    try {
        const res = await fetch(`/api/web?source=wiki&q=${encodeURIComponent(topic)}${strict ? '&strict=1' : ''}`);
        const data = await res.json();
        if (data?.found && data.summary?.extract) {
            const concise = data.summary.extract.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
            const node = teachShinu(topic, concise, sourceLabel);
            crawlerStatusText.textContent = `🟢 Learned: "${data.summary.title}"`;
            const pageUrl = data.summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.summary.title)}`;
            return { ...node, sourceUrl: pageUrl, sourceTitle: `Wikipedia · ${data.summary.title}`, relatedTopic: data.relatedTopic };
        }
        crawlerStatusText.textContent = `🟡 Couldn't find "${topic}"`;
    } catch (e) {
        crawlerStatusText.textContent = '🔴 Offline, try again';
    } finally {
        setTimeout(() => headerBrainPill.classList.remove('learning'), 500);
    }
    return null;
}

headerBrainPill.onclick = () => { renderBrainUI(); trainModal.classList.add('open'); };
openTrainModalBtn.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); renderBrainUI(); trainModal.classList.add('open'); };
closeTrainModal.onclick = () => trainModal.classList.remove('open');

saveTrainBtn.onclick = async () => {
    const trig = trainTriggerInput.value.trim();
    const resp = trainResponseInput.value.trim();
    if (!trig) return;
    if (resp) teachShinu(trig, resp, 'Custom');
    else await deepLearnTopic(trig, 'Auto-Learned', true);
    trainTriggerInput.value = '';
    trainResponseInput.value = '';
};

harvestNowBtn.onclick = async () => {
    const topic = trainTriggerInput.value.trim() || 'Artificial intelligence';
    await deepLearnTopic(topic, 'Web Synthesis', true);
};

clearJunkBtn.onclick = () => {
    brain = [...CORE_SEEDS];
    saveBrain();
    crawlerStatusText.textContent = '🟢 Reset to clean core memory';
};

exportBrainBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(brain, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'desu_memory.json';
    a.click();
};

renderBrainUI();

// ============================================================================
// 2. SOCIAL & WEB CONNECTORS (With Source Attribution Metadata)
// ============================================================================
async function searchSocialPlatform(platformCode, rawQuery) {
    // Strip conversational filler like "Instagram I'd of salman khan" -> "salman khan"
    const clean = rawQuery
        .replace(/^(search\s+)?(instagram|insta|ig|facebook|fb)\s*:?\s*/i, '')
        .replace(/^(?:id|i'd|account|profile|handle|page)\s+(?:of|for)\s+/i, '')
        .trim();
    const label = platformCode === 'insta' ? 'Instagram' : 'Facebook';
    const handleClean = clean.replace(/^@/, '').replace(/\s+/g, '');

    try {
        const res = await fetch(`/api/web?source=${platformCode}&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        const sources = [];
        let html = `Here are the top public ${label} profiles and posts for <strong>${escapeHtml(clean)}</strong>:`;

        if (data?.results?.length > 0) {
            data.results.forEach(item => {
                sources.push({ title: item.title, url: item.url });
                html += `<div class="result-item"><a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a><div class="result-meta">${escapeHtml(item.snippet)}</div></div>`;
            });
        } else {
            const directUrl = platformCode === 'insta' ? `https://www.instagram.com/${encodeURIComponent(handleClean)}/` : `https://www.facebook.com/public/${encodeURIComponent(clean)}`;
            sources.push({ title: `${label} · ${clean}`, url: directUrl });
        }
        return { text: html, isHtml: true, sources };
    } catch (e) {
        return { text: `Could not reach ${label} right now.`, isHtml: false };
    }
}

async function searchReddit(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(reddit|r\/)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=reddit&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        const sources = [];
        if (data?.posts?.length > 0) {
            let html = `Top Reddit discussions on <strong>${escapeHtml(clean)}</strong>:`;
            data.posts.forEach(post => {
                const url = `https://www.reddit.com${post.permalink}`;
                sources.push({ title: `r/${post.subreddit}`, url });
                html += `<div class="result-item"><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a><div class="result-meta">r/${escapeHtml(post.subreddit)} • ⬆ ${post.score} • 💬 ${post.num_comments}</div></div>`;
            });
            return { text: html, isHtml: true, sources, followUp: `${clean} community opinions` };
        }
        if (data?.hnHits?.length > 0) {
            let html = `Community discussions for <strong>${escapeHtml(clean)}</strong>:`;
            data.hnHits.forEach(hit => {
                const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
                sources.push({ title: hit.title, url });
                html += `<div class="result-item"><a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener">${escapeHtml(hit.title)}</a><div class="result-meta">⬆ ${hit.points || 0} • 💬 ${hit.num_comments || 0}</div></div>`;
            });
            return { text: html, isHtml: true, sources };
        }
    } catch (e) {}
    return { text: `No Reddit discussions found for "${escapeHtml(clean)}".`, isHtml: false };
}

async function searchWikipedia(rawQuery, strict = false) {
    const clean = Learn.core(rawQuery.replace(/^(search\s+)?(wikipedia|wiki)\s*:?\s*/i, ''));
    if (!clean) return null;
    try {
        const res = await fetch(`/api/web?source=wiki&q=${encodeURIComponent(clean)}${strict ? '&strict=1' : ''}`);
        const data = await res.json();
        if (!data?.found || !data.summary?.extract) return null;

        const s = data.summary;
        const pageUrl = s?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title)}`;
        teachShinu(s.title.toLowerCase(), s.extract.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '), 'Learned');

        // Natural human-like paragraph (No search-engine title header)
        let html = '';
        if (s.thumbnail?.source) {
            html += `<img class="wiki-thumb" src="${escapeHtml(safeUrl(s.thumbnail.source))}" alt="${escapeHtml(s.title)}" loading="lazy" />`;
        }
        html += `<div>${escapeHtml(s.extract)}</div>`;
        return {
            text: html,
            rawText: s.extract,
            isHtml: true,
            sources: [{ title: `Wikipedia · ${s.title}`, url: pageUrl }],
            followUp: data.relatedTopic || `how ${s.title} works`
        };
    } catch (e) { return null; }
}

async function searchArchive(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(internet\s+archive|archive|ia)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=archive&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!data?.docs?.length) return { text: `No Internet Archive records found for "${escapeHtml(clean)}".`, isHtml: false };
        const sources = [];
        let html = `Internet Archive records for <strong>${escapeHtml(clean)}</strong>:`;
        data.docs.forEach(doc => {
            const link = `https://archive.org/details/${encodeURIComponent(doc.identifier)}`;
            sources.push({ title: doc.title || doc.identifier, url: link });
            html += `<div class="result-item"><a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(doc.title || doc.identifier)}</a><div class="result-meta">${escapeHtml([doc.mediatype, doc.year].filter(Boolean).join(' • '))}</div></div>`;
        });
        return { text: html, isHtml: true, sources };
    } catch (e) { return { text: `Unable to reach Internet Archive.`, isHtml: false }; }
}

// ============================================================================
// 3. STRICT PRIORITY ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory) {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Multiplication Tables ("Table of 2", "Write table of 2") & Math Expressions
    const tableMatch = raw.match(/^(?:write\s+|print\s+|show\s+|give\s+me\s+)?(?:the\s+)?table\s+of\s+(\d+)$/i);
    if (tableMatch) {
        const n = parseInt(tableMatch[1], 10);
        let out = `Here is the multiplication table of <strong>${n}</strong>:<br><br>`;
        for (let i = 1; i <= 10; i++) out += `${n} × ${i} = <strong>${n * i}</strong><br>`;
        return { text: out, isHtml: true, followUp: `table of ${n + 1}` };
    }

    let mathStr = lower
        .replace(/^(what is|calculate|solve)\s+/i, '')
        .replace(/divided by/g, '/')
        .replace(/plus/g, '+')
        .replace(/minus/g, '-')
        .replace(/times|multiplied by/g, '*')
        .replace(/x/g, '*')
        .replace(/\^/g, '**')
        .replace(/[?=]/g, '');

    if (/^[0-9+\-*/().%\s]+$/.test(mathStr) && /[0-9]/.test(mathStr) && /[+\-*/%]/.test(mathStr)) {
        try {
            const val = Function('"use strict"; return (' + mathStr + ')')();
            if (typeof val === 'number' && isFinite(val)) return { text: `${raw.replace(/[?=]+$/, '')} = <strong>${val}</strong>`, isHtml: true };
        } catch (e) {}
    }

    // 2. Explicit Teaching Commands ("teach: x = y", "teach: calculus", "teach me violin")
    if (/^teach\s+me\s*$/i.test(raw)) {
        return { text: `What topic would you like to explore or teach me? Try <code>teach: calculus</code> or <code>teach: topic = answer</code>.`, isHtml: true };
    }

    const teachPair = raw.match(/^(?:teach|learn|train)\s*:?\s*(.+?)\s*(?:=>|->|=)\s*(.+)$/i);
    if (teachPair) {
        const node = teachShinu(teachPair[1], teachPair[2], 'Custom');
        if (!node) return { text: 'Use: <code>teach: topic = answer</code>', isHtml: true };
        return { text: `Got it. I've committed <strong>"${escapeHtml(node.trigger)}"</strong> to my neural memory.`, isHtml: true };
    }

    const teachTopic = raw.match(/^(?:teach\s+me|teach|learn|train)\s*:?\s+(.+)$/i);
    if (teachTopic) {
        const node = await deepLearnTopic(teachTopic[1], 'Web Synthesis', false);
        if (node) {
            return {
                text: `${escapeHtml(node.response)}`,
                isHtml: true,
                sources: node.sourceUrl ? [{ title: node.sourceTitle, url: node.sourceUrl }] : [],
                followUp: node.relatedTopic || `practical applications of ${node.trigger}`
            };
        }
        return { text: `I couldn't find a verified source for that topic yet. You can teach me directly with <code>teach: ${escapeHtml(teachTopic[1])} = answer</code>.`, isHtml: true };
    }

    // 3. Repetition Command
    const repeatMatch = raw.match(/^(?:write|say|repeat|type|print)\s+(.+?)\s+(\d+)[\s.]*times?\b/i);
    if (repeatMatch) {
        const word = repeatMatch[1].replace(/^["']|["']$/g, '');
        const count = Math.min(parseInt(repeatMatch[2], 10), 500);
        return { text: Array(count).fill(word).join(' '), isHtml: false };
    }

    // 4. Identity, User Profile Recall & Response Modes (Handles "What's your name", "Which subject I like", "mode: educational")
    const prof = Learn.observe(raw);
    if (prof) return prof;

    // 5. Greetings
    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    // 6. Explicit Social & Web Prefixes
    if (/^(search\s+)?(instagram|insta|ig)\b/i.test(lower)) return await searchSocialPlatform('insta', raw);
    if (/^(search\s+)?(facebook|fb)\b/i.test(lower)) return await searchSocialPlatform('fb', raw);
    if (/^(search\s+)?(reddit|r\/)\b/i.test(lower)) return await searchReddit(raw);
    if (/^(search\s+)?(internet\s+archive|archive|ia)\b/i.test(lower)) return await searchArchive(raw);
    if (/^(search\s+)?(wikipedia|wiki)\b/i.test(lower)) {
        const w = await searchWikipedia(raw);
        if (w) return w;
    }

    // Track interest for non-personal factual topics
    const isPersonalOrMeta = /\b(i|my|me|you|your|desu|shinu|earlier|mentioned)\b/i.test(lower);
    const lookup = !isPersonalOrMeta && (/^(who|what|when|where|why|how|which|tell me about|explain|define|describe|meaning of)\b/i.test(raw) || raw.split(/\s+/).length <= 3);
    if (lookup) Learn.trackInterest(raw);

    // 7. Instant Neural Memory Hit (for direct definitions/rules)
    const mem = findMemoryMatch(raw);
    if (mem) {
        return {
            text: formatCleanMarkdown(mem.response),
            isHtml: true,
            followUp: `deeper concepts in ${mem.trigger}`
        };
    }

    // 8. Provider-Independent Conversational AI (Grounded with Wikipedia reference + History + Profile)
    try {
        const recent = (chatHistory || []).slice(-6).map(m => ({ role: m.role, rawText: m.rawText || m.text }));
        const res = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: 'ai',
                q: raw,
                history: recent,
                memory: brain.filter(n => n.source !== 'Auto').slice(-15),
                profile: Learn.context(),
                lookup
            })
        });
        const data = await res.json();
        if (data && data.reply && !data.rateLimited) {
            return {
                text: formatCleanMarkdown(data.reply),
                rawText: data.reply,
                isHtml: true,
                fromAI: true,
                sources: data.sources || [],
                followUp: data.followUp || null
            };
        }
    } catch (e) {}

    // 9. Smart Context Fallback for Conversation History Questions ("Which subject did I mention earlier?")
    if (isPersonalOrMeta && chatHistory && chatHistory.length) {
        const prevUserMsgs = chatHistory.filter(m => m.role === 'user').map(m => m.rawText || m.text);
        if (prevUserMsgs.length) {
            return {
                text: `Earlier in our conversation, you mentioned: <em>"${escapeHtml(prevUserMsgs.slice(-3).join('", "'))}"</em>.`,
                isHtml: true
            };
        }
    }

    // 10. Verified Wikipedia Synthesis Fallback (Only for non-personal factual lookups)
    if (lookup) {
        const wikiReply = await searchWikipedia(raw, false);
        if (wikiReply) return wikiReply;
    }

    return {
        text: `I'm ready to learn about <strong>${escapeHtml(raw)}</strong>. Teach me directly with <code>teach: ${escapeHtml(raw)} = [explanation]</code>, or ask me to look up a specific concept!`,
        isHtml: true
    };
}

// ============================================================================
// 4. CHAT SESSION, DESUCORE SOURCE BARS & CLICKABLE FOLLOW-UPS
// ============================================================================
let chats = [];
try { chats = JSON.parse(load('shinu_chats') || '[]'); } catch (e) { chats = []; }
let currentId = null;
let busy = false;

function saveChats() { store('shinu_chats', JSON.stringify(chats)); }
function currentChat() { return chats.find(c => c.id === currentId) || null; }

function addBubble(role, content, isHtml = false, autoScroll = true, meta = {}) {
    const div = document.createElement('div');
    div.className = 'message-bubble ' + role;
    if (isHtml) div.innerHTML = content;
    else div.textContent = content;

    // Attach DESUCore Source Attribution Bar (if sources were actually used)
    if (role === 'bot' && window.DESUCore && Array.isArray(meta.sources) && meta.sources.length > 0) {
        const sourceBar = window.DESUCore.createSourceBar(meta.sources);
        if (sourceBar) div.appendChild(sourceBar);
    }

    // Attach DESUCore Smart Follow-Up Suggestion (clickable to continue conversation!)
    if (role === 'bot' && window.DESUCore && meta.followUp) {
        const followEl = window.DESUCore.createFollowUp(meta.followUp);
        if (followEl) {
            followEl.style.cursor = 'pointer';
            followEl.onclick = () => {
                userInput.value = `Tell me about ${meta.followUp}`;
                handleSend();
            };
            div.appendChild(followEl);
        }
    }

    chatContainer.appendChild(div);
    if (autoScroll) {
        if (role === 'bot') chatContainer.scrollTo({ top: Math.max(0, div.offsetTop - 8), behavior: 'smooth' });
        else chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    return div;
}

function closeDrawer() {
    sideDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
}

function renderHistory() {
    historyList.innerHTML = '';
    if (!chats.length) {
        historyList.innerHTML = '<div class="history-empty">No chats yet.</div>';
        return;
    }
    [...chats].reverse().forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id === currentId ? ' active' : '');
        item.innerHTML = `<span class="title">${escapeHtml(chat.topic || 'Chat')}</span>`;
        const del = document.createElement('button');
        del.className = 'del';
        del.textContent = '✕';
        del.onclick = (e) => {
            e.stopPropagation();
            chats = chats.filter(c => c.id !== chat.id);
            saveChats();
            if (chat.id === currentId) startNewChat(false);
            else renderHistory();
        };
        item.onclick = () => {
            currentId = chat.id;
            chatContainer.innerHTML = '';
            chat.messages.forEach(m => addBubble(m.role, m.text, m.isHtml, false, { sources: m.sources, followUp: m.followUp }));
            chatContainer.scrollTop = chatContainer.scrollHeight;
            centerStage.classList.add('dissolved');
            chatContainer.classList.add('active');
            topicText.textContent = chat.topic || Learn.botName();
            renderHistory();
            closeDrawer();
        };
        item.appendChild(del);
        historyList.appendChild(item);
    });
}

function startNewChat(close = true) {
    currentId = null;
    chatContainer.innerHTML = '';
    centerStage.classList.remove('dissolved');
    chatContainer.classList.remove('active');
    topicText.textContent = Learn.botName();
    renderHistory();
    if (close) closeDrawer();
}
newChatBtn.onclick = () => startNewChat(true);

userInput.addEventListener('focus', () => {
    centerStage.classList.add('dissolved');
    chatContainer.classList.add('active');
});

quickHelpBtn.onclick = () => {
    centerStage.classList.add('dissolved');
    chatContainer.classList.add('active');
    addBubble('bot', `
        <strong>DESU Guide & Modes (Current: ${escapeHtml(Learn.mode())}):</strong><br>
        • <strong>Switch Modes:</strong> Type <code>conversational mode</code>, <code>educational mode</code>, or <code>professional mode</code>.<br>
        • <strong>Personal Memory:</strong> Say <code>my name is …</code>, <code>I like physics</code>, or ask <code>which subject do I like?</code><br>
        • <strong>Web & Social:</strong> Prefix with <code>insta</code>, <code>fb</code>, <code>reddit</code>, <code>wiki</code>, or <code>archive</code>.<br>
        • <strong>Knowledge Training:</strong> Type <code>teach: topic</code> or <code>teach: topic = answer</code>.
    `, true);
};

async function handleSend() {
    const text = userInput.value.trim();
    if (!text || busy) return;
    busy = true;

    try {
        centerStage.classList.add('dissolved');
        chatContainer.classList.add('active');

        let chat = currentChat();
        if (!chat) {
            chat = { id: Date.now().toString(36), topic: Learn.makeTopic(text), messages: [] };
            chats.push(chat);
            currentId = chat.id;
            chatContainer.innerHTML = '';
        }
        topicText.textContent = chat.topic;

        const historySnapshot = [...chat.messages];
        chat.messages.push({ role: 'user', text, rawText: text, isHtml: false });
        addBubble('user', text, false);
        saveChats();
        renderHistory();

        userInput.value = '';

        const typing = document.createElement('div');
        typing.className = 'message-bubble bot';
        typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
        chatContainer.appendChild(typing);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        let replyObj;
        try { replyObj = await shinuReply(text, historySnapshot); }
        catch (e) { replyObj = { text: 'Something went wrong on my side. Please try again.', isHtml: false }; }
        typing.remove();

        chat.messages.push({
            role: 'bot',
            text: replyObj.text,
            rawText: replyObj.rawText || replyObj.text,
            isHtml: replyObj.isHtml,
            sources: replyObj.sources || [],
            followUp: replyObj.followUp || null
        });
        saveChats();
        const bubble = addBubble('bot', replyObj.text, replyObj.isHtml, true, {
            sources: replyObj.sources,
            followUp: replyObj.followUp
        });

        if (replyObj.fromAI) {
            Learn.cacheReply(text, replyObj.rawText);
            Learn.attachFeedback(bubble, text, replyObj.rawText);
        }
    } finally {
        busy = false;
    }
}

document.getElementById('sendBtn').onclick = handleSend;
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
renderHistory();
topicText.textContent = Learn.botName();
