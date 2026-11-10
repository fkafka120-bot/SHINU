// engine.js — Desu: neural memory, strict router, grounded AI replies, self-learning hooks
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
    { id: 's1', trigger: 'violence', response: 'Yes, violence is harmful and destructive. It causes physical and psychological trauma, undermines trust, and escalates conflict, whereas empathy, law, and dialogue resolve issues constructively.', source: 'Core Knowledge' },
    { id: 's2', trigger: 'human behaviour', response: 'Human behaviour is the potential and expressed capacity for physical, mental, and social activity throughout human life, shaped by genetics, psychology, social norms, and environment.', source: 'Core Knowledge' },
    { id: 's3', trigger: 'curvature', response: 'In mathematics and physics, curvature measures how much a geometric object or spacetime deviates from being flat.', source: 'Core Knowledge' }
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

// Exact match (after removing "what is / who is / tell me about"), or a short message containing a trigger
function findMemoryMatch(query) {
    const q = query.toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const stripped = Learn.core(query);
    const hit = brain.find(b => b.trigger === q || b.trigger === stripped);
    if (hit) return hit;

    if (q.split(/\s+/).length <= 4) {
        for (const node of brain) {
            if (node.trigger.length < 3) continue;
            const esc = node.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`(^|\\s)${esc}(\\s|$)`, 'i').test(q)) return node;
        }
    }
    return null;
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
                <strong>${escapeHtml(node.trigger)}</strong>
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
    const topic = topicRaw.replace(/^(teach|learn|train)\s*:?\s*/i, '').trim();
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
            return node;
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
// 2. SOCIAL & WEB CONNECTORS
// ============================================================================
async function searchSocialPlatform(platformCode, rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(instagram|insta|ig|facebook|fb)\s*:?\s*/i, '').trim();
    const label = platformCode === 'insta' ? 'Instagram' : 'Facebook';
    const handleClean = clean.replace(/^@/, '');

    try {
        const res = await fetch(`/api/web?source=${platformCode}&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        let html = `<strong>${label} results for "${escapeHtml(clean)}":</strong>`;
        if (data?.results?.length > 0) {
            data.results.forEach(item => {
                html += `<div class="result-item"><a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a><div class="result-meta">${escapeHtml(item.snippet)}</div></div>`;
            });
        }
        const directUrl = platformCode === 'insta' ? `https://www.instagram.com/${encodeURIComponent(handleClean)}/` : `https://www.facebook.com/public/${encodeURIComponent(clean)}`;
        html += `<div style="margin-top:8px;"><a href="${directUrl}" target="_blank" rel="noopener">Open "${escapeHtml(clean)}" on ${label} ↗</a></div>`;
        return html;
    } catch (e) { return `Could not reach ${label} right now.`; }
}

async function searchReddit(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(reddit|r\/)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=reddit&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data?.posts?.length > 0) {
            let html = `<strong>Reddit discussions for "${escapeHtml(clean)}":</strong>`;
            data.posts.forEach(post => {
                html += `<div class="result-item"><a href="https://www.reddit.com${escapeHtml(post.permalink)}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a><div class="result-meta">r/${escapeHtml(post.subreddit)} • ⬆ ${post.score} • 💬 ${post.num_comments}</div></div>`;
            });
            return html;
        }
        if (data?.hnHits?.length > 0) {
            let html = `<strong>Community discussions for "${escapeHtml(clean)}":</strong>`;
            data.hnHits.forEach(hit => {
                const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
                html += `<div class="result-item"><a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener">${escapeHtml(hit.title)}</a><div class="result-meta">⬆ ${hit.points || 0} • 💬 ${hit.num_comments || 0}</div></div>`;
            });
            return html;
        }
    } catch (e) {}
    return `No Reddit discussions found for "${escapeHtml(clean)}".`;
}

