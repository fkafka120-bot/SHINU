// engine.js — True Contextual AI, Deep Topic Learning, Social & Web Connectors
const menuToggle = document.getElementById('menuToggle');
const sideDrawer = document.getElementById('sideDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const centerStage = document.getElementById('centerStage');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const historyList = document.getElementById('historyList');
const newChatBtn = document.getElementById('newChatBtn');
const topicBar = document.getElementById('topicBar');
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

menuToggle.onclick = () => { sideDrawer.classList.toggle('open'); drawerBackdrop.classList.toggle('active'); };
drawerBackdrop.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); };

// ============================================================================
// 1. REAL NEURAL MEMORY & DEEP-TOPIC SELF-LEARNING (No More Random Junk!)
// ============================================================================
let brain = [];
try {
    const saved = JSON.parse(load('shinu_brain_v2') || '[]');
    brain = Array.isArray(saved) ? saved : [];
} catch (e) { brain = []; }

function saveBrain() {
    if (brain.length > 250) brain = brain.slice(-250);
    store('shinu_brain_v2', JSON.stringify(brain));
    renderBrainUI();
}

function teachShinu(triggerRaw, responseRaw, source = 'User Trained') {
    const trigger = triggerRaw.toLowerCase().replace(/^(teach|learn|train)\s*:?\s*/i, '').replace(/[?.!,;:]+$/, '').trim();
    const response = responseRaw.trim();
    if (!trigger || !response) return null;

    const idx = brain.findIndex(b => b.trigger === trigger);
    const node = { id: Date.now().toString(36), trigger, response, source, timestamp: Date.now() };
    if (idx >= 0) brain[idx] = node;
    else brain.push(node);
    saveBrain();
    return node;
}

function findExactMemory(query) {
    const q = query.toLowerCase().replace(/[?.!,;:]+$/, '').trim();
    return brain.find(b => b.trigger === q) || null;
}

function renderBrainUI() {
    brainCountBadge.textContent = `${brain.length} skills`;
    headerBrainPill.textContent = `🧠 ${brain.length}`;
    memoryList.innerHTML = '';
    if (!brain.length) {
        memoryList.innerHTML = `<div style="font-size:13px; color:var(--text-muted);">No synthesized nodes yet. Type <code>teach: [topic]</code> in chat or add one above!</div>`;
        return;
    }
    [...brain].reverse().forEach(node => {
        const div = document.createElement('div');
        div.className = 'memory-node';
        div.innerHTML = `
            <div style="flex:1; min-width:0;">
                <strong>${escapeHtml(node.trigger)} <span style="font-size:10px; opacity:0.65;">(${escapeHtml(node.source)})</span></strong>
                <div style="color:var(--text-main); word-break:break-word;">${escapeHtml(node.response)}</div>
            </div>`;
        const del = document.createElement('button');
        del.textContent = '✕';
        del.onclick = () => { brain = brain.filter(b => b.id !== node.id); saveBrain(); };
        div.appendChild(del);
        memoryList.appendChild(div);
    });
}

// Deep-Learn a Topic via Web + AI Synthesis (When user types "teach: curvature" or clicks Deep-Learn)
async function deepLearnTopic(topicRaw, sourceLabel = 'Deep Web Synthesis') {
    const topic = topicRaw.replace(/^(teach|learn|train)\s*:?\s*/i, '').trim();
    if (!topic) return null;

    headerBrainPill.classList.add('learning');
    crawlerStatusText.textContent = `⚡ Synthesizing deep knowledge on "${topic}"...`;

    try {
        const prompt = `Provide a clear, comprehensive 3-sentence foundational synthesis of the concept "${topic}" (covering its core definition, scientific/practical meaning, and key principles). Do not mention songs or movies.`;
        const res = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'ai', q: prompt, history: [], memory: [] })
        });
        const data = await res.json();
        if (data && data.reply) {
            const node = teachShinu(topic, data.reply, sourceLabel);
            crawlerStatusText.textContent = `🟢 Synthesized & Learned: "${topic}"`;
            return node;
        }
    } catch (e) {} finally {
        setTimeout(() => headerBrainPill.classList.remove('learning'), 800);
    }
    return null;
}

// Curated High-Value Curriculum for Autonomous Background Learning (No random pop-culture garbage!)
const CORE_CURRICULUM = [
    'human psychology and behaviour', 'differential geometry and curvature', 'quantum mechanics',
    'artificial neural networks', 'game theory', 'cognitive biases', 'thermodynamics',
    'cryptography', 'macroeconomics', 'evolutionary biology', 'philosophy of ethics',
    'algorithmic complexity', 'astrophysics and black holes', 'neuroplasticity'
];

