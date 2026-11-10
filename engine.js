// engine.js — DESU Conversational AI, Omni-Search & Always-Visible Neon Feedback Motifs
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

// Smooth Word-by-Word Undissolve Effect
function applyUndissolveEffect(containerEl) {
    let wordIndex = 0;
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (!text || !text.trim()) return;
            const frag = document.createDocumentFragment();
            const parts = text.split(/(\s+)/);
            parts.forEach(part => {
                if (/^\s+$/.test(part) || !part) {
                    frag.appendChild(document.createTextNode(part));
                } else {
                    const span = document.createElement('span');
                    span.className = 'undissolve-word';
                    const delay = Math.min(wordIndex * 0.025, 1.6).toFixed(3);
                    span.style.animationDelay = `${delay}s`;
                    span.textContent = part;
                    frag.appendChild(span);
                    wordIndex++;
                }
            });
            node.parentNode.replaceChild(frag, node);
        } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            !node.classList.contains('desu-source-bar') &&
            !node.classList.contains('desu-follow-up') &&
            !node.classList.contains('feedback-row') &&
            node.tagName !== 'SCRIPT' &&
            node.tagName !== 'STYLE' &&
            node.tagName !== 'SVG'
        ) {
            Array.from(node.childNodes).forEach(walk);
        }
    };
    Array.from(containerEl.childNodes).forEach(walk);
}

menuToggle.onclick = () => { sideDrawer.classList.toggle('open'); drawerBackdrop.classList.toggle('active'); };
drawerBackdrop.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); };

// ============================================================================
// 1. INTENT CLASSIFIER: Conversational vs. Multi-Platform Topic Search
// ============================================================================
function shouldRunOmniSearch(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    if (/\b(i|im|i'm|my|me|you|your|we|us|sad|happy|tired|bored|angry|lonely|depressed|feeling|feel|good|bad|wrong|right|code|coding|program|script|html|css|js|python|java|weather|temperature|joke|story|poem|song|advice|help me|how are you|can you|do you|will you|should i|remember)\b/i.test(lower)) {
        return false;
    }
    if (/^(and|so|but|also|then|why|how come|what about|how about|not\b)/i.test(lower)) {
        return false;
    }
    if (/^(who|what|where|tell me about|search|look up|find|info on|information about|explain|define|describe)\b/i.test(lower)) {
        return true;
    }
    const wordCount = q.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 4 && !q.endsWith('?')) {
        return true;
    }
    return false;
}