async function searchWikipedia(rawQuery, strict = false) {
    const clean = rawQuery.replace(/^(search\s+)?(wikipedia|wiki)\s*:?\s*/i, '').trim();
    if (!clean) return null;
    try {
        const res = await fetch(`/api/web?source=wiki&q=${encodeURIComponent(clean)}${strict ? '&strict=1' : ''}`);
        const data = await res.json();
        if (!data?.found || !data.summary?.extract) return null;

        const s = data.summary;
        const pageUrl = s?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title)}`;
        teachShinu(s.title.toLowerCase(), s.extract.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '), 'Learned');

        let html = `<strong>${escapeHtml(s.title)}</strong><br>`;
        if (s.thumbnail?.source) {
            html += `<img class="wiki-thumb" src="${escapeHtml(safeUrl(s.thumbnail.source))}" alt="${escapeHtml(s.title)}" loading="lazy" />`;
        }
        html += `<div style="margin:6px 0 8px;">${escapeHtml(s.extract)}</div>`;
        html += `<a href="${escapeHtml(safeUrl(pageUrl))}" target="_blank" rel="noopener">Wikipedia ↗</a>`;
        return html;
    } catch (e) { return null; }
}

async function searchArchive(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(internet\s+archive|archive|ia)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=archive&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!data?.docs?.length) return `No Internet Archive records found for "${escapeHtml(clean)}".`;
        let html = `<strong>Internet Archive — "${escapeHtml(clean)}":</strong>`;
        data.docs.forEach(doc => {
            const link = `https://archive.org/details/${encodeURIComponent(doc.identifier)}`;
            html += `<div class="result-item"><a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(doc.title || doc.identifier)}</a><div class="result-meta">${escapeHtml([doc.mediatype, doc.year].filter(Boolean).join(' • '))}</div></div>`;
        });
        return html;
    } catch (e) { return `Unable to reach Internet Archive.`; }
}