async function runAutonomousCurriculumStep() {
    const unlearned = CORE_CURRICULUM.filter(topic => !findExactMemory(topic));
    if (unlearned.length > 0 && !document.hidden) {
        const nextTopic = unlearned[Math.floor(Math.random() * unlearned.length)];
        await deepLearnTopic(nextTopic, 'Autonomous Curriculum');
    }
}

// Run curriculum step every 40 seconds if tab is active
setInterval(runAutonomousCurriculumStep, 40000);

headerBrainPill.onclick = () => { renderBrainUI(); trainModal.classList.add('open'); };
openTrainModalBtn.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); renderBrainUI(); trainModal.classList.add('open'); };
closeTrainModal.onclick = () => trainModal.classList.remove('open');

saveTrainBtn.onclick = async () => {
    const trig = trainTriggerInput.value.trim();
    const resp = trainResponseInput.value.trim();
    if (!trig) return;
    if (resp) {
        teachShinu(trig, resp, 'Studio Trained');
    } else {
        // If response is left blank, Shinu automatically researches and synthesizes the topic!
        await deepLearnTopic(trig, 'Auto-Researched');
    }
    trainTriggerInput.value = '';
    trainResponseInput.value = '';
};

harvestNowBtn.onclick = async () => {
    const topic = trainTriggerInput.value.trim() || CORE_CURRICULUM[Math.floor(Math.random() * CORE_CURRICULUM.length)];
    await deepLearnTopic(topic, 'Deep Web Synthesis');
};

clearJunkBtn.onclick = () => {
    localStorage.removeItem('shinu_brain'); // Clears old v1 random wiki junk
    brain = brain.filter(b => b.source !== 'Auto-Learned Wiki' && b.source !== 'Autonomous Web Crawler');
    saveBrain();
    crawlerStatusText.textContent = '🧹 Cleaned old random cache!';
};

exportBrainBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(brain, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shinu_knowledge_graph.json';
    a.click();
};

renderBrainUI();

// ============================================================================
// 2. SOCIAL & WEB PLATFORM CONNECTORS (Instagram, Facebook, Reddit, Wiki, Archive)
// ============================================================================
async function searchSocialPlatform(platformCode, rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(instagram|insta|ig|facebook|fb)\s*:?\s*/i, '').trim();
    const label = platformCode === 'insta' ? 'Instagram' : 'Facebook';
    const handleClean = clean.replace(/^@/, '');

    try {
        const res = await fetch(`/api/web?source=${platformCode}&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        let html = `<span class="source-badge">${label} Live Index</span><br>`;

        if (data?.results?.length > 0) {
            html += `<strong>Public ${label} results for "${escapeHtml(clean)}":</strong>`;
            data.results.forEach(item => {
                html += `
                <div class="result-item">
                    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
                    <div class="result-meta">${escapeHtml(item.snippet)}</div>
                </div>`;
            });
        } else {
            html += `<div>Direct profile & hashtag links for <strong>"${escapeHtml(clean)}"</strong>:</div>`;
        }

        const directUrl = platformCode === 'insta'
            ? `https://www.instagram.com/${encodeURIComponent(handleClean)}/`
            : `https://www.facebook.com/public/${encodeURIComponent(clean)}`;

        html += `<div style="margin-top:8px;"><a href="${directUrl}" target="_blank" rel="noopener">Open "${escapeHtml(clean)}" on ${label} ↗</a></div>`;
        return html;
    } catch (e) {
        return `Unable to reach ${label} indexer right now.`;
    }
}

async function searchReddit(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(reddit|r\/)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=reddit&q=${encodeURIComponent(clean)}`);
        const data = await res.json();

        if (data?.posts?.length > 0) {
            let html = `<span class="source-badge">Reddit Live Feed</span><br><strong>Top threads for "${escapeHtml(clean)}":</strong>`;
            data.posts.forEach(post => {
                html += `
                <div class="result-item">
                    <a href="https://www.reddit.com${escapeHtml(post.permalink)}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a>
                    <div class="result-meta">r/${escapeHtml(post.subreddit)} • ⬆ ${post.score} • 💬 ${post.num_comments}</div>
                </div>`;
            });
            return html;
        }
        if (data?.hnHits?.length > 0) {
            let html = `<span class="source-badge">Community Tech Feed</span><br><strong>Discussions for "${escapeHtml(clean)}":</strong>`;
            data.hnHits.forEach(hit => {
                const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
                html += `
                <div class="result-item">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(hit.title)}</a>
                    <div class="result-meta">⬆ ${hit.points || 0} • 💬 ${hit.num_comments || 0}</div>
                </div>`;
            });
            return html;
        }
    } catch (e) {}
    return `No Reddit threads matched "${escapeHtml(clean)}".`;
}

async function searchWikipedia(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(wikipedia|wiki)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=wiki&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!data?.found || !data.summary) return null;

        const s = data.summary;
        const pageUrl = s?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title)}`;
        let html = `<span class="source-badge">Wikipedia Encyclopedia</span><br><strong>${escapeHtml(s.title)}</strong><br>`;
        if (s.thumbnail?.source) {
            html += `<img class="wiki-thumb" src="${escapeHtml(s.thumbnail.source)}" alt="${escapeHtml(s.title)}" loading="lazy" />`;
        }
        html += `<div style="margin:6px 0 10px;">${escapeHtml(s.extract)}</div>`;
        html += `<a href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener">Read full article ↗</a>`;
        return html;
    } catch (e) { return null; }
}

