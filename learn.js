// learn.js — DESU Identity, Custom Neon Thumb Motifs & Google Self-Questioning Trainer
const Learn = (() => {
    const KEY = 'desu_profile_v4';
    let p = {
        botName: 'Desu',
        name: '',
        facts: [],
        interests: [],
        likedPatterns: [],
        selfInsights: [],
        style: '',
        mode: 'conversational'
    };
    try {
        const prev = JSON.parse(localStorage.getItem('desu_profile_v3') || '{}');
        const curr = JSON.parse(localStorage.getItem(KEY) || '{}');
        Object.assign(p, prev, curr);
        if (!Array.isArray(p.interests)) p.interests = [];
        if (!Array.isArray(p.likedPatterns)) p.likedPatterns = [];
        if (!Array.isArray(p.selfInsights)) p.selfInsights = [];
    } catch (e) {}

    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
    const cap = s => s.replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
    const norm = s => String(s).toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const clean = s => s.replace(/[.!?]+$/, '').trim();
    const esc = s => (window.DESUCore ? window.DESUCore.escapeHTML(s) : String(s));
    const say = html => ({ text: html, isHtml: true });

    // Custom Neon Geometric Sigil Motifs for Thumbs Up & Thumbs Down
    const NEON_THUMB_UP = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <rect class="neon-path" x="2.5" y="10.5" width="4.5" height="10.5" rx="1.2"/>
            <circle class="neon-core" cx="4.75" cy="18.5" r="1"/>
            <path class="neon-path" d="M7 11l4.2-7.2a1.8 1.8 0 0 1 3.3 1.1L13.8 9.5h5.7a2 2 0 0 1 1.95 2.45l-1.6 7.5A2 2 0 0 1 17.9 21H7"/>
            <path class="neon-path" d="M18.5 4.5l1-1.5M21 7l1.5-.5" stroke-width="1.4"/>
        </svg>`;

    const NEON_THUMB_DOWN = `
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <rect class="neon-path" x="17" y="3" width="4.5" height="10.5" rx="1.2"/>
            <circle class="neon-core" cx="19.25" cy="5.5" r="1"/>
            <path class="neon-path" d="M17 13l-4.2 7.2a1.8 1.8 0 0 1-3.3-1.1l.7-4.6H4.5a2 2 0 0 1-1.95-2.45l1.6-7.5A2 2 0 0 1 6.1 3H17"/>
            <path class="neon-path" d="M5.5 19.5l-1 1.5M3 17l-1.5.5" stroke-width="1.4"/>
        </svg>`;

    // Inject Live Self-Training Status Pill into the Top Bar
    let statusPill = document.getElementById('selfTrainPill');
    if (!statusPill) {
        const topicBar = document.getElementById('topicBar');
        if (topicBar) {
            statusPill = document.createElement('span');
            statusPill.id = 'selfTrainPill';
            statusPill.className = 'self-train-pill';
            statusPill.title = 'Tap to see what DESU self-learned from Google';
            statusPill.textContent = `✦ Self-Trained (${p.selfInsights.length})`;
            topicBar.appendChild(statusPill);
        }
    }

    function updateStatusPill(text, isLearning = false) {
        if (!statusPill) return;
        statusPill.textContent = text;
        statusPill.classList.toggle('active-learning', isLearning);
    }

    const core = s => norm(s).replace(/^(what is|what are|what was|what were|what's|who is|who are|who was|who's|tell me about|tell me|explain|define|describe|meaning of|information about|info on|search for|search)\s+(an?\s+|the\s+)?/, '');

    function makeTopic(raw) {
        let t = raw.trim().replace(/\s+/g, ' ');
        if (/^[0-9+\-*/().%\s]+$/.test(t) || /\btable of \d+/i.test(t)) return 'Mathematics';
        if (/^(hello|hi+|hey+|yo|sup)\b[\s!.,?]*$/i.test(t)) return 'Conversation';
        const lead = /^(please\s+|can you\s+|could you\s+|tell me\s+(about\s+)?|(who|what)\s+(is|are|was|were)\s+(an?\s+|the\s+)?|what'?s\s+|who'?s\s+|how\s+(do|can|to|does)\s+(i\s+|you\s+)?|why\s+(is|are|do|does)\s+|explain\s+|define\s+|describe\s+|show me\s+|give me\s+)/i;
        let prev;
        do { prev = t; t = t.replace(lead, ''); } while (t !== prev && t);
        t = t.replace(/[?.!,;:]+$/, '').trim() || raw.trim();
        t = t.split(' ').slice(0, 5).join(' ').replace(/(^|\s)([a-z])/g, (m, s, c) => s + c.toUpperCase());
        return t.length > 30 ? t.slice(0, 29).trim() + '…' : t;
    }

    function applyBotName() {
        const n = p.botName || 'Desu';
        document.querySelectorAll('.brand-title, .drawer-brand span').forEach(el => { el.textContent = n.toUpperCase(); });
        const inp = document.getElementById('userInput');
        if (inp) inp.placeholder = `Message ${n} (${p.mode} mode)...`;
        document.title = n;
    }

    function observe(raw) {
        const q = raw.trim();
        const lower = norm(q);
        let m;

        // 1. Response Mode Switching
        if ((m = lower.match(/^(?:set\s+)?(?:mode\s*:?\s*)?(conversational|educational|professional)(?:\s+mode)?$/i))) {
            p.mode = m[1].toLowerCase();
            save();
            applyBotName();
            return say(`Switched to <strong>${cap(p.mode)} Mode</strong>.`);
        }

        // 2. Inspect Self-Training Log Command
        if (/^(?:what have you learned|show training|self training|training log)$/i.test(lower)) {
            return say(getTrainingReportHtml());
        }

        // 3. Identity Queries
        if (/^(?:hi\s+|hey\s+|hello\s+)?(?:what(?:'s|\s+is)\s+your\s+name|who\s+are\s+you)$/i.test(lower)) {
            const userGreeting = p.name ? `, ${esc(p.name)}` : '';
            return say(`I'm <strong>${esc(p.botName)}</strong>${userGreeting} — your self-improving AI collaborator, currently in <strong>${esc(p.mode)}</strong> mode.`);
        }

        // 4. User Name Queries
        if (/^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i)$/i.test(lower)) {
            if (p.name) return say(`Your name is <strong>${esc(p.name)}</strong>.`);
            return say(`You haven't told me your name yet! Just say <code>my name is ...</code>`);
        }

        // 5. User Likes / Hates Queries
        if (/^(?:what|which)\s+(?:subject|topic|thing)s?\s+do\s+i\s+(like|love|hate|dislike)/i.test(lower)) {
            const verb = lower.match(/\b(like|love|hate|dislike)\b/i)[1].toLowerCase();
            const isNegative = verb === 'hate' || verb === 'dislike';
            const matching = p.facts.filter(f => isNegative ? f.startsWith('dislike') : f.startsWith('like'));
            if (matching.length) {
                return say(`You mentioned that you ${matching.map(esc).join(' and ')}.`);
            }
            return say(`You haven't told me which subjects you ${esc(verb)} yet.`);
        }

        // 6. Statements that update User Profile or Bot Name
        if (q.includes('?') || q.split(/\s+/).length > 14) return null;

        if ((m = q.match(/\byour name is\s+([a-z0-9][a-z0-9_-]{0,14})/i))) {
            p.botName = cap(m[1].toLowerCase()); save(); applyBotName();
            return say(`Got it, from now on I'm <strong>${esc(p.botName)}</strong>.`);
        }
        if ((m = q.match(/\b(?:my name is|call me|i am called)\s+([a-z][a-z'-]{1,19})/i))) {
            p.name = cap(m[1].toLowerCase()); save();
            return say(`Nice to meet you, <strong>${esc(p.name)}</strong>! I'll remember that.`);
        }
        if (/^forget (my name|everything about me)/i.test(q)) {
            p.name = ''; p.facts = []; p.interests = []; p.likedPatterns = []; save();
            return say("Done, I've cleared your profile details.");
        }

        const asking = /\b(explain|tell me|how|what|why|write|show|give|can you|could you|please)\b/i.test(q);
        if (!asking) {
            const rules = [
                [/^i (?:live|stay) in\s+(.+)/i, 'live in'],
                [/^i(?:'m| am) from\s+(.+)/i, 'are from'],
                [/^i (?:like|love|enjoy)\s+(.+)/i, 'like'],
                [/^i (?:hate|dislike)\s+(.+)/i, 'dislike'],
                [/^i (?:work as|work at|study)\s+(.+)/i, 'study/work in'],
                [/^my favou?rite (\w+) is\s+(.+)/i, null]
            ];
            for (const [re, label] of rules) {
                if ((m = q.match(re))) {
                    const item = clean(m[2] || m[1]);
                    const fact = label ? `${label} ${item}` : `favourite ${m[1]} is ${item}`;
                    if (!p.facts.includes(fact)) p.facts = [...p.facts, fact].slice(-15);
                    noteTopic(item);
                    save();
                    // Immediately trigger a self-training cycle on the new interest!
                    setTimeout(() => runGoogleSelfTraining(item), 500);
                    return say(`Noted! I'll remember that you ${esc(fact)} — I'm also self-studying <strong>${esc(item)}</strong> on Google in the background to tailor my replies for you.`);
                }
            }
        }

        const styles = [
            [/\b(keep it short|be brief|short answers?|be concise)\b/i, 'brief'],
            [/\b(in detail|be detailed|more detail)\b/i, 'detailed'],
            [/\b(explain (it )?simply|like i'?m 5|eli5)\b/i, 'simple']
        ];
        for (const [re, s] of styles) {
            if (re.test(q)) { p.style = s; save(); return say(`Okay, I'll keep my answers <strong>${s}</strong>.`); }
        }
        return null;
    }

    function noteTopic(topicStr) {
        const cleanTopic = core(topicStr);
        if (cleanTopic && cleanTopic.length > 2 && cleanTopic.length < 40 && !p.interests.includes(cleanTopic)) {
            p.interests = [...p.interests, cleanTopic].slice(-20);
            save();
        }
    }

    function context() {
        const bits = [];
        if (p.name) bits.push(`The user's name is ${p.name}.`);
        if (p.facts.length) bits.push('User profile: ' + p.facts.join('; ') + '.');
        if (p.style) bits.push(`Preferred answer style: ${p.style}.`);
        if (p.likedPatterns.length) {
            bits.push('What the user likes in replies: ' + p.likedPatterns.slice(-4).join('; ') + '.');
        }
        if (p.selfInsights.length) {
            bits.push('Self-trained Google knowledge & reply strategies: ' + p.selfInsights.slice(-5).map(i => `[Q: ${i.q} -> Strategy/Fact: ${i.a}]`).join(' '));
        }
        return { botName: p.botName, mode: p.mode || 'conversational', text: bits.join(' ') };
    }

    // Attaches the custom Neon Sigil Thumbs-Up & Thumbs-Down Motifs to every reply
    function attachFeedback(div, userQuestion = '', botAnswer = '') {
        const row = document.createElement('div');
        row.className = 'feedback-row';

        const note = document.createElement('span');
        note.className = 'fb-note';

        const up = document.createElement('button');
        up.className = 'fb-btn';
        up.setAttribute('aria-label', 'Helpful');
        up.title = 'I like this reply style';
        up.innerHTML = NEON_THUMB_UP;

        const down = document.createElement('button');
        down.className = 'fb-btn';
        down.setAttribute('aria-label', 'Not helpful');
        down.title = 'Re-learn this from Google';
        down.innerHTML = NEON_THUMB_DOWN;

        up.onclick = () => {
            up.classList.add('selected');
            down.remove();
            // Learn what the user liked about this reply (length, structure, topic)
            const wordLen = String(botAnswer).split(/\s+/).length;
            const styleNote = wordLen < 45 ? 'concise, direct answers' : 'thorough, structured explanations';
            const topicKey = core(userQuestion) || 'general conversation';
            const pattern = `Liked ${styleNote} on "${topicKey}"`;
            if (!p.likedPatterns.includes(pattern)) {
                p.likedPatterns = [...p.likedPatterns, pattern].slice(-10);
                save();
            }
            note.textContent = '✦ Learned your preference';
        };

        down.onclick = async () => {
            down.classList.add('selected');
            up.remove();
            note.textContent = '✦ Researching Google to improve this...';
            const topicKey = core(userQuestion);
            if (topicKey) {
                await runGoogleSelfTraining(topicKey);
                note.textContent = `✦ Self-trained on "${topicKey}" via Google`;
            } else {
                p.style = p.style === 'brief' ? 'detailed' : 'brief';
                save();
                note.textContent = `✦ Adjusted reply style to ${p.style}`;
            }
        };

        row.append(up, down, note);
        div.appendChild(row);
    }

    // ========================================================================
    // GOOGLE SELF-QUESTIONING & REPLY-STYLE TRAINER
    // Asks itself questions, searches Google/Wiki/Reddit, and learns how to reply
    // ========================================================================
    const SELF_CURRICULUM = [
        'how to explain complex physics intuitively',
        'empathetic conversational AI communication',
        'clean modern JavaScript patterns',
        'calculus and rates of change real world examples',
        'cognitive psychology and human decision making',
        'astrophysics and spacetime curvature',
        'quantum computing fundamentals',
        'creative storytelling and visual direction'
    ];

    async function runGoogleSelfTraining(forcedTopic = null) {
        if (document.hidden && !forcedTopic) return;
        try {
            const pool = [...p.interests, ...SELF_CURRICULUM];
            const topic = forcedTopic || pool[Math.floor(Math.random() * pool.length)];
            const selfQuestion = `How should I explain "${topic}" clearly and engagingly for ${p.name || 'the user'}?`;

            updateStatusPill(`✦ Asking self: ${topic.slice(0, 16)}…`, true);

            // 1. Fetch real Google + Wikipedia + Reddit context via our backend
            let webSnippets = '';
            try {
                const mRes = await fetch(`/api/web?source=multisearch&q=${encodeURIComponent(topic)}`);
                const mData = await mRes.json();
                const parts = [];
                if (mData?.wiki?.extract) parts.push(mData.wiki.extract.slice(0, 300));
                if (mData?.google?.length) parts.push(mData.google.map(g => g.snippet).join(' | ').slice(0, 300));
                if (mData?.reddit?.length) parts.push(`Community interest: ${mData.reddit[0].title}`);
                webSnippets = parts.join(' ');
            } catch (e) {}

            // 2. Synthesize a self-taught insight on how to answer & what the user likes
            const userPrefs = p.likedPatterns.length ? `User likes: ${p.likedPatterns.slice(-3).join(', ')}.` : '';
            const synthPrompt = `Self-Training Task: Based on this Google/Web data (${webSnippets || topic}), write a 1-sentence strategy + core fact on how to best answer questions about "${topic}". ${userPrefs}`;

            let learnedInsight = '';
            try {
                const url = `https://text.pollinations.ai/${encodeURIComponent(synthPrompt)}?model=openai&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent('Output one concise sentence only.')}`;
                const r = await fetch(url);
                if (r.ok) {
                    const txt = (await r.text()).trim();
                    if (txt && txt.length > 15 && !txt.includes('Free limit reached') && !txt.includes('pollinations')) {
                        learnedInsight = txt;
                    }
                }
            } catch (e) {}

            if (!learnedInsight && webSnippets) {
                learnedInsight = webSnippets.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
            }

            if (learnedInsight) {
                p.selfInsights = [
                    ...p.selfInsights.filter(i => i.topic !== topic),
                    { topic, q: selfQuestion, a: learnedInsight, t: Date.now() }
                ].slice(-25);
                save();
            }
        } catch (e) {} finally {
            setTimeout(() => {
                updateStatusPill(`✦ Self-Trained (${p.selfInsights.length})`, false);
            }, 1400);
        }
    }

    function getTrainingReportHtml() {
        let html = `<strong>✦ DESU Autonomous Google Self-Training Log</strong><br>`;
        if (p.likedPatterns.length) {
            html += `<div style="margin:6px 0; font-size:13px; color:var(--accent-purple);"><strong>Learned User Preferences:</strong> ${esc(p.likedPatterns.join(' • '))}</div>`;
        }
        if (!p.selfInsights.length) {
            html += `<div class="result-meta">Self-training cycle is initializing in the background...</div>`;
        } else {
            p.selfInsights.slice(-5).reverse().forEach(item => {
                html += `<div class="result-item"><strong>Self-Question:</strong> <em>${esc(item.q)}</em><div class="result-meta"><strong>Google-Trained Insight:</strong> ${esc(item.a)}</div></div>`;
            });
        }
        return html;
    }

    // Tap the top-right "✦ Self-Trained" pill anytime to see what DESU learned from Google
    if (statusPill) {
        statusPill.onclick = () => {
            const centerStage = document.getElementById('centerStage');
            const chatContainer = document.getElementById('chatContainer');
            if (centerStage && chatContainer) {
                centerStage.classList.add('dissolved');
                chatContainer.classList.add('active');
                const div = document.createElement('div');
                div.className = 'message-bubble bot';
                div.innerHTML = getTrainingReportHtml();
                chatContainer.appendChild(div);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            runGoogleSelfTraining();
        };
    }

    // Run Google self-questioning loop every 45 seconds in the background
    setInterval(() => runGoogleSelfTraining(), 45000);
    setTimeout(() => runGoogleSelfTraining(), 5000);

    applyBotName();

    return {
        core, makeTopic, observe, noteTopic, context, attachFeedback, applyBotName, runGoogleSelfTraining,
        botName: () => p.botName,
        userName: () => p.name,
        mode: () => p.mode
    };
})();
