// learn.js — DESU Identity, Profile, Neon Feedback & Silent Self-Questioning Loop
const Learn = (() => {
    const KEY = 'desu_profile_v3';
    let p = {
        botName: 'Desu',
        name: '',
        facts: [],
        interests: [],
        selfInsights: [],
        style: '',
        mode: 'conversational'
    };
    try {
        const prev = JSON.parse(localStorage.getItem('desu_profile_v2') || '{}');
        const curr = JSON.parse(localStorage.getItem(KEY) || '{}');
        Object.assign(p, prev, curr);
        if (!Array.isArray(p.interests)) p.interests = [];
        if (!Array.isArray(p.selfInsights)) p.selfInsights = [];
    } catch (e) {}

    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
    const cap = s => s.replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
    const norm = s => String(s).toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const clean = s => s.replace(/[.!?]+$/, '').trim();
    const esc = s => (window.DESUCore ? window.DESUCore.escapeHTML(s) : String(s));
    const say = html => ({ text: html, isHtml: true });

    const NEON_THUMB_UP = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10v12"/>
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
        </svg>`;

    const NEON_THUMB_DOWN = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 14V2"/>
            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
        </svg>`;

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

        // 2. Identity Queries
        if (/^(?:hi\s+|hey\s+|hello\s+)?(?:what(?:'s|\s+is)\s+your\s+name|who\s+are\s+you)$/i.test(lower)) {
            const userGreeting = p.name ? `, ${esc(p.name)}` : '';
            return say(`I'm <strong>${esc(p.botName)}</strong>${userGreeting} — your AI collaborator, currently in <strong>${esc(p.mode)}</strong> mode.`);
        }

        // 3. User Name Queries
        if (/^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i)$/i.test(lower)) {
            if (p.name) return say(`Your name is <strong>${esc(p.name)}</strong>.`);
            return say(`You haven't told me your name yet! Just say <code>my name is ...</code>`);
        }

        // 4. User Likes / Hates Queries
        if (/^(?:what|which)\s+(?:subject|topic|thing)s?\s+do\s+i\s+(like|love|hate|dislike)/i.test(lower)) {
            const verb = lower.match(/\b(like|love|hate|dislike)\b/i)[1].toLowerCase();
            const isNegative = verb === 'hate' || verb === 'dislike';
            const matching = p.facts.filter(f => isNegative ? f.startsWith('dislike') : f.startsWith('like'));
            if (matching.length) {
                return say(`You mentioned that you ${matching.map(esc).join(' and ')}.`);
            }
            return say(`You haven't told me which subjects you ${esc(verb)} yet.`);
        }

        // 5. Statements that update User Profile or Bot Name
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
            p.name = ''; p.facts = []; p.interests = []; save();
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
                    if (!p.interests.includes(item.toLowerCase())) p.interests = [...p.interests, item.toLowerCase()].slice(-20);
                    save();
                    return say(`Noted! I'll remember that you ${esc(fact)}.`);
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
        if (p.facts.length) bits.push('About the user: ' + p.facts.join('; ') + '.');
        if (p.style) bits.push(`Preferred answer style: ${p.style}.`);
        if (p.selfInsights.length) {
            bits.push('Recent self-trained insights: ' + p.selfInsights.slice(-5).map(i => `${i.q} -> ${i.a}`).join(' | '));
        }
        return { botName: p.botName, mode: p.mode || 'conversational', text: bits.join(' ') };
    }

    function attachFeedback(div) {
        const row = document.createElement('div');
        row.className = 'feedback-row';

        const note = document.createElement('span');
        note.className = 'fb-note';

        const up = document.createElement('button');
        up.className = 'fb-btn';
        up.setAttribute('aria-label', 'Helpful');
        up.innerHTML = NEON_THUMB_UP;

        const down = document.createElement('button');
        down.className = 'fb-btn';
        down.setAttribute('aria-label', 'Not helpful');
        down.innerHTML = NEON_THUMB_DOWN;

        up.onclick = () => {
            up.classList.add('selected');
            down.remove();
            note.textContent = 'Glad that helped';
        };

        down.onclick = () => {
            down.classList.add('selected');
            up.remove();
            note.textContent = 'Noted — I will refine my next response';
        };

        row.append(up, down, note);
        div.appendChild(row);
    }

    // ========================================================================
    // SILENT SELF-QUESTIONING LOOP (Asks itself questions & trains in background)
    // ========================================================================
    const SEED_TOPICS = [
        'quantum mechanics', 'human psychology', 'calculus and rates of change',
        'artificial intelligence architectures', 'astrophysics', 'game theory',
        'neuroplasticity', 'thermodynamics', 'algorithmic complexity', 'philosophy of mind'
    ];
    const QUESTION_TEMPLATES = [
        t => `What is the core principle behind ${t} in one concise sentence?`,
        t => `Why is ${t} important in real-world applications in one sentence?`,
        t => `How does ${t} connect to modern science and technology in one sentence?`
    ];

    async function runSilentSelfPlay() {
        if (document.hidden || !navigator.onLine) return;
        try {
            const pool = [...p.interests, ...SEED_TOPICS];
            const topic = pool[Math.floor(Math.random() * pool.length)];
            const qTemplate = QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)];
            const selfQuestion = qTemplate(topic);

            // Skip if already asked recently
            if (p.selfInsights.some(item => item.q === selfQuestion)) return;

            // Step 1: DESU asks itself the question via fast browser AI or Wikipedia synthesis
            const url = `https://text.pollinations.ai/${encodeURIComponent(selfQuestion)}?model=openai&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent('Answer accurately in one crisp sentence.')}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const answer = (await res.text()).trim();

            if (answer && answer.length > 15 && answer.length < 280 && !answer.includes('Free limit reached') && !answer.includes('pollinations')) {
                p.selfInsights = [...p.selfInsights, { q: selfQuestion, a: answer, t: Date.now() }].slice(-25);
                save();
            }
        } catch (e) {}
    }

    // Continuously asks itself a question every 55 seconds in the background
    setInterval(runSilentSelfPlay, 55000);
    setTimeout(runSilentSelfPlay, 12000);

    applyBotName();

    return {
        core, makeTopic, observe, noteTopic, context, attachFeedback, applyBotName,
        botName: () => p.botName,
        userName: () => p.name,
        mode: () => p.mode
    };
})();