async function searchArchive(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(internet\s+archive|archive|ia)\s*:?\s*/i, '').trim();
    try {
        const res = await fetch(`/api/web?source=archive&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!data?.docs?.length) return `No Internet Archive records found for "${escapeHtml(clean)}".`;

        let html = `<span class="source-badge">Internet Archive</span><br><strong>Records for "${escapeHtml(clean)}":</strong>`;
        data.docs.forEach(doc => {
            const link = `https://archive.org/details/${encodeURIComponent(doc.identifier)}`;
            html += `
            <div class="result-item">
                <a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(doc.title || doc.identifier)}</a>
                <div class="result-meta">${escapeHtml([doc.mediatype, doc.year].filter(Boolean).join(' • '))}</div>
            </div>`;
        });
        return html;
    } catch (e) { return `Unable to reach the Internet Archive right now.`; }
}

// ============================================================================
// 3. MASTER INTELLIGENCE ROUTER (LLM-First + Command Execution + Social Routing)
// ============================================================================
async function shinuReply(inputMessage, chatHistory) {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // A. Explicit Teaching with '=' ("teach: x = y")
    const teachPair = raw.match(/^(?:teach|learn|train)\s*:?\s*(.+?)\s*(?:=|=>|->)\s*(.+)$/i);
    if (teachPair) {
        const node = teachShinu(teachPair[1], teachPair[2], 'User Trained');
        return {
            text: `<span class="source-badge">Neural Skill Committed</span><br>Learned rule for <strong>"${escapeHtml(node.trigger)}"</strong>:<br><em>"${escapeHtml(node.response)}"</em>`,
            isHtml: true
        };
    }

    // B. Deep Topic Teaching WITHOUT '=' ("teach: violence" or "teach: curvature")
    const teachTopicMatch = raw.match(/^(?:teach|learn|train)\s*:\s*(.+)$/i);
    if (teachTopicMatch) {
        const topicToLearn = teachTopicMatch[1].trim();
        const learnedNode = await deepLearnTopic(topicToLearn, 'Deep Web Synthesis');
        if (learnedNode) {
            return {
                text: `<span class="source-badge">Deep Topic Learned • Neural Memory</span><br>I researched and synthesized <strong>"${escapeHtml(learnedNode.trigger)}"</strong> into permanent memory:<br><br>${escapeHtml(learnedNode.response)}`,
                isHtml: true
            };
        }
    }

    // C. Fast Deterministic Repetition Command (e.g. "Write hello 100 times" or "write hello 100.times")
    const repeatMatch = raw.match(/^(?:write|say|repeat|type|print)\s+(.+?)\s+(\d+)[\s.]*times?\b/i);
    if (repeatMatch) {
        const word = repeatMatch[1].replace(/^["']|["']$/g, '');
        const count = Math.min(parseInt(repeatMatch[2], 10), 500);
        const repeated = Array(count).fill(word).join(' ');
        return {
            text: `<span class="source-badge">Shinu Command Execution (${count}x)</span><br>${escapeHtml(repeated)}`,
            isHtml: true
        };
    }

    // D. Social & Web Platform Prefixes
    if (/^(search\s+)?(instagram|insta|ig)\b/i.test(lower)) {
        return { text: await searchSocialPlatform('insta', raw), isHtml: true };
    }
    if (/^(search\s+)?(facebook|fb)\b/i.test(lower)) {
        return { text: await searchSocialPlatform('fb', raw), isHtml: true };
    }
    if (/^(search\s+)?(reddit|r\/)\b/i.test(lower)) {
        return { text: await searchReddit(raw), isHtml: true };
    }
    if (/^(search\s+)?(internet\s+archive|archive|ia)\b/i.test(lower)) {
        return { text: await searchArchive(raw), isHtml: true };
    }
    if (/^(search\s+)?(wikipedia|wiki)\b/i.test(lower)) {
        const wikiHtml = await searchWikipedia(raw);
        if (wikiHtml) return { text: wikiHtml, isHtml: true };
    }

    // E. Check Exact User-Trained Neural Memory
    const mem = findExactMemory(raw);
    if (mem) {
        return {
            text: `<span class="source-badge">Neural Memory • ${escapeHtml(mem.source)}</span><br>${escapeHtml(mem.response)}`,
            isHtml: true
        };
    }

    // F. PRIMARY CONVERSATIONAL LLM BRAIN (Remembers full chat history & context!)
    try {
        const res = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: 'ai',
                q: raw,
                history: chatHistory || [],
                memory: brain
            })
        });
        const data = await res.json();
        if (data && data.reply) {
            const formatted = escapeHtml(data.reply).replace(/\n/g, '<br>');
            return {
                text: `<span class="source-badge">Shinu Neural AI</span><br>${formatted}`,
                rawText: data.reply,
                isHtml: true
            };
        }
    } catch (e) {}

    // G. Fallback to Filtered Wikipedia if AI endpoint is unreachable
    const wikiFallback = await searchWikipedia(raw);
    if (wikiFallback) return { text: wikiFallback, isHtml: true };

    return { text: `Could not reach Shinu backend. Make sure api/web.js is committed to GitHub.`, isHtml: false };
}

