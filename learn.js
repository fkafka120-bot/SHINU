// learn.js — DESU Identity, User Profile, Response Modes, Self-Training & Feedback
const Learn = (() => {
    const KEY = 'shinu_profile_v1';
    let p = {
        botName: 'Desu',
        name: '',
        facts: [],
        interests: {},
        style: '',
        mode: 'conversational',
        blocked: [],
        studied: []
    };
    try { Object.assign(p, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
    const cap = s => s.replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
    const norm = s => String(s).toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const clean = s => s.replace(/[.!?]+$/, '').trim();
    const esc = s => (window.DESUCore ? window.DESUCore.escapeHTML(s) : String(s));
    const say = html => ({ text: html, isHtml: true });

    const core = s => norm(s).replace(/^(what is|what are|what was|what were|what's|who is|who are|who was|who's|tell me about|tell me|explain|define|describe|meaning of|information about|info on)\s+(an?\s+|the\s+)?/, '');

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

    // Handles both setting AND querying identity, user profile, and response modes
    function observe(raw) {
        const q = raw.trim();
        const lower = norm(q);
        let m;

        // 1. Response Mode Switching (Roadmap Item #4: Conversational, Educational, Professional)
        if ((m = lower.match(/^(?:set\s+)?(?:mode\s*:?\s*)?(conversational|educational|professional)(?:\s+mode)?$/i))) {
            p.mode = m[1].toLowerCase();
            save();
            applyBotName();
            return say(`Switched to <strong>${cap(p.mode)} Mode</strong>.`);
        }

        // 2. Questions about DESU's own identity ("What's your name?", "Hi what is your name?", "Who are you?")
        if (/^(?:hi\s+|hey\s+|hello\s+)?(?:what(?:'s|\s+is)\s+your\s+name|who\s+are\s+you|what\s+are\s+youCalled)$/i.test(lower)) {
            const userGreeting = p.name ? `, ${esc(p.name)}` : '';
            return say(`I'm <strong>${esc(p.botName)}</strong>${userGreeting} — your independent AI assistant. Currently running in <strong>${esc(p.mode)}</strong> mode.`);
        }

        // 3. Questions about the User's own stored profile ("What is my name?", "Which subject I like?", "Do I like physics?")
        if (/^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i)$/i.test(lower)) {
            if (p.name) return say(`Your name is <strong>${esc(p.name)}</strong>.`);
            return say(`You haven't told me your name yet! Tell me with <code>my name is ...</code>`);
        }

        if (/^(?:what|which)\s+(?:subject|topic|thing)s?\s+(?:do\s+)?i\s+(?:like|love|study|mentioned)/i.test(lower) ||
            /^what\s+do\s+you\s+know\s+about\s+me/i.test(lower) ||
            /^do\s+i\s+(?:like|love)\s+(.+)/i.test(lower)) {
            const doILikeMatch = lower.match(/^do\s+i\s+(?:like|love)\s+(.+)/i);
            const allInterests = Object.keys(p.interests);
            if (doILikeMatch) {
                const subj = doILikeMatch[1].trim();
                const foundInFacts = p.facts.some(f => f.toLowerCase().includes(subj));
                const foundInTopics = allInterests.some(t => t.toLowerCase().includes(subj));
                if (foundInFacts || foundInTopics) {
                    return say(`Yes! You've mentioned an interest in <strong>${esc(subj)}</strong>.`);
                }
            }
            const summaryBits = [];
            if (p.name) summaryBits.push(`Your name is <strong>${esc(p.name)}</strong>`);
            if (p.facts.length) summaryBits.push(`You told me you ${p.facts.map(esc).join(', ')}`);
            if (allInterests.length) summaryBits.push(`Topics we've explored: <strong>${allInterests.slice(-5).map(esc).join(', ')}</strong>`);
            if (summaryBits.length) return say(summaryBits.join('. ') + '.');
            return say(`You haven't shared your favourite subjects with me yet! Try saying <code>I like physics</code>.`);
        }

        // 4. Statements that teach DESU about its name or the user's profile
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
            p.name = ''; p.facts = []; p.interests = {}; save();
            return say("Done, I've cleared your personal profile memory.");
        }

        const asking = /\b(explain|tell me|how|what|why|write|show|give|can you|could you|please|teach|learn)\b/i.test(q);
        if (!asking) {
            const rules = [
                [/\bi (?:live|stay) in\s+(.+)/i, 'live in'],
                [/\bi(?:'m| am) from\s+(.+)/i, 'are from'],
                [/\bi (?:like|love|enjoy)\s+(.+)/i, 'like'],
                [/\bi (?:work as|work at|study)\s+(.+)/i, 'study/work in'],
                [/\bmy favou?rite (\w+) is\s+(.+)/i, null]
            ];
            for (const [re, label] of rules) {
                if ((m = q.match(re))) {
                    const item = clean(m[2] || m[1]);
                    const fact = label ? `${label} ${item}` : `favourite ${m[1]} is ${item}`;
                    if (!p.facts.includes(fact)) p.facts = [...p.facts, fact].slice(-12);
                    p.interests[item.toLowerCase()] = (p.interests[item.toLowerCase()] || 0) + 2;
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

    function context() {
        const bits = [];
        if (p.name) bits.push(`The user's name is ${p.name}.`);
        if (p.facts.length) bits.push('User facts: ' + p.facts.join('; ') + '.');
        const top = Object.entries(p.interests).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
        if (top.length) bits.push('User interests: ' + top.join(', ') + '.');
        if (p.style) bits.push(`Preferred answer style: ${p.style}.`);
        return { botName: p.botName, mode: p.mode || 'conversational', text: bits.join(' ') };
    }

    function trackInterest(raw) {
        const t = makeTopic(raw);
        if (t === 'Conversation' || t === 'Mathematics') return;
        const k = t.toLowerCase();
        p.interests[k] = (p.interests[k] || 0) + 1;
        const keys = Object.keys(p.interests);
        if (keys.length > 40) {
            const weakest = keys.sort((a, b) => p.interests[a] - p.interests[b])[0];
            delete p.interests[weakest];
        }
        save();
    }

    function cacheReply(q, a) {
        const key = core(q);
        if (!key || key.length > 60 || !a || a.length < 20 || a.length > 700) return;
        if (p.blocked.includes(key)) return;
        if (/\b(today|now|current|currently|latest|recent|news|weather|price|score|time|date|year|president|ceo|minister|champion|winner|won|released|newest|my|me|i|we|you|your)\b/i.test(key)) return;
        if (typeof teachShinu === 'function') teachShinu(key, a, 'Auto');
    }

    function attachFeedback(div, question, answer) {
        const key = core(question);
        const row = document.createElement('div'); row.className = 'feedback-row';
        const note = document.createElement('span'); note.className = 'fb-note';
        const mk = t => { const b = document.createElement('button'); b.className = 'fb-btn'; b.textContent = t; return b; };
        const up = mk('👍'), down = mk('👎');

        up.onclick = () => {
            p.blocked = p.blocked.filter(b => b !== key); save();
            if (key && key.length <= 60 && typeof teachShinu === 'function') teachShinu(key, answer, 'Verified');
            note.textContent = 'Verified & saved to memory';
            up.remove(); down.remove();
        };
        down.onclick = () => {
            if (typeof forgetTrigger === 'function') forgetTrigger(key);
            p.blocked = [...p.blocked, key].slice(-100); save();
            note.textContent = 'Removed. Teach the correct response below:';
            up.remove(); down.remove();
            const inp = document.getElementById('userInput');
            inp.value = `teach: ${key} = `;
            inp.focus();
        };
        row.append(up, down, note);
        div.appendChild(row);
    }

    async function selfStudy() {
        if (document.hidden || !navigator.onLine || typeof brain === 'undefined') return;
        if (brain.filter(n => n.source === 'Self-Trained').length >= 40) return;
        const next = Object.entries(p.interests)
            .filter(([t, c]) => c >= 2 && !p.studied.includes(t) && !brain.some(b => b.trigger === t))
            .sort((a, b) => b[1] - a[1])[0];
        if (!next) return;
        p.studied = [...p.studied, next[0]].slice(-100); save();
        if (typeof deepLearnTopic === 'function') await deepLearnTopic(next[0], 'Self-Trained', true);
    }
    setInterval(selfStudy, 90000);

    applyBotName();

    return {
        core, makeTopic, observe, context, trackInterest, cacheReply, attachFeedback, applyBotName,
        botName: () => p.botName,
        userName: () => p.name,
        mode: () => p.mode
    };
})();