// ============================================================================
// 2. INDIVIDUAL PLATFORM CONNECTORS
// ============================================================================
async function searchSocialPlatform(platformCode, rawQuery) {
    const clean = rawQuery
        .replace(/^(search\s+)?(instagram|insta|ig|facebook|fb)\s*:?\s*/i, '')
        .replace(/^(?:id|i'd|account|profile|handle|page)\s+(?:of|for)\s+/i, '')
        .trim();
    const label = platformCode === 'insta' ? 'Instagram' : 'Facebook';
    const handleClean = clean.replace(/^@/, '').replace(/\s+/g, '');

    if (!clean) return { text: `Type <code>${platformCode} [name or topic]</code> to search ${label}.`, isHtml: true };

    try {
        const res = await fetch(`/api/web?source=${platformCode}&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        const sources = [];
        let html = `Public ${label} results for <strong>${escapeHtml(clean)}</strong>:`;

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
    if (!clean) return { text: `Type <code>reddit [topic]</code> to search live community threads.`, isHtml: true };
    try {
        const res = await fetch(`/api/web?source=reddit&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        const sources = [];
        if (data?.posts?.length > 0) {
            let html = `Top Reddit discussions on <strong>${escapeHtml(clean)}</strong>:`;
            data.posts.forEach(post => {
                sources.push({ title: `r/${post.subreddit}`, url: post.url });
                html += `<div class="result-item"><a href="${escapeHtml(safeUrl(post.url))}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a><div class="result-meta">r/${escapeHtml(post.subreddit)} • ⬆ ${post.score} • 💬 ${post.comments}</div></div>`;
            });
            return { text: html, isHtml: true, sources, followUp: `${clean} community opinions` };
        }
    } catch (e) {}
    return { text: `No Reddit discussions found for "${escapeHtml(clean)}".`, isHtml: false };
}

async function searchArchive(rawQuery) {
    const clean = rawQuery.replace(/^(search\s+)?(internet\s+archive|archive|ia)\s*:?\s*/i, '').trim();
    if (!clean) return { text: `Type <code>archive [topic]</code> to search the Internet Archive.`, isHtml: true };
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
// 3. CONVERSATIONAL AI ENGINE (Uses Self-Trained Google Insights + User Style)
// ============================================================================
async function queryDirectBrowserAI(raw, chatHistory, profile, multiData) {
    const modeMap = {
        conversational: 'Use a warm, natural, human-like conversational tone. Be concise, supportive, and clear.',
        educational: 'Use an Educational Mode: explain step-by-step with clear structure and examples.',
        professional: 'Use a Professional Mode: deliver precise, executive, well-structured answers.'
    };

    let groundingContext = '';
    if (multiData) {
        const parts = [];
        if (multiData.wiki) parts.push(`Wikipedia (${multiData.wiki.title}): ${multiData.wiki.extract}`);
        if (multiData.google?.length) parts.push(`Google Web: ${multiData.google.map(g => `${g.title} - ${g.snippet}`).join(' | ')}`);
        if (multiData.reddit?.length) parts.push(`Reddit: ${multiData.reddit.map(r => `r/${r.subreddit}: "${r.title}"`).join(' | ')}`);
        if (multiData.insta?.length) parts.push(`Instagram: ${multiData.insta.map(i => `${i.title} (${i.snippet})`).join(' | ')}`);
        if (parts.length) {
            groundingContext = `\nLive Multi-Source Research:\n${parts.join('\n')}\nSynthesize these findings naturally and coherently.`;
        }
    }

    const systemPrompt = `You are ${profile.botName || 'Desu'}, a self-improving, empathetic, independent AI assistant.
${modeMap[profile.mode] || modeMap.conversational}
Rules:
- Adapt to the user's preferences and self-trained insights: ${profile.text || 'Be clear and natural.'}
- Maintain full conversation context across messages.
- If the user shares a personal feeling (e.g. "I am sad"), respond with genuine warmth and empathy.
- Optionally append a final line "FOLLOWUP: [short 3-5 word topic]" if deeper exploration is relevant.
Today is ${new Date().toDateString()}.${groundingContext}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(chatHistory || []).slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '').slice(0, 900)
        })),
        { role: 'user', content: raw }
    ];

    const isBad = t => !t || t.length < 2 || t.includes('Free limit reached') || t.includes('enter.pollinations.ai') || t.includes('45 seconds');

    for (const model of ['openai', 'mistral']) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5200);
            const r = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, seed: Math.floor(Math.random() * 999999) }),
                signal: controller.signal
            });
            clearTimeout(timer);
            if (r.ok) {
                const d = await r.json();
                const reply = (d?.choices?.[0]?.message?.content || '').trim();
                if (!isBad(reply)) return reply;
            }
        } catch (e) {}
    }

    try {
        const lastTurns = (chatHistory || []).slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Desu'}: ${String(m.rawText || m.text).replace(/<[^>]+>/g, '').slice(0, 180)}`).join('\n');
        const fullPrompt = lastTurns ? `Context:\n${lastTurns}\n\nUser: ${raw}` : raw;
        const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent(systemPrompt.slice(0, 500))}`;
        const r = await fetch(url);
        if (r.ok) {
            const reply = (await r.text()).trim();
            if (!isBad(reply)) return reply;
        }
    } catch (e) {}

    return null;
}

function buildOmniPulseHtml(multiData, aiSynthesisHtml) {
    let html = '';
    if (multiData?.wiki?.thumbnail) {
        html += `<img class="wiki-thumb" src="${escapeHtml(safeUrl(multiData.wiki.thumbnail))}" alt="${escapeHtml(multiData.wiki.title)}" loading="lazy" />`;
    }

    if (aiSynthesisHtml) {
        html += `<div>${aiSynthesisHtml}</div>`;
    } else if (multiData?.wiki?.extract) {
        html += `<div>${escapeHtml(multiData.wiki.extract)}</div>`;
    }

    const highlights = [];
    if (multiData?.google?.length > 0) {
        const g = multiData.google[0];
        highlights.push(`<div class="result-item"><strong>Google · </strong><a href="${escapeHtml(safeUrl(g.url))}" target="_blank" rel="noopener">${escapeHtml(g.title)}</a><div class="result-meta">${escapeHtml(g.snippet)}</div></div>`);
    }
    if (multiData?.reddit?.length > 0) {
        const r = multiData.reddit[0];
        highlights.push(`<div class="result-item"><strong>Reddit · </strong><a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a><div class="result-meta">r/${escapeHtml(r.subreddit)} • ⬆ ${r.score} • 💬 ${r.comments}</div></div>`);
    }
    if (multiData?.insta?.length > 0) {
        const ig = multiData.insta[0];
        highlights.push(`<div class="result-item"><strong>Instagram · </strong><a href="${escapeHtml(safeUrl(ig.url))}" target="_blank" rel="noopener">${escapeHtml(ig.title)}</a><div class="result-meta">${escapeHtml(ig.snippet)}</div></div>`);
    }

    if (highlights.length > 0) {
        html += `<div style="margin-top: 10px;">${highlights.join('')}</div>`;
    }
    return html;
}

// ============================================================================
// 4. MASTER ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory) {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Multiplication Tables & Math Expressions
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

    // 2. Repetition Command
    const repeatMatch = raw.match(/^(?:write|say|repeat|type|print)\s+(.+?)\s+(\d+)[\s.]*times?\b/i);
    if (repeatMatch) {
        const word = repeatMatch[1].replace(/^["']|["']$/g, '');
        const count = Math.min(parseInt(repeatMatch[2], 10), 500);
        return { text: Array(count).fill(word).join(' '), isHtml: false };
    }

    // 3. Identity, Personal Profile & Mode Switching
    const prof = Learn.observe(raw);
    if (prof) return prof;

    // 4. Greetings
    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    // 5. Explicit Single-Platform Prefixes
    if (/^(search\s+)?(instagram|insta|ig)\b/i.test(lower)) return await searchSocialPlatform('insta', raw);
    if (/^(search\s+)?(facebook|fb)\b/i.test(lower)) return await searchSocialPlatform('fb', raw);
    if (/^(search\s+)?(reddit|r\/)\b/i.test(lower)) return await searchReddit(raw);
    if (/^(search\s+)?(internet\s+archive|archive|ia)\b/i.test(lower)) return await searchArchive(raw);

    const profile = Learn.context();

    // 6. AUTOMATIC OMNI-SEARCH (Google + Wikipedia + Reddit + Instagram simultaneously on topic queries)
    if (shouldRunOmniSearch(raw)) {
        const coreTopic = Learn.core(raw);
        Learn.noteTopic(coreTopic);

        let multiData = null;
        try {
            const mRes = await fetch(`/api/web?source=multisearch&q=${encodeURIComponent(coreTopic)}`);
            multiData = await mRes.json();
        } catch (e) {}

        const hasMultiContent = multiData && (multiData.wiki || multiData.google?.length || multiData.reddit?.length || multiData.insta?.length);

        let aiSynthesis = await queryDirectBrowserAI(raw, chatHistory, profile, hasMultiContent ? multiData : null);
        let suggestedFollowUp = multiData?.wiki?.relatedTopic || null;

        if (aiSynthesis) {
            const fwMatch = aiSynthesis.match(/\n*FOLLOWUP:\s*(.+)$/i);
            if (fwMatch) {
                suggestedFollowUp = fwMatch[1].replace(/[?.!]+$/, '').trim();
                aiSynthesis = aiSynthesis.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim();
            }
        }

        if (hasMultiContent) {
            const combinedHtml = buildOmniPulseHtml(multiData, aiSynthesis ? formatCleanMarkdown(aiSynthesis) : null);
            return {
                text: combinedHtml,
                rawText: aiSynthesis || multiData?.wiki?.extract || coreTopic,
                isHtml: true,
                sources: multiData.sources || [],
                followUp: suggestedFollowUp
            };
        }
    }

    // 7. PURE CONVERSATIONAL AI
    let chatReply = await queryDirectBrowserAI(raw, chatHistory, profile, null);
    if (chatReply) {
        let suggestedFollowUp = null;
        const fwMatch = chatReply.match(/\n*FOLLOWUP:\s*(.+)$/i);
        if (fwMatch) {
            suggestedFollowUp = fwMatch[1].replace(/[?.!]+$/, '').trim();
            chatReply = chatReply.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim();
        }
        return {
            text: formatCleanMarkdown(chatReply),
            rawText: chatReply,
            isHtml: true,
            sources: [],
            followUp: suggestedFollowUp
        };
    }

    return {
        text: `I'm right here with you — tell me a bit more about what you're thinking or what topic we should dive into.`,
        isHtml: false
    };
}

// ============================================================================
// 5. CHAT SESSION, UNDISSOLVE RENDERER & ALWAYS-VISIBLE NEON MOTIFS
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

    if (role === 'bot' && meta.animateUndissolve) {
        applyUndissolveEffect(div);
    }

    if (role === 'bot' && window.DESUCore && Array.isArray(meta.sources) && meta.sources.length > 0) {
        const sourceBar = window.DESUCore.createSourceBar(meta.sources);
        if (sourceBar) div.appendChild(sourceBar);
    }

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

    // Always attach the custom Neon Thumbs Up & Thumbs Down Motifs on bot replies!
    if (role === 'bot' && window.Learn && meta.showFeedback !== false) {
        Learn.attachFeedback(div, meta.userQuestion || '', meta.rawText || content);
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
            chat.messages.forEach(m => addBubble(m.role, m.text, m.isHtml, false, {
                sources: m.sources,
                followUp: m.followUp,
                animateUndissolve: false,
                rawText: m.rawText
            }));
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
        <strong>DESU Omni-Search & Self-Training Guide:</strong><br>
        • <strong>Auto Multi-Search:</strong> Ask about any topic (e.g. <code>Sundar Pichai</code> or <code>Quantum computing</code>) to pull Google, Wikipedia, Reddit & Instagram together.<br>
        • <strong>Google Self-Training:</strong> Tap the <code>✦ Self-Trained</code> pill in the top bar (or type <code>show training</code>) to see the questions DESU asks itself and learns from Google.<br>
        • <strong>Neon Feedback Motifs:</strong> Tap the neon thumbs-up or thumbs-down icons under any reply to train DESU on the exact reply style you like.
    `, true, true, { animateUndissolve: true, showFeedback: false });
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
        addBubble('bot', replyObj.text, replyObj.isHtml, true, {
            sources: replyObj.sources,
            followUp: replyObj.followUp,
            animateUndissolve: true,
            userQuestion: text,
            rawText: replyObj.rawText || replyObj.text
        });
    } finally {
        busy = false;
    }
}

document.getElementById('sendBtn').onclick = handleSend;
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
renderHistory();
topicText.textContent = Learn.botName();