// ============================================================================
// 4. CHAT SESSION & HISTORY MANAGER
// ============================================================================
let chats = [];
try { chats = JSON.parse(load('shinu_chats') || '[]'); } catch (e) { chats = []; }
let currentId = null;

function saveChats() { store('shinu_chats', JSON.stringify(chats)); }
function currentChat() { return chats.find(c => c.id === currentId) || null; }

function addBubble(role, content, isHtml = false) {
    const div = document.createElement('div');
    div.className = 'message-bubble ' + role;
    if (isHtml) div.innerHTML = content;
    else div.textContent = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
            if (chat.id === currentId) startNewChat();
            else renderHistory();
        };
        item.onclick = () => {
            currentId = chat.id;
            chatContainer.innerHTML = '';
            chat.messages.forEach(m => addBubble(m.role, m.text, m.isHtml));
            centerStage.classList.add('dissolved');
            chatContainer.classList.add('active');
            topicText.textContent = chat.topic || 'Chat';
            renderHistory();
            sideDrawer.classList.remove('open');
            drawerBackdrop.classList.remove('active');
        };
        item.appendChild(del);
        historyList.appendChild(item);
    });
}

function startNewChat() {
    currentId = null;
    chatContainer.innerHTML = '';
    centerStage.classList.remove('dissolved');
    chatContainer.classList.remove('active');
    topicText.textContent = 'New Chat';
    renderHistory();
    sideDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
}
newChatBtn.onclick = startNewChat;
userInput.addEventListener('focus', () => {
    centerStage.classList.add('dissolved');
    chatContainer.classList.add('active');
});

quickHelpBtn.onclick = () => {
    centerStage.classList.add('dissolved');
    chatContainer.classList.add('active');
    addBubble('bot', `
        <span class="source-badge">Shinu Connected Platforms & Brain</span><br>
        • <strong>Real Conversational AI:</strong> Ask any question or give commands (e.g., <em>"What is human behaviour?"</em> or <em>"Write hello 100 times"</em>).<br>
        • <strong>Deep Topic Learning:</strong> Type <code>teach: curvature</code> (no '=' needed!) and Shinu will research & synthesize the concept into memory.<br>
        • <strong>Instagram & Facebook:</strong> Type <code>insta [topic/handle]</code> or <code>fb [topic]</code>.<br>
        • <strong>Reddit, Wiki & Archive:</strong> Type <code>reddit [topic]</code>, <code>wiki [topic]</code>, or <code>archive [topic]</code>.
    `, true);
};

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    centerStage.classList.add('dissolved');
    chatContainer.classList.add('active');

    let chat = currentChat();
    if (!chat) {
        chat = { id: Date.now().toString(36), topic: text.slice(0, 26), messages: [] };
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
    userInput.blur();

    const typing = document.createElement('div');
    typing.className = 'message-bubble bot';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    chatContainer.appendChild(typing);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const replyObj = await shinuReply(text, historySnapshot);
    typing.remove();

    chat.messages.push({ role: 'bot', text: replyObj.text, rawText: replyObj.rawText || replyObj.text, isHtml: replyObj.isHtml });
    saveChats();
    addBubble('bot', replyObj.text, replyObj.isHtml);
}

document.getElementById('sendBtn').onclick = handleSend;
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
renderHistory();

