// learn.js — per-user profile, self-training and feedback. Loads before engine.js.
const Learn = (() => {
    const KEY = 'shinu_profile_v1';
    let p = { botName: 'Desu', name: '', facts: [], interests: {}, style: '', blocked: [], studied: [] };
    try { Object.assign(p, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
    const cap = s => s.replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
    const norm = s => String(s).toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const clean = s => s.replace(/[.!?]+$/, '').trim();
    const say = html => ({ text: html, isHtml: true });

    // "what is X" / "tell me about X" / "X" all become the same key
    const core = s => norm(s).replace(/^(what is|what are|what was|what were|what's|who is|who are|who was|who's|tell me about|tell me|explain|define|describe|meaning of|information about|info on)\s+(an?\s+|the\s+)?/, '');

    function makeTopic(raw) {
        let t = raw.trim().replace(/\s+/g, ' ');
        if (/^[0-9+\-*/().%\s]+$/.test(t)) return 'Quick Calculation';
        if (/^(hello|hi+|hey+|yo|sup)\b[\s!.,?]*$/i.test(t)) return 'Greeting';
        const lead = /^(please\s+|can you\s+|could you\s+|tell me\s+(about\s+)?|(who|what)\s+(is|are|was|were)\s+(an?\s+|the\s+)?|what'?s\s+|who'?s\s+|how\s+(do|can|to|does)\s+(i\s+|you\s+)?|why\s+(is|are|do|does)\s+|explain\s+|define\s+|describe\s+|show me\s+|give me\s+)/i;
        let prev;
        do { prev = t; t = t.replace(lead, ''); } while (t !== prev && t);
        t = t.replace(/[?.!,;:]+$/, '').trim() || raw.trim();
        t = t.split(' ').slice(0, 5).join(' ').replace(/(^|\s)([a-z])/g, (m, s, c) => s + c.toUpperCase());
        return t.length > 30 ? t.slice(0, 29).trim() + '…' : t;
    }

    function applyBotName() {
        const n = p.botName;
        document.querySelectorAll('.brand-title, .drawer-brand span').forEach(el => { el.textContent = n.toUpperCase(); });
        const inp = document.getElementById('userInput');
        if (inp) inp.placeholder = 'Message ' + n + '...';
        document.title = n;
    }

    // Learns from plain statements: "my name is…", "I like…", "keep it short"
    function observe(raw) {
        if (raw.includes('?') || raw.split(/\s+/).length > 14) return null;
        let m;

        if ((m = raw.match(/\byour name is\s+([a-z0-9][a-z0-9_-]{0,14})/i))) {
            p.botName = cap(m[1].toLowerCase()); save(); applyBotName();
            return say(`Got it, from now on I'm <strong>${escapeHtml(p.botName)}</strong>.`);
        }
        if ((m = raw.match(/\b(?:my name is|call me|i am called)\s+([a-z][a-z'-]{1,19})/i))) {
            p.name = cap(m[1].toLowerCase()); save();
            return say(`Nice to meet you, <strong>${escapeHtml(p.name)}</strong>! I'll remember that.`);
        }
        if (/^forget (my name|everything about me)/i.test(raw)) {
            p.name = ''; p.facts = []; save();
            return say("Done, I've forgotten what I knew about you.");
        }

        const asking = /\b(explain|tell me|how|what|why|write|show|give|can you|could you|please|teach|learn)\b/i.test(raw);
        if (!asking) {
            const rules = [
                [/\bi (?:live|stay) in\s+(.+)/i, 'lives in'],
                [/\bi(?:'m| am) from\s+(.+)/i, 'is from'],
                [/\bi (?:like|love|enjoy)\s+(.+)/i, 'likes'],
                [/\bi (?:work as|work at|study)\s+(.+)/i, 'works/studies'],
                [/\bmy favou?rite (\w+) is\s+(.+)/i, null]
            ];
            for (const [re, label] of rules) {
                if ((m = raw.match(re))) {
                    const fact = label ? `${label} ${clean(m[1])}` : `favourite ${m[1]} is ${clean(m[2])}`;
                    if (!p.facts.includes(fact)) p.facts = [...p.facts, fact].slice(-12);
                    save();
                    return say("Noted, I'll remember that.");
                }
            }
        }

        const styles = [
            [/\b(keep it short|be brief|short answers?|be concise)\b/i, 'brief'],
            [/\b(in detail|be detailed|more detail)\b/i, 'detailed'],
            [/\b(explain (it )?simply|like i'?m 5|eli5)\b/i, 'simple']
        ];
        for (const [re, s] of styles) {
            if (re.test(raw)) { p.style = s; save(); return say(`Okay, I'll keep my answers ${s}.`); }
        }
        return null;
    }

    // Short profile sent to the AI so it personalizes replies
    function context() {
        const bits = [];
        if (p.name) bits.push(`The user's name is ${p.name}.`);
        if (p.facts.length) bits.push('About the user: ' + p.facts.join('; ') + '.');
        const top = Object.entries(p.interests).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
        if (top.length) bits.push('Topics they often ask about: ' + top.join(', ') + '.');
        if (p.style) bits.push(`Preferred answer style: ${p.style}.`);
        return { botName: p.botName, text: bits.join(' ') };
    }

    function trackInterest(raw) {
        const t = makeTopic(raw);
        if (t === 'Greeting' || t === 'Quick Calculation') return;
        const k = t.toLowerCase();
        p.interests[k] = (p.interests[k] || 0) + 1;
        const keys = Object.keys(p.interests);
        if (keys.length > 40) {
            const weakest = keys.sort((a, b) => p.interests[a] - p.interests[b])[0];
            delete p.interests[weakest];
        }
        save();
    }

    // Saves good AI answers so repeat questions get instant, consistent replies
    function cacheReply(q, a) {
        const key = core(q);
        if (!key || key.length > 60 || !a || a.length < 20 || a.length > 700) return;
        if (p.blocked.includes(key)) return;
        if (/\b(today|now|current|currently|latest|recent|news|weather|price|score|time|date|year|president|ceo|minister|champion|winner|won|released|newest|my|me|i|we|you|your)\b/i.test(key)) return;
        teachShinu(key, a, 'Auto');
    }

    // 👍 / 👎 under AI replies
    function attachFeedback(div, question, answer) {
        const key = core(question);
        const row = document.createElement('div'); row.className = 'feedback-row';
        const note = document.createElement('span'); note.className = 'fb-note';
        const mk = t => { const b = document.createElement('button'); b.className = 'fb-btn'; b.textContent = t; return b; };
        const up = mk('👍'), down = mk('👎');

        up.onclick = () => {
            p.blocked = p.blocked.filter(b => b !== key); save();
            if (key && key.length <= 60) teachShinu(key, answer, 'Liked');
            note.textContent = 'Learned, thanks!';
            up.remove(); down.remove();
        };
        down.onclick = () => {
            forgetTrigger(key);
            p.blocked = [...p.blocked, key].slice(-100); save();
            note.textContent = 'Thanks! Teach me the right answer below.';
            up.remove(); down.remove();
            const inp = document.getElementById('userInput');
            inp.value = `teach: ${key} = `;
            inp.focus();
        };
        row.append(up, down, note);
        div.appendChild(row);
    }

    // Background self-study: learns topics the user keeps asking about
    async function selfStudy() {
        if (document.hidden || !navigator.onLine) return;
        if (brain.filter(n => n.source === 'Self-Trained').length >= 40) return;
        const next = Object.entries(p.interests)
            .filter(([t, c]) => c >= 2 && !p.studied.includes(t) && !brain.some(b => b.trigger === t))
            .sort((a, b) => b[1] - a[1])[0];
        if (!next) return;
        p.studied = [...p.studied, next[0]].slice(-100); save();
        await deepLearnTopic(next[0], 'Self-Trained', true);
    }
    setInterval(selfStudy, 90000);

    applyBotName();

    return {
        core, makeTopic, observe, context, trackInterest, cacheReply, attachFeedback, applyBotName,
        botName: () => p.botName,
        userName: () => p.name
    };
})();