// ============================================================================
// 3. STRICT PRIORITY ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory) {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Math
    let mathStr = lower
        .replace(/divided by/g, '/')
        .replace(/plus/g, '+')
        .replace(/minus/g, '-')
        .replace(/times|multiplied by/g, '*')
        .replace(/x/g, '*')
        .replace(/\^/g, '**');

    if (/^[0-9+\-*/().%\s]+$/.test(mathStr) && /[0-9]/.test(mathStr) && /[+\-*/%]/.test(mathStr)) {
        try {
            const val = Function('"use strict"; return (' + mathStr + ')')();
            if (typeof val === 'number' && isFinite(val)) return { text: `${raw} = ${val}`, isHtml: false };
        } catch (e) {}
    }

    // 2. Explicit teaching commands
    const teachPair = raw.match(/^(?:teach|learn|train)\s*:?\s*(.+?)\s*(?:=>|->|=)\s*(.+)$/i);
    if (teachPair) {
        const node = teachShinu(teachPair[1], teachPair[2], 'Custom');
        if (!node) return { text: 'Use: <code>teach: topic = answer</code>', isHtml: true };
        return { text: `Got it. Learned response for <strong>"${escapeHtml(node.trigger)}"</strong>.`, isHtml: true };
    }

    const teachTopic = raw.match(/^(?:teach|learn|train)\s*:\s*(.+)$/i);
    if (teachTopic) {
        const node = await deepLearnTopic(teachTopic[1], 'Web Synthesis', true);
        if (node) return { text: `<strong>${escapeHtml(node.trigger)}</strong> — ${escapeHtml(node.response)}`, isHtml: true };
        return { text: `I couldn't find a reliable source for that. Teach me directly with <code>teach: topic = answer</code>.`, isHtml: true };
    }

    // 3. Repetition command
    const repeatMatch = raw.match(/^(?:write|say|repeat|type|print)\s+(.+?)\s+(\d+)[\s.]*times?\b/i);
    if (repeatMatch) {
        const word = repeatMatch[1].replace(/^["']|["']$/g, '');
        const count = Math.min(parseInt(repeatMatch[2], 10), 500);
        return { text: Array(count).fill(word).join(' '), isHtml: false };
    }

    // 4. Learn about this user (name, likes, style) and track interests
    const prof = Learn.observe(raw);
    if (prof) return prof;

    const isPlatformQuery = /^(search\s+)?(instagram|insta|ig|facebook|fb|reddit|r\/|internet\s+archive|archive|ia|wikipedia|wiki)\b/i.test(lower);
    const lookup = /^(who|what|when|where|why|how|which|tell me about|explain|define|describe|meaning of)\b/i.test(raw) || raw.split(/\s+/).length <= 3;
    if (lookup && !isPlatformQuery) Learn.trackInterest(raw);

    // 5. Instant neural memory hit
    const mem = findMemoryMatch(raw);
    if (mem) return { text: formatCleanMarkdown(mem.response), isHtml: true };

    // 6. Greetings
    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    // 7. Social & web prefixes
    if (/^(search\s+)?(instagram|insta|ig)\b/i.test(lower)) return { text: await searchSocialPlatform('insta', raw), isHtml: true };
    if (/^(search\s+)?(facebook|fb)\b/i.test(lower)) return { text: await searchSocialPlatform('fb', raw), isHtml: true };
    if (/^(search\s+)?(reddit|r\/)\b/i.test(lower)) return { text: await searchReddit(raw), isHtml: true };
    if (/^(search\s+)?(internet\s+archive|archive|ia)\b/i.test(lower)) return { text: await searchArchive(raw), isHtml: true };
    if (/^(search\s+)?(wikipedia|wiki)\b/i.test(lower)) {
        const w = await searchWikipedia(raw);
        if (w) return { text: w, isHtml: true };
    }

    // 8. Conversational AI, grounded with a Wikipedia reference for factual questions
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
            return { text: formatCleanMarkdown(data.reply), rawText: data.reply, isHtml: true, fromAI: true };
        }
    } catch (e) {}

    // 9. Wikipedia fallback only for clear lookups, and only when the article really matches
    const wikiHtml = lookup ? await searchWikipedia(raw, true) : null;
    if (wikiHtml) return { text: wikiHtml, isHtml: true };

    return { text: `I couldn't reach my AI brain just now, and I'd rather not guess. Try again in a moment, or teach me with <code>teach: topic = answer</code>.`, isHtml: true };
}

// ============================================================================
// 4. CHAT SESSION & HISTORY
// ============================================================================
let chats = [];
try { chats = JSON.parse(load('shinu_chats') || '[]'); } catch (e) { chats = []; }
let currentId = null;
let busy = false;

function saveChats() { store('shinu_chats', JSON.stringify(chats)); }
function currentChat() { return chats.find(c => c.id === currentId) || null; }

// Bot replies scroll so the START of the reply (the target marker) is in view
function addBubble(role, content, isHtml = false, autoScroll = true) {
    const div = document.createElement('div');
    div.className = 'message-bubble ' + role;
    if (isHtml) div.innerHTML = content;
    else div.textContent = content;
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
            chat.messages.forEach(m => addBubble(m.role, m.text, m.isHtml, false));
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
        <strong>Quick Commands:</strong><br>
        • Ask math (e.g., <code>2 divided by 2</code>) or chat naturally.<br>
        • Tell me about yourself: <code>my name is …</code>, <code>I like …</code>, <code>keep it short</code>.<br>
        • Rename me: <code>your name is …</code>.<br>
        • Search with <code>insta</code>, <code>fb</code>, <code>reddit</code>, <code>wiki</code>, or <code>archive</code>.<br>
        • Teach me with <code>teach: topic = answer</code>, or tap 👍 / 👎 under my replies.
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

        chat.messages.push({ role: 'bot', text: replyObj.text, rawText: replyObj.rawText || replyObj.text, isHtml: replyObj.isHtml });
        saveChats();
        const bubble = addBubble('bot', replyObj.text, replyObj.isHtml);

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
