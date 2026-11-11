// learn.js — DESU Profile, Neon Feedback Motifs & Active Quality Retraining Engine
const Learn = (() => {
    // Remove any legacy header pills or modals
    ['headerBrainPill', 'selfTrainPill', 'trainModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    const oldDrawerBtn = document.getElementById('openTrainModalBtn');
    if (oldDrawerBtn && oldDrawerBtn.parentElement) oldDrawerBtn.parentElement.remove();

    const KEY = 'desu_profile_v5';
    let p = {
        botName: 'Desu',
        name: '',
        facts: [],
        interests: [],
        goldenReplies: {},
        corrections: [],
        qualityWeights: { depth: 1, structure: 1, examples: 1 },
        style: '',
        mode: 'conversational'
    };
    try {
        const prev = JSON.parse(localStorage.getItem('desu_profile_v4') || '{}');
        const curr = JSON.parse(localStorage.getItem(KEY) || '{}');
        Object.assign(p, prev, curr);
        if (!Array.isArray(p.interests)) p.interests = [];
        if (!Array.isArray(p.corrections)) p.corrections = [];
        if (!p.goldenReplies || typeof p.goldenReplies !== 'object') p.goldenReplies = {};
        if (!p.qualityWeights) p.qualityWeights = { depth: 1, structure: 1, examples: 1 };
    } catch (e) {}

    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
    const cap = s => s.replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
    const norm = s => String(s).toLowerCase().replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
    const clean = s => s.replace(/[.!?]+$/, '').trim();
    const esc = s => (window.DESUCore ? window.DESUCore.escapeHTML(s) : String(s));
    const say = html => ({ text: html, isHtml: true });

    // Inline-styled Neon Vector Motifs so they are 100% visible on every mobile browser
    const NEON_THUMB_UP = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; filter:drop-shadow(0 0 5px var(--accent-purple));">
            <rect x="2" y="10" width="4.5" height="11" rx="1.2"/>
            <path d="M6.5 11l4.3-7.4a1.8 1.8 0 0 1 3.3 1.1L13.4 9.5h5.8a2 2 0 0 1 1.95 2.45l-1.6 7.5A2 2 0 0 1 17.6 21H6.5"/>
        </svg>`;

    const NEON_THUMB_DOWN = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; filter:drop-shadow(0 0 5px var(--accent-purple));">
            <rect x="17.5" y="3" width="4.5" height="11" rx="1.2"/>
            <path d="M17.5 13l-4.3 7.4a1.8 1.8 0 0 1-3.3-1.1l.7-4.8H4.8a2 2 0 0 1-1.95-2.45l1.6-7.5A2 2 0 0 1 6.4 3h11.1"/>
        </svg>`;

    const core = s => norm(s).replace(/^(what is|what are|what was|what were|what's|who is|who are|who was|who's|tell me about|tell me|explain|define|describe|meaning of|information about|info on|search for|search)\s+(an?\s+|the\s+)?/, '');

    function makeTopic(raw) {
        let t = raw.trim().replace(/\s+/g, ' ');
        if (/^[0-9+\-*/().%\s]+$/.test(t) || /\b(table of|integrate|integration|derivative|solve)\b/i.test(t)) return 'Mathematics';
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

        // 2. Direct Teaching Command ("teach: question = answer")
        if ((m = q.match(/^(?:teach|learn|train)\s*:?\s*(.+?)\s*=\s*(.+)$/i))) {
            const k = core(m[1]);
            p.goldenReplies[k] = m[2].trim();
            save();
            return say(`Trained! I've locked that response for <strong>"${esc(k)}"</strong> into my verified memory.`);
        }

        // 3. Identity Queries
        if (/^(?:hi\s+|hey\s+|hello\s+)?(?:what(?:'s|\s+is)\s+your\s+name|who\s+are\s+you)$/i.test(lower)) {
            const userGreeting = p.name ? `, ${esc(p.name)}` : '';
            return say(`I'm <strong>${esc(p.botName)}</strong>${userGreeting} — your AI collaborator, running in <strong>${esc(p.mode)}</strong> mode.`);
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
            p.name = ''; p.facts = []; p.interests = []; p.goldenReplies = {}; p.corrections = []; save();
            return say("Done, I've cleared your profile details.");
        }

        const asking = /\b(explain|tell me|how|what|why|write|show|give|can you|could you|please|image|video|audio|draw|animate|integrate|derivative|solve)\b/i.test(q);
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

    function getGoldenReply(rawQuery) {
        const k = core(rawQuery);
        return p.goldenReplies[k] || null;
    }

    function context() {
        const bits = [];
        if (p.name) bits.push(`The user's name is ${p.name}.`);
        if (p.facts.length) bits.push('User profile: ' + p.facts.join('; ') + '.');
        if (p.style) bits.push(`Preferred answer style: ${p.style}.`);

        // Inject learned quality rules from Thumbs Up / Thumbs Down training
        const qRules = [];
        if (p.qualityWeights.depth >= 2) qRules.push('Provide thorough, insightful explanations with strong depth.');
        if (p.qualityWeights.depth <= 0) qRules.push('Keep answers tight, punchy, and under 3 sentences.');
        if (p.qualityWeights.structure >= 2) qRules.push('Use clean bullet points and bold key terms.');
        if (p.qualityWeights.examples >= 2) qRules.push('Include a concrete example or step-by-step walkthrough.');
        if (qRules.length) bits.push('Trained Quality Directives: ' + qRules.join(' '));

        if (p.corrections.length) {
            bits.push('Past user corrections to strictly follow: ' + p.corrections.slice(-5).join(' | '));
        }
        return { botName: p.botName, mode: p.mode || 'conversational', text: bits.join(' ') };
    }

    // Usable Neon Thumbs Up / Down that actively trains DESU and regenerates better answers
    function attachFeedback(div, userQuestion = '', botAnswer = '') {
        const row = document.createElement('div');
        row.className = 'feedback-row';

        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'fb-btn';
        up.title = 'Good reply — train DESU to reply like this more often';
        up.innerHTML = `${NEON_THUMB_UP}<span>Good</span>`;

        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'fb-btn';
        down.title = 'Improve reply — retrain & regenerate a better answer';
        down.innerHTML = `${NEON_THUMB_DOWN}<span>Improve</span>`;

        const note = document.createElement('span');
        note.className = 'fb-note';

        up.onclick = () => {
            up.classList.add('selected');
            down.remove();

            const k = core(userQuestion);
            const cleanAns = String(botAnswer).replace(/<[^>]+>/g, '').trim();
            if (k && k.length > 2 && cleanAns.length > 10 && !cleanAns.startsWith('[Generated')) {
                p.goldenReplies[k] = cleanAns;
            }
            if (cleanAns.length > 180) p.qualityWeights.depth = Math.min(3, (p.qualityWeights.depth || 1) + 1);
            if (cleanAns.includes('•') || cleanAns.includes('1.')) p.qualityWeights.structure = Math.min(3, (p.qualityWeights.structure || 1) + 1);
            save();

            note.textContent = '✦ Trained: Style reinforced & saved to verified memory';
        };

        down.onclick = () => {
            down.classList.add('selected');
            up.remove();

            const k = core(userQuestion);
            if (k && p.goldenReplies[k]) {
                delete p.goldenReplies[k];
                save();
            }

            // Show interactive 1-tap Quality Retrainer chips
            const trainerBar = document.createElement('div');
            trainerBar.className = 'retrain-bar';
            trainerBar.innerHTML = `
                <div class="retrain-title">How should I improve this reply? (Trains future answers + regenerates now):</div>
                <div class="retrain-chips">
                    <button type="button" class="retrain-chip" data-mode="deeper">⚡ Deeper & More Detailed</button>
                    <button type="button" class="retrain-chip" data-mode="shorter">🎯 Shorter & Direct</button>
                    <button type="button" class="retrain-chip" data-mode="steps">🧠 Step-by-Step Logic</button>
                    <button type="button" class="retrain-chip" data-mode="custom">✏️ Teach Exact Answer</button>
                </div>
            `;

            trainerBar.querySelectorAll('.retrain-chip').forEach(chip => {
                chip.onclick = () => {
                    const action = chip.getAttribute('data-mode');
                    if (action === 'custom') {
                        const inp = document.getElementById('userInput');
                        if (inp) {
                            inp.value = `teach: ${userQuestion || 'topic'} = `;
                            inp.focus();
                        }
                        trainerBar.remove();
                        note.textContent = '✦ Type the exact answer below to lock it in';
                        return;
                    }

                    let directive = '';
                    if (action === 'deeper') {
                        p.qualityWeights.depth = 3;
                        p.style = 'detailed';
                        directive = 'Provide a much deeper, more comprehensive explanation with concrete examples.';
                    } else if (action === 'shorter') {
                        p.qualityWeights.depth = 0;
                        p.style = 'brief';
                        directive = 'Be ultra-concise, direct, and answer in 2 crisp sentences.';
                    } else if (action === 'steps') {
                        p.qualityWeights.structure = 3;
                        p.qualityWeights.examples = 3;
                        directive = 'Break the answer down into clear, numbered step-by-step logic.';
                    }

                    p.corrections = [...p.corrections, `For "${userQuestion}": ${directive}`].slice(-10);
                    save();
                    trainerBar.remove();
                    note.textContent = '✦ Retraining & regenerating improved reply...';

                    if (typeof window.regenerateImprovedReply === 'function' && userQuestion) {
                        window.regenerateImprovedReply(userQuestion, botAnswer, directive);
                    }
                };
            });

            div.appendChild(trainerBar);
        };

        row.append(up, down, note);
        div.appendChild(row);
    }

    applyBotName();

    const api = {
        core, makeTopic, observe, noteTopic, getGoldenReply, context, attachFeedback, applyBotName,
        botName: () => p.botName,
        userName: () => p.name,
        mode: () => p.mode
    };
    window.Learn = api;
    return api;
})();
