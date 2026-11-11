// engine.js — DESU Coded Media Studio (Water, House, Cat, Space, City, Fire + Web Audio), Full Math/Calculus Solver & Smart Fallback
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
function load(k) { try { return localStorage.getItem(k); } catch (e) {} return null; }
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function safeUrl(u) { return /^https?:\/\//i.test(String(u)) ? String(u) : '#'; }

(function ensureStudioPills() {
    const pillBox = document.querySelector('.platform-pills');
    if (!pillBox) return;
    const needed = [
        { prefix: 'image ', label: '✨ Image' },
        { prefix: 'video ', label: '🎬 Video' },
        { prefix: 'audio ', label: '🎵 Audio' }
    ];
    needed.reverse().forEach(item => {
        if (!pillBox.querySelector(`[data-prefix="${item.prefix}"]`)) {
            const p = document.createElement('span');
            p.className = 'plat-pill';
            p.setAttribute('data-prefix', item.prefix);
            p.textContent = item.label;
            p.onclick = () => {
                userInput.value = item.prefix;
                sideDrawer.classList.remove('open');
                drawerBackdrop.classList.remove('active');
                userInput.focus();
            };
            pillBox.prepend(p);
        }
    });
})();

function formatCleanMarkdown(raw) {
    let safe = escapeHtml(raw);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/^\s*[-*]\s+/gm, '• ');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
}

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
                    const delay = Math.min(wordIndex * 0.024, 1.5).toFixed(3);
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
            !node.classList.contains('desu-media-card') &&
            node.tagName !== 'SCRIPT' &&
            node.tagName !== 'STYLE' &&
            node.tagName !== 'SVG' &&
            node.tagName !== 'CANVAS' &&
            node.tagName !== 'PRE'
        ) {
            Array.from(node.childNodes).forEach(walk);
        }
    };
    Array.from(containerEl.childNodes).forEach(walk);
}

menuToggle.onclick = () => { sideDrawer.classList.toggle('open'); drawerBackdrop.classList.toggle('active'); };
drawerBackdrop.onclick = () => { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); };

// ============================================================================
// 1. COMPLETE MATHEMATICS, CALCULUS & ALGEBRA ENGINE
// Solves Integrals, Differentials, Derivatives, Linear/Quadratic Equations & Word Math
// ============================================================================
function formatTermCoef(c, pow) {
    const rounded = Math.round(c * 10000) / 10000;
    if (pow === 0) return `${rounded}`;
    const v = pow === 1 ? 'x' : `x^${pow}`;
    if (rounded === 1) return v;
    if (rounded === -1) return `-${v}`;
    return `${rounded}${v}`;
}

function integrateSingleTerm(termStr) {
    const t = termStr.replace(/\s+/g, '').toLowerCase();
    if (!t) return null;

    if (/^[+-]?\d+(\.\d+)?$/.test(t)) {
        const c = parseFloat(t);
        if (c === 0) return '0';
        return c === 1 ? 'x' : c === -1 ? '-x' : `${c}x`;
    }

    const recipMatch = t.match(/^([+-]?\d*(?:\.\d+)?)\/x$/);
    if (recipMatch) {
        const c = recipMatch[1] === '' || recipMatch[1] === '+' ? 1 : recipMatch[1] === '-' ? -1 : parseFloat(recipMatch[1]);
        return c === 1 ? 'ln|x|' : `${c}·ln|x|`;
    }

    if (t === 'sin(x)' || t === 'sinx') return '-cos(x)';
    if (t === 'cos(x)' || t === 'cosx') return 'sin(x)';
    if (t === 'sec^2(x)' || t === 'sec^2x') return 'tan(x)';
    if (t === 'e^x' || t === 'exp(x)') return 'e^x';
    if (t === 'sqrt(x)') return '(2/3)x^(3/2)';

    const sinKx = t.match(/^sin\((\d+)x\)$/);
    if (sinKx) return `-(1/${sinKx[1]})cos(${sinKx[1]}x)`;
    const cosKx = t.match(/^cos\((\d+)x\)$/);
    if (cosKx) return `(1/${cosKx[1]})sin(${cosKx[1]}x)`;
    const expKx = t.match(/^e\^\(?([+-]?\d+)x\)?$/);
    if (expKx) return `(1/${expKx[1]})e^(${expKx[1]}x)`;

    const polyMatch = t.match(/^([+-]?\d*(?:\.\d+)?)\*?x(?:\^([+-]?\d+(?:\.\d+)?))?$/);
    if (polyMatch) {
        const rawC = polyMatch[1];
        const c = (rawC === '' || rawC === '+') ? 1 : (rawC === '-') ? -1 : parseFloat(rawC);
        const n = polyMatch[2] !== undefined ? parseFloat(polyMatch[2]) : 1;
        if (n === -1) return c === 1 ? 'ln|x|' : `${c}·ln|x|`;
        const newPow = n + 1;
        const newCoef = c / newPow;
        if (Number.isInteger(c) && Number.isInteger(newPow) && c % newPow !== 0) {
            const v = newPow === 1 ? 'x' : `x^${newPow}`;
            return `(${c}/${newPow})${v}`;
        }
        return formatTermCoef(newCoef, newPow);
    }
    return null;
}

function differentiateSingleTerm(termStr) {
    const t = termStr.replace(/\s+/g, '').toLowerCase();
    if (!t) return null;
    if (/^[+-]?\d+(\.\d+)?$/.test(t)) return '0';
    if (t === 'sin(x)' || t === 'sinx') return 'cos(x)';
    if (t === 'cos(x)' || t === 'cosx') return '-sin(x)';
    if (t === 'tan(x)' || t === 'tanx') return 'sec^2(x)';
    if (t === 'e^x' || t === 'exp(x)') return 'e^x';
    if (t === 'ln(x)' || t === 'lnx' || t === 'log(x)') return '1/x';
    if (t === 'sqrt(x)') return '1/(2√x)';

    const polyMatch = t.match(/^([+-]?\d*(?:\.\d+)?)\*?x(?:\^([+-]?\d+(?:\.\d+)?))?$/);
    if (polyMatch) {
        const rawC = polyMatch[1];
        const c = (rawC === '' || rawC === '+') ? 1 : (rawC === '-') ? -1 : parseFloat(rawC);
        const n = polyMatch[2] !== undefined ? parseFloat(polyMatch[2]) : 1;
        const newCoef = c * n;
        const newPow = n - 1;
        return formatTermCoef(newCoef, newPow);
    }
    return null;
}

// Universal Algebraic Solver for ANY Linear or Quadratic Equation (e.g. "Solve 2x=6", "3x + 5 = 20", "x^2 - 5x + 6 = 0")
function solveAlgebraicEquation(eqRaw) {
    const cleaned = eqRaw.replace(/^(?:solve|find\s+x\s+in|calculate)\s*:?\s*/i, '').replace(/[?!.]+$/, '').trim();
    if (!cleaned.includes('=') || !/[a-z]/i.test(cleaned)) return null;

    const parts = cleaned.split('=');
    if (parts.length !== 2) return null;

    const varMatch = cleaned.match(/[a-z]/i);
    const v = varMatch ? varMatch[0].toLowerCase() : 'x';

    const toJs = (str) => str
        .toLowerCase()
        .replace(new RegExp(v, 'g'), '(x)')
        .replace(/(\d)\s*\(/g, '$1*(')
        .replace(/\)\s*(\d)/g, ')*$1')
        .replace(/\)\s*\(/g, ')*(')
        .replace(/\^/g, '**');

    try {
        const fn = new Function('x', `"use strict"; return (${toJs(parts[0])}) - (${toJs(parts[1])});`);
        const f0 = fn(0);
        const f1 = fn(1);
        const fm1 = fn(-1);
        const f2 = fn(2);

        if ([f0, f1, fm1, f2].some(val => typeof val !== 'number' || !isFinite(val))) return null;

        // Determine polynomial coefficients f(x) = a*x^2 + b*x + c
        const c = f0;
        const a = (f1 + fm1) / 2 - c;
        const b = (f1 - fm1) / 2;

        // Verify degree <= 2 using f(2)
        if (Math.abs((4 * a + 2 * b + c) - f2) > 1e-6) return null;

        // Case 1: Linear Equation (a ≈ 0, b ≠ 0), e.g., "2x = 6"
        if (Math.abs(a) < 1e-9 && Math.abs(b) > 1e-9) {
            const root = Math.round((-c / b) * 100000) / 100000;
            return {
                text: `<strong>Linear Equation Solution (${escapeHtml(cleaned)}):</strong><br>` +
                      `• Standard form: <code>${Math.round(b * 1000) / 1000}${v} + (${Math.round(c * 1000) / 1000}) = 0</code><br>` +
                      `• Divide by coefficient (${Math.round(b * 1000) / 1000}):<br>` +
                      `• <strong>${v} = ${root}</strong>`,
                isHtml: true
            };
        }

        // Case 2: Quadratic Equation (a ≠ 0)
        if (Math.abs(a) >= 1e-9) {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const r1 = Math.round(((-b + Math.sqrt(disc)) / (2 * a)) * 10000) / 10000;
                const r2 = Math.round(((-b - Math.sqrt(disc)) / (2 * a)) * 10000) / 10000;
                const rootsText = r1 === r2 ? `<strong>${v} = ${r1}</strong> (double root)` : `<strong>${v}₁ = ${r1}</strong>, <strong>${v}₂ = ${r2}</strong>`;
                return {
                    text: `<strong>Quadratic Equation Solution (${escapeHtml(cleaned)}):</strong><br>` +
                          `• Discriminant (Δ = b² - 4ac) = <strong>${Math.round(disc * 1000) / 1000}</strong><br>` +
                          `• Solution: ${rootsText}`,
                    isHtml: true
                };
            } else {
                const realPart = Math.round((-b / (2 * a)) * 10000) / 10000;
                const imagPart = Math.round((Math.sqrt(-disc) / Math.abs(2 * a)) * 10000) / 10000;
                return {
                    text: `<strong>Complex Quadratic Solution (${escapeHtml(cleaned)}):</strong><br>` +
                          `• Discriminant (Δ) = <strong>${Math.round(disc * 1000) / 1000} &lt; 0</strong><br>` +
                          `• Roots: <strong>${v} = ${realPart} ± ${imagPart}i</strong>`,
                    isHtml: true
                };
            }
        }
    } catch (e) {}
    return null;
}

function trySymbolicAndNumericalMath(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    // 1. Multiplication Tables
    const tableMatch = q.match(/^(?:write\s+|print\s+|show\s+|give\s+me\s+)?(?:the\s+)?table\s+of\s+(\d+)$/i);
    if (tableMatch) {
        const n = parseInt(tableMatch[1], 10);
        let out = `Here is the multiplication table of <strong>${n}</strong>:<br><br>`;
        for (let i = 1; i <= 10; i++) out += `${n} × ${i} = <strong>${n * i}</strong><br>`;
        return { text: out, isHtml: true, followUp: `table of ${n + 1}` };
    }

    // 2. Natural-Language Word Math ("Difference between 5 and 7", "Sum of 12 and 8", "Product of 6 and 9", "20% of 150")
    const diffMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?difference\s+between\s+([+-]?\d+(?:\.\d+)?)\s+and\s+([+-]?\d+(?:\.\d+)?)[?.!]*$/i);
    if (diffMatch) {
        const a = parseFloat(diffMatch[1]), b = parseFloat(diffMatch[2]);
        const absDiff = Math.round(Math.abs(a - b) * 100000) / 100000;
        const signedDiff = Math.round((a - b) * 100000) / 100000;
        return {
            text: `The absolute difference between <strong>${a}</strong> and <strong>${b}</strong> is <strong>|${a} - ${b}| = ${absDiff}</strong> (and the directed subtraction is <code>${a} - ${b} = ${signedDiff}</code>).`,
            isHtml: true
        };
    }

    const sumMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?sum\s+of\s+([+-]?\d+(?:\.\d+)?)\s+and\s+([+-]?\d+(?:\.\d+)?)[?.!]*$/i);
    if (sumMatch) {
        const a = parseFloat(sumMatch[1]), b = parseFloat(sumMatch[2]);
        return { text: `The sum of <strong>${a}</strong> and <strong>${b}</strong> is <strong>${a + b}</strong>.`, isHtml: true };
    }

    const prodMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?product\s+of\s+([+-]?\d+(?:\.\d+)?)\s+and\s+([+-]?\d+(?:\.\d+)?)[?.!]*$/i);
    if (prodMatch) {
        const a = parseFloat(prodMatch[1]), b = parseFloat(prodMatch[2]);
        return { text: `The product of <strong>${a}</strong> and <strong>${b}</strong> is <strong>${a * b}</strong>.`, isHtml: true };
    }

    const pctMatch = q.match(/^(?:what\s+is\s+)?(\d+(?:\.\d+)?)\s*%\s+of\s+(\d+(?:\.\d+)?)[?.!]*$/i);
    if (pctMatch) {
        const p = parseFloat(pctMatch[1]), total = parseFloat(pctMatch[2]);
        const res = Math.round(((p / 100) * total) * 100000) / 100000;
        return { text: `<strong>${p}%</strong> of <strong>${total}</strong> = <strong>${res}</strong>`, isHtml: true };
    }

    // 3. Indefinite & Definite Integration ("integration of 2x", "integrate 3x+6", "∫ 2x dx")
    const intMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:integration|integral|antiderivative|integrate)\s+(?:of\s+)?(.+?)(?:\s+dx)?(?:\s+from\s+([+-]?\d+(?:\.\d+)?)\s+to\s+([+-]?\d+(?:\.\d+)?))?[?.!]*$/i) ||
                     q.match(/^∫\s*(.+?)(?:\s*dx)?$/i);
    if (intMatch) {
        const expr = intMatch[1].trim();
        const limA = intMatch[2] !== undefined ? parseFloat(intMatch[2]) : null;
        const limB = intMatch[3] !== undefined ? parseFloat(intMatch[3]) : null;

        const rawTerms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [expr];
        const integratedTerms = rawTerms.map(integrateSingleTerm);

        if (integratedTerms.every(Boolean)) {
            const joined = integratedTerms.join(' + ').replace(/\+\s*-/g, '- ');
            let html = `<strong>Symbolic Integration:</strong><br>`;
            html += `∫ (${escapeHtml(expr)}) dx = <strong>${escapeHtml(joined)} + C</strong><br><br>`;
            html += `<span style="color:var(--text-muted); font-size:13.5px;">• Applied the Power / Calculus Integration Rule: ∫ a·xⁿ dx = a·xⁿ⁺¹ / (n + 1) + C.</span>`;

            if (limA !== null && limB !== null) {
                try {
                    const jsFn = new Function('x', `return (${expr.replace(/(\d)(x)/gi, '$1*$2').replace(/\^/g, '**').replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/exp/g, 'Math.exp')});`);
                    const steps = 200;
                    const h = (limB - limA) / steps;
                    let sum = jsFn(limA) + jsFn(limB);
                    for (let i = 1; i < steps; i++) sum += jsFn(limA + i * h) * (i % 2 === 0 ? 2 : 4);
                    const defVal = Math.round(((h / 3) * sum) * 100000) / 100000;
                    html += `<br>• <strong>Definite Integral [${limA} to ${limB}]:</strong> <strong>${defVal}</strong>`;
                } catch (e) {}
            }
            return { text: html, isHtml: true, followUp: `differentiation of ${expr}` };
        }
    }

    // 4. Differentiation, Derivatives & Differentials ("Differential of 2x", "Differentiation of 2x", "derivative of x^3")
    const derivMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:differential|derivative|differentiation|differentiate|d\/dx)\s+(?:of\s+)?(.+?)[?.!]*$/i);
    if (derivMatch) {
        const expr = derivMatch[1].trim();
        const isDifferentialWord = /\bdifferential\b/i.test(q);
        const rawTerms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [expr];
        const diffTerms = rawTerms.map(differentiateSingleTerm);
        if (diffTerms.every(Boolean)) {
            const nonZero = diffTerms.filter(t => t !== '0');
            const joined = (nonZero.length ? nonZero.join(' + ') : '0').replace(/\+\s*-/g, '- ');
            const diffLine = isDifferentialWord
                ? `• Total Differential: <strong>dy = (${escapeHtml(joined)}) dx</strong><br>• Derivative: <strong>d/dx (${escapeHtml(expr)}) = ${escapeHtml(joined)}</strong>`
                : `d/dx (${escapeHtml(expr)}) = <strong>${escapeHtml(joined)}</strong>`;
            return {
                text: `<strong>Symbolic ${isDifferentialWord ? 'Differential & Derivative' : 'Derivative'}:</strong><br>${diffLine}<br><br><span style="color:var(--text-muted); font-size:13.5px;">• Applied the Power / Differentiation Rule: d/dx (a·xⁿ) = a·n·xⁿ⁻¹.</span>`,
                isHtml: true,
                followUp: `integration of ${expr}`
            };
        }
    }

    // 5. Universal Linear & Quadratic Equation Solver ("Solve 2x=6", "2x + 4 = 10", "solve x^2 - 5x + 6 = 0")
    if (/^(?:solve|find\s+x)\b/i.test(q) || (/^[0-9a-z+\-*/^().\s]+=+[0-9a-z+\-*/^().\s]+$/i.test(q) && /[a-z]/i.test(q))) {
        const eqResult = solveAlgebraicEquation(q);
        if (eqResult) return eqResult;
    }

    // 6. Direct Arithmetic & Scientific Expressions
    let mathStr = lower
        .replace(/^(what is|calculate|compute|evaluate)\s+/i, '')
        .replace(/divided by/g, '/')
        .replace(/plus/g, '+')
        .replace(/minus/g, '-')
        .replace(/times|multiplied by/g, '*')
        .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\^/g, '**')
        .replace(/[?=]/g, '')
        .trim();

    if (/^[0-9+\-*/().%\s]+$/.test(mathStr) && /[0-9]/.test(mathStr) && /[+\-*/%]/.test(mathStr)) {
        try {
            const val = Function('"use strict"; return (' + mathStr + ')')();
            if (typeof val === 'number' && isFinite(val)) {
                return { text: `${escapeHtml(q.replace(/[?=]+$/, ''))} = <strong>${Math.round(val * 1000000) / 1000000}</strong>`, isHtml: true };
            }
        } catch (e) {}
    }

    return null;
}

// ============================================================================
// 2. 100% CODED PROCEDURAL IMAGE, ANIMATED VIDEO & WEB AUDIO STUDIO
// Supports Water/Ocean, House/Room Interiors, Cat, Fire, Space, City, Nature & Synth
// ============================================================================
function parseMediaCommand(raw) {
    // Strip leading "tell me about" or "explore" so clicking follow-up chips triggers media directly!
    const q = raw.trim().replace(/^(?:tell\s+me\s+about|would\s+you\s+like\s+to\s+explore|explore|show\s+me)\s+/i, '').trim();

    const audMatch = q.match(/^(?:generate\s+|create\s+|make\s+|play\s+|synthesize\s+)?(?:a\s+|an\s+)?(?:coded\s+)?(?:audio|sound|music|melody|voice|sfx|beat|tone)\s*(?:of|for|about|:)?\s+(.+)$/i);
    if (audMatch) return { type: 'audio', prompt: audMatch[1].trim() };

    const vidMatch = q.match(/^(?:generate\s+|create\s+|make\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:video|animation|motion|reel|clip)\s*(?:of|about|for|:)?\s+(.+)$/i) ||
                     q.match(/^(?:animate)\s*:?\s+(.+)$/i);
    if (vidMatch) return { type: 'video', prompt: vidMatch[1].trim() };

    const imgMatch = q.match(/^(?:generate\s+|create\s+|make\s+|draw\s+|paint\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:image|picture|photo|art|illustration|drawing)\s*(?:of|for|about|:)?\s+(.+)$/i) ||
                     q.match(/^(?:draw|paint)\s*:?\s+(.+)$/i);
    if (imgMatch) return { type: 'image', prompt: imgMatch[1].trim() };

    return null;
}

function drawProceduralScene(ctx, w, h, prompt, t = 0, seed = 1) {
    const p = prompt.toLowerCase();
    const isCat = /\b(cat|kitten|feline|kitty|meow)\b/.test(p);
    const isHouse = /\b(house|home|room|living|indoors|inside|sofa|couch|window)\b/.test(p);
    const isWater = /\b(water|ocean|sea|wave|waves|river|lake|rain|underwater|fish|aqua)\b/.test(p);
    const isFire = /\b(fire|flame|lava|campfire|bonfire|ember|burn)\b/.test(p);
    const isSpace = /\b(space|planet|solar|galaxy|star|cosmos|orbit|astrophysics)\b/.test(p);
    const isCity = /\b(city|cyberpunk|street|building|neon|urban|car)\b/.test(p);

    // 1. BACKGROUND ENVIRONMENT LAYER
    if (isHouse) {
        // Cozy House Interior: Warm wall, wooden floorboards, glowing window with night sky, curtains & rug
        const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
        wallGrad.addColorStop(0, '#1e1533');
        wallGrad.addColorStop(1, '#2d1f4a');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, h * 0.72);

        // Wooden Floor
        ctx.fillStyle = '#26152b';
        ctx.fillRect(0, h * 0.72, w, h * 0.28);
        ctx.strokeStyle = 'rgba(255, 190, 150, 0.12)';
        ctx.lineWidth = 2;
        for (let fy = h * 0.72; fy < h; fy += 18) {
            ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(w, fy); ctx.stroke();
        }

        // Window with Moon & Stars outside
        const wx = w * 0.62, wy = h * 0.12, ww = 120, wh = 135;
        ctx.fillStyle = '#090619';
        ctx.fillRect(wx, wy, ww, wh);
        // Moon outside window
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(wx + 82, wy + 38, 16, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Window Frame Crossbars
        ctx.strokeStyle = '#6b4c9a';
        ctx.lineWidth = 5;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
        ctx.stroke();

        // Cozy Living Room Rug
        ctx.fillStyle = 'rgba(196, 150, 255, 0.18)';
        ctx.beginPath();
        ctx.ellipse(w * 0.48, h * 0.83, 165, 34, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (isWater) {
        // Deep Ocean & Shimmering Moonlit Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#040d1a');
        skyGrad.addColorStop(0.42, '#0a2246');
        skyGrad.addColorStop(1, '#031026');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Glowing Moon & Shimmering Water Reflections
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.22, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Multi-Layered Animated Sine / Gerstner Ocean Waves
        const waveColors = [
            'rgba(14, 116, 144, 0.55)',
            'rgba(2, 132, 199, 0.65)',
            'rgba(56, 189, 248, 0.50)',
            'rgba(3, 105, 161, 0.85)'
        ];
        waveColors.forEach((col, layer) => {
            const baseY = h * (0.46 + layer * 0.11);
            const amp = 14 + layer * 4;
            const freq = 0.014 - layer * 0.002;
            const speed = (layer % 2 === 0 ? 1 : -1) * (2.2 + layer * 0.5);

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 6) {
                const y = baseY + Math.sin(x * freq + t * speed + layer) * amp + Math.cos(x * freq * 1.8 - t * 1.5) * (amp * 0.4);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            // Glowing Wave Crest Highlight
            ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 6) {
                const y = baseY + Math.sin(x * freq + t * speed + layer) * amp + Math.cos(x * freq * 1.8 - t * 1.5) * (amp * 0.4);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Rising Water Bubbles & Shimmering Ripples
        for (let i = 0; i < 28; i++) {
            const bx = ((i * 97 * seed) + Math.sin(t * 2 + i) * 18) % w;
            const by = h - (((t * 45 + i * 53) % (h * 0.52)));
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(bx, by, (i % 4) + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (isFire) {
        // Procedural Dynamic Fire & Rising Embers
        ctx.fillStyle = '#090204';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 35; i++) {
            const fx = w * 0.5 + Math.sin(i * 1.7 + t * 3) * (110 - (i % 20) * 3);
            const fy = h * 0.82 - ((t * 110 + i * 25) % (h * 0.65));
            const radius = Math.max(4, 38 - ((h * 0.82 - fy) * 0.14));
            const hue = 15 + ((h * 0.82 - fy) * 0.18);
            ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.55)`;
            ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(fx, fy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    } else {
        // Starry Night / Cosmic Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#060312');
        bgGrad.addColorStop(1, '#180d30');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 36; i++) {
            const sx = ((i * 137.5 * seed) % w);
            const sy = ((i * 293.1 * seed) % (h * 0.72));
            const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = `rgba(230, 210, 255, ${twinkle * 0.7})`;
            ctx.beginPath();
            ctx.arc(sx, sy, (i % 3) * 0.8 + 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 2. FOREGROUND CHARACTER / SUBJECT LAYER
    if (isCat) {
        if (!isHouse && !isWater) {
            ctx.fillStyle = '#150d2a';
            ctx.fillRect(0, h * 0.73, w, h * 0.27);
        }

        const cx = w * 0.42 + Math.sin(t * 2.2) * 18;
        const cy = h * 0.63 + Math.abs(Math.sin(t * 4.4)) * -14;

        // Animated Wagging Tail
        ctx.save();
        ctx.strokeStyle = '#d8b4f8';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 45, cy + 35);
        const tailSwing = Math.sin(t * 5) * 35;
        ctx.bezierCurveTo(cx - 95, cy + 10 + tailSwing, cx - 110, cy - 45 + tailSwing, cx - 75 + tailSwing * 0.5, cy - 65);
        ctx.stroke();
        ctx.restore();

        // Cat Body
        ctx.fillStyle = '#c496ff';
        ctx.beginPath();
        ctx.ellipse(cx - 10, cy + 25, 52, 40, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // Animated Paws
        const pawLift = Math.sin(t * 6) * 24;
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath();
        ctx.ellipse(cx - 42, cy + 60, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 38 + Math.max(0, pawLift * 0.6), cy + 45 - Math.max(0, pawLift), 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Cat Head
        ctx.fillStyle = '#d8b4f8';
        ctx.beginPath();
        ctx.arc(cx + 15, cy - 22, 40, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#c496ff';
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 45); ctx.lineTo(cx - 8, cy - 82); ctx.lineTo(cx + 10, cy - 55);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 22, cy - 55); ctx.lineTo(cx + 46, cy - 82); ctx.lineTo(cx + 50, cy - 42);
        ctx.closePath(); ctx.fill();

        // Inner Pink Ears
        ctx.fillStyle = '#ff85c0';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 48); ctx.lineTo(cx - 6, cy - 72); ctx.lineTo(cx + 5, cy - 54);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 26, cy - 54); ctx.lineTo(cx + 42, cy - 72); ctx.lineTo(cx + 44, cy - 45);
        ctx.closePath(); ctx.fill();

        // Blinking Eyes
        const blink = (Math.sin(t * 1.7) > 0.94) ? 0.12 : 1;
        const lookX = Math.cos(t * 3) * 4;
        ctx.fillStyle = '#181028';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy - 24, 9, 10 * blink, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 32, cy - 24, 9, 10 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        if (blink > 0.3) {
            ctx.fillStyle = '#6ee7b7';
            ctx.beginPath();
            ctx.arc(cx + 2 + lookX * 0.5, cy - 24, 6.5, 0, Math.PI * 2);
            ctx.arc(cx + 32 + lookX * 0.5, cy - 24, 6.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#05020a';
            ctx.beginPath();
            ctx.ellipse(cx + 2 + lookX * 0.6, cy - 24, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 32 + lookX * 0.6, cy - 24, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nose & Mouth
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 12); ctx.lineTo(cx + 21, cy - 12); ctx.lineTo(cx + 17.5, cy - 7);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#3b1d5e';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + 13, cy - 5, 4.5, 0, Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 22, cy - 5, 4.5, 0, Math.PI); ctx.stroke();

        // Whiskers
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.5;
        [-1, 1].forEach(dir => {
            const bx = dir < 0 ? cx - 6 : cx + 38;
            for (let k = -1; k <= 1; k++) {
                ctx.beginPath();
                ctx.moveTo(bx, cy - 10 + k * 4);
                ctx.lineTo(bx + dir * 26, cy - 12 + k * 7 + Math.sin(t * 8) * 2);
                ctx.stroke();
            }
        });

        // Bouncing Yarn Ball
        const ballX = w * 0.72 + Math.cos(t * 3.2) * 38;
        const ballY = h * 0.71 - Math.abs(Math.sin(t * 5.2)) * 68;
        ctx.fillStyle = '#ff69b4';
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (isSpace) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = '#ffaa50';
        ctx.shadowColor = '#ffaa50';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 28 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const planets = [
            { r: 65, size: 7, speed: 1.8, color: '#60a5fa' },
            { r: 105, size: 11, speed: 1.1, color: '#c496ff' },
            { r: 150, size: 9, speed: 0.65, color: '#f472b6' }
        ];
        planets.forEach((pl, idx) => {
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.arc(cx, cy, pl.r, 0, Math.PI * 2); ctx.stroke();
            const angle = t * pl.speed + idx * 2.1 + seed;
            const px = cx + Math.cos(angle) * pl.r;
            const py = cy + Math.sin(angle) * pl.r;
            ctx.fillStyle = pl.color;
            ctx.shadowColor = pl.color;
            ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(px, py, pl.size, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });
    } else if (isCity) {
        for (let i = 0; i < 12; i++) {
            const bw = w / 10;
            const bx = i * (w / 12);
            const bh = 90 + ((i * 73 + seed * 31) % 160);
            ctx.fillStyle = i % 2 === 0 ? '#0d061a' : '#160b2c';
            ctx.fillRect(bx, h * 0.78 - bh, bw, bh);
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 105, 180, 0.55)' : 'rgba(196, 150, 255, 0.45)';
            for (let wy = h * 0.78 - bh + 10; wy < h * 0.76; wy += 16) {
                for (let wx = bx + 6; wx < bx + bw - 8; wx += 10) {
                    if ((wx + wy + Math.floor(t * 2)) % 5 !== 0) ctx.fillRect(wx, wy, 5, 8);
                }
            }
        }
        for (let k = 0; k < 6; k++) {
            const lx = ((t * 140 * (k % 2 ? 1 : -1) + k * 90) % w + w) % w;
            const ly = h * 0.82 + k * 8;
            ctx.fillStyle = k % 2 ? '#ff69b4' : '#60a5fa';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillRect(lx, ly, 36, 3);
            ctx.shadowBlur = 0;
        }
    } else if (!isWater && !isFire && !isHouse) {
        // Harmonic Wave / Lissajous Visualizer for abstract prompts
        const cx = w / 2, cy = h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        const petals = 6 + (seed % 7);
        for (let layer = 0; layer < 3; layer++) {
            ctx.strokeStyle = layer === 0 ? '#c496ff' : layer === 1 ? '#ff69b4' : '#60a5fa';
            ctx.lineWidth = 2;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += 0.03) {
                const rad = (65 + layer * 32) * (0.75 + 0.25 * Math.sin(petals * a + t * 2 + layer));
                const x = Math.cos(a + t * 0.3) * rad;
                const y = Math.sin(a + t * 0.3) * rad;
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }
}

function buildCodedImageReply(prompt) {
    const canvasId = 'code_img_' + Date.now().toString(36);
    const codeId = 'code_src_' + Date.now().toString(36);
    const w = 520, h = 380;

    const codeSnippet = `// DESU Procedural Canvas Generator — "${prompt}"
const canvas = document.getElementById('${canvasId}');
const ctx = canvas.getContext('2d');
drawProceduralScene(ctx, ${w}, ${h}, "${prompt.replace(/"/g, '')}", 0.5, seed);`;

    const html = `
        <div>Rendered <strong>${escapeHtml(prompt)}</strong> directly from procedural HTML5 Canvas code:</div>
        <div class="desu-media-card">
            <div class="desu-media-stage">
                <canvas id="${canvasId}" width="${w}" height="${h}"></canvas>
            </div>
            <pre id="${codeId}" class="desu-code-drawer" style="display:none;"><code>${escapeHtml(codeSnippet)}</code></pre>
            <div class="desu-media-bar">
                <span style="font-size:11.5px; color:var(--text-muted);">Coded Canvas · ${w}×${h}</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="desu-media-btn" onclick="window.remixCodedCanvas('${canvasId}', '${escapeHtml(prompt).replace(/'/g, "\\'")}')">↻ Remix</button>
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${codeId}'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                    <button type="button" class="desu-media-btn" onclick="window.downloadCodedCanvas('${canvasId}', 'desu-coded-art.png')">⬇ PNG</button>
                </div>
            </div>
        </div>`;

    setTimeout(() => {
        const c = document.getElementById(canvasId);
        if (c) drawProceduralScene(c.getContext('2d'), w, h, prompt, 0.8, 1);
    }, 50);

    return { text: html, rawText: `[Coded Canvas Image: ${prompt}]`, isHtml: true, followUp: `video ${prompt}` };
}

window.remixCodedCanvas = function (canvasId, prompt) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const seed = Math.floor(Math.random() * 50) + 2;
    drawProceduralScene(c.getContext('2d'), c.width, c.height, prompt, Math.random() * 10, seed);
};

window.downloadCodedCanvas = function (canvasId, filename) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = filename;
    a.click();
};

function buildCodedVideoReply(prompt) {
    const canvasId = 'code_vid_' + Date.now().toString(36);
    const codeId = 'vid_src_' + Date.now().toString(36);
    const w = 520, h = 420;

    const codeSnippet = `// DESU 60fps Procedural Animation Loop — "${prompt}"
let t = 0;
function animate() {
    t += 0.025;
    drawProceduralScene(ctx, ${w}, ${h}, "${prompt.replace(/"/g, '')}", t, 1);
    requestAnimationFrame(animate);
}
animate();`;

    const html = `
        <div>Synthesized real-time 60fps procedural animation for <strong>${escapeHtml(prompt)}</strong> from code:</div>
        <div class="desu-media-card">
            <div class="desu-media-stage">
                <canvas id="${canvasId}" width="${w}" height="${h}"></canvas>
            </div>
            <pre id="${codeId}" class="desu-code-drawer" style="display:none;"><code>${escapeHtml(codeSnippet)}</code></pre>
            <div class="desu-media-bar">
                <span style="font-size:11.5px; color:var(--text-muted);">60fps Coded Motion</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${codeId}'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                    <button type="button" class="desu-media-btn" onclick="window.recordDesuVideo('${canvasId}', this)">⬇ Export .WebM</button>
                </div>
            </div>
        </div>`;

    setTimeout(() => {
        const c = document.getElementById(canvasId);
        if (!c) return;
        const ctx = c.getContext('2d');
        let t = 0;
        function loop() {
            if (!document.body.contains(c)) return;
            t += 0.025;
            drawProceduralScene(ctx, w, h, prompt, t, 1);
            requestAnimationFrame(loop);
        }
        loop();
    }, 50);

    return { text: html, rawText: `[Coded Animation Video: ${prompt}]`, isHtml: true, followUp: `audio ${prompt}` };
}

window.recordDesuVideo = function (canvasId, btnEl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.captureStream || typeof MediaRecorder === 'undefined') return;
    const origText = btnEl.textContent;
    btnEl.textContent = '⏺ Recording 4s...';
    btnEl.disabled = true;

    try {
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `desu-coded-video-${Date.now().toString(36)}.webm`;
            a.click();
            btnEl.textContent = origText;
            btnEl.disabled = false;
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 4000);
    } catch (e) {
        btnEl.textContent = origText;
        btnEl.disabled = false;
    }
};

function buildCodedAudioReply(prompt) {
    const canvasId = 'aud_vis_' + Date.now().toString(36);
    const codeId = 'aud_src_' + Date.now().toString(36);
    const safePrompt = escapeHtml(prompt).replace(/'/g, "\\'");

    const codeSnippet = `// DESU Web Audio API Procedural Synthesizer — "${prompt}"
const ctx = new AudioContext();
const buffer = renderProceduralAudioBuffer(ctx, "${prompt.replace(/"/g, '')}", 3.2);
const source = ctx.createBufferSource();
source.buffer = buffer; source.connect(ctx.destination); source.start();`;

    const html = `
        <div>Synthesized procedural Web Audio patch for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card">
            <div class="desu-media-stage" style="min-height:130px;">
                <canvas id="${canvasId}" width="480" height="130"></canvas>
            </div>
            <pre id="${codeId}" class="desu-code-drawer" style="display:none;"><code>${escapeHtml(codeSnippet)}</code></pre>
            <div class="desu-media-bar">
                <span style="font-size:11.5px; color:var(--text-muted);">Web Audio API Synth</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="desu-media-btn" onclick="window.playCodedAudio('${canvasId}', '${safePrompt}', this)">▶ Play Audio</button>
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${codeId}'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                    <button type="button" class="desu-media-btn" onclick="window.downloadCodedWav('${safePrompt}')">⬇ .WAV</button>
                </div>
            </div>
        </div>`;

    setTimeout(() => drawIdleWaveform(canvasId), 50);
    return { text: html, rawText: `[Coded Web Audio: ${prompt}]`, isHtml: true };
}

function drawIdleWaveform(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.fillStyle = '#070410';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c496ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(x * 0.04) * Math.sin(x * 0.007) * 28;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function renderProceduralAudioBuffer(ctx, prompt, duration = 3.2) {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const p = prompt.toLowerCase();

    if (/\b(cat|kitten|meow|purr)\b/.test(p)) {
        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;
            [[0.1, 1.05], [1.5, 2.55]].forEach(([start, end]) => {
                if (t >= start && t <= end) {
                    const local = (t - start) / (end - start);
                    const env = Math.sin(Math.PI * local);
                    const freq = 480 + 360 * Math.sin(Math.PI * Math.pow(local, 0.7)) - 140 * local + Math.sin(t * 32) * 8;
                    phase += (2 * Math.PI * freq) / sampleRate;
                    sample += (Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.3 + Math.sin(phase * 3) * 0.15) * env * 0.5;
                }
            });
            const purr = Math.sin(2 * Math.PI * 26 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 2.5 * t)) * 0.08;
            data[i] = Math.max(-1, Math.min(1, sample + purr));
        }
    } else if (/\b(rain|storm|water|ocean|wave|waves|river|sea|wind)\b/.test(p)) {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.035 * white)) / 1.035;
            const waveSwell = 0.35 + 0.55 * Math.sin(t * 2.1) * Math.sin(t * 0.9);
            data[i] = Math.max(-1, Math.min(1, lastOut * waveSwell * 2.2));
        }
    } else {
        const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const step = Math.floor(t * 2.5) % notes.length;
            const noteTime = (t * 2.5) % 1;
            const freq = notes[step];
            const env = Math.exp(-noteTime * 3.8) * Math.min(1, noteTime * 40);
            const tone = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25 + Math.sin(2 * Math.PI * (freq * 2) * t) * 0.12;
            data[i] = tone * env * 0.65;
        }
    }
    return buffer;
}

window.playCodedAudio = function (canvasId, prompt, btnEl) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const buffer = renderProceduralAudioBuffer(ctx, prompt, 3.2);
    const source = ctx.createBufferSource();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;

    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    source.start();

    const orig = btnEl.textContent;
    btnEl.textContent = '🔊 Playing...';

    const c = document.getElementById(canvasId);
    const cCtx = c ? c.getContext('2d') : null;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    let playing = true;

    function drawSpectrum() {
        if (!playing || !cCtx) return;
        analyser.getByteFrequencyData(freqData);
        cCtx.fillStyle = '#070410';
        cCtx.fillRect(0, 0, c.width, c.height);
        const barW = (c.width / freqData.length) * 1.6;
        for (let i = 0; i < freqData.length; i++) {
            const bh = (freqData[i] / 255) * (c.height - 16);
            cCtx.fillStyle = i % 2 === 0 ? '#c496ff' : '#ff69b4';
            cCtx.fillRect(i * (barW + 2), c.height - bh - 4, barW, bh + 2);
        }
        requestAnimationFrame(drawSpectrum);
    }
    drawSpectrum();

    source.onended = () => {
        playing = false;
        btnEl.textContent = orig;
        drawIdleWaveform(canvasId);
        ctx.close();
    };
};

window.downloadCodedWav = function (prompt) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const buffer = renderProceduralAudioBuffer(ctx, prompt, 3.2);
    const samples = buffer.getChannelData(0);
    const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(wavBuffer);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const blob = new Blob([view], { type: 'audio/wav' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `desu-audio-${Date.now().toString(36)}.wav`;
    a.click();
    ctx.close();
};

// ============================================================================
// 3. INTENT CLASSIFIER & PLATFORM CONNECTORS
// ============================================================================
function shouldRunOmniSearch(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    if (/\b(integrate|integration|integral|derivative|differentiation|differential|differentiate|calculus|solve|equation|limit|matrix|sin|cos|tan|log|ln|sqrt|audio|video|image|draw|animate|sound|music|i|im|i'm|my|me|you|your|we|us|sad|happy|tired|bored|feeling|feel|good|bad|wrong|right|code|coding|program|script|weather|temperature|how are you|can you|do you|remember)\b/i.test(lower)) {
        return false;
    }
    if (/[0-9+\-*/^=]/.test(lower)) return false;
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
// 4. CONVERSATIONAL AI ENGINE + MULTI-SOURCE FALLBACK (Zero Dead-End Replies!)
// ============================================================================
async function queryDirectBrowserAI(raw, chatHistory, profile, multiData, extraDirective = '') {
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
- Adapt to the user's preferences and trained quality directives: ${profile.text || 'Be clear and natural.'}
${extraDirective ? `- CRITICAL QUALITY OVERRIDE: ${extraDirective}` : ''}
- Solve math, calculus, physics, and coding questions accurately step-by-step.
- Maintain full conversation context across messages.
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

    const isBad = t => !t || t.length < 2 || t.includes('Free limit reached') || t.includes('enter.pollinations.ai') || t.includes('45 seconds') || t.startsWith('<!DOCTYPE');

    for (const model of ['openai', 'mistral']) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
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
        const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent(systemPrompt.slice(0, 450))}`;
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
// 5. MASTER ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory, extraDirective = '') {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Coded Image, Video & Audio Generation (Also catches "Tell me about audio cat"!)
    const mediaCmd = parseMediaCommand(raw);
    if (mediaCmd) {
        if (mediaCmd.type === 'audio') return buildCodedAudioReply(mediaCmd.prompt);
        if (mediaCmd.type === 'video') return buildCodedVideoReply(mediaCmd.prompt);
        return buildCodedImageReply(mediaCmd.prompt);
    }

    // 2. Complete Symbolic Calculus, Algebra & Word Math Solver
    const mathReply = trySymbolicAndNumericalMath(raw);
    if (mathReply) return mathReply;

    // 3. Repetition Command
    const repeatMatch = raw.match(/^(?:write|say|repeat|type|print)\s+(.+?)\s+(\d+)[\s.]*times?\b/i);
    if (repeatMatch) {
        const word = repeatMatch[1].replace(/^["']|["']$/g, '');
        const count = Math.min(parseInt(repeatMatch[2], 10), 500);
        return { text: Array(count).fill(word).join(' '), isHtml: false };
    }

    // 4. Identity, Personal Profile & Mode Switching
    const prof = Learn.observe(raw);
    if (prof) return prof;

    // 5. Check Thumbs-Up Verified Golden Memory
    if (!extraDirective) {
        const golden = Learn.getGoldenReply(raw);
        if (golden) {
            return { text: formatCleanMarkdown(golden), rawText: golden, isHtml: true };
        }
    }

    // 6. Greetings
    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    // 7. Explicit Single-Platform Prefixes
    if (/^(search\s+)?(instagram|insta|ig)\b/i.test(lower)) return await searchSocialPlatform('insta', raw);
    if (/^(search\s+)?(facebook|fb)\b/i.test(lower)) return await searchSocialPlatform('fb', raw);
    if (/^(search\s+)?(reddit|r\/)\b/i.test(lower)) return await searchReddit(raw);
    if (/^(search\s+)?(internet\s+archive|archive|ia)\b/i.test(lower)) return await searchArchive(raw);

    const profile = Learn.context();

    // 8. AUTOMATIC OMNI-SEARCH (Google + Wikipedia + Reddit + Instagram simultaneously on genuine topic queries)
    if (shouldRunOmniSearch(raw) && !extraDirective) {
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

    // 9. PURE CONVERSATIONAL AI
    let chatReply = await queryDirectBrowserAI(raw, chatHistory, profile, null, extraDirective);
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

    // 10. Active Knowledge Fallback (If AI provider is busy, research via Omni-Search so DESU NEVER gives a dead-end reply!)
    try {
        const coreTopic = Learn.core(raw);
        const mRes = await fetch(`/api/web?source=multisearch&q=${encodeURIComponent(coreTopic)}`);
        const mData = await mRes.json();
        if (mData && (mData.wiki || mData.google?.length || mData.reddit?.length)) {
            return {
                text: buildOmniPulseHtml(mData, null),
                rawText: mData?.wiki?.extract || coreTopic,
                isHtml: true,
                sources: mData.sources || []
            };
        }
    } catch (e) {}

    return {
        text: `Here to help — you can ask me math/calculus (like <code>Differential of 2x</code> or <code>Solve 2x=6</code>), generate coded media (<code>video water</code>, <code>video of cat in a house</code>, <code>audio water</code>), or teach me a custom rule with <code>teach: question = answer</code>.`,
        isHtml: true
    };
}

// ============================================================================
// 6. CHAT SESSION, SMART FOLLOW-UP ROUTING & QUALITY REGENERATION
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
                // Send direct commands (like "audio cat", "video water", "integration of 2x") directly without "Tell me about"!
                const isDirectCmd = /^(audio|video|image|draw|animate|table of|integration|differentiation|differential|solve)\b/i.test(meta.followUp.trim());
                userInput.value = isDirectCmd ? meta.followUp.trim() : `Tell me about ${meta.followUp}`;
                handleSend();
            };
            div.appendChild(followEl);
        }
    }

    if (role === 'bot' && typeof Learn !== 'undefined' && meta.showFeedback !== false) {
        Learn.attachFeedback(div, meta.userQuestion || '', meta.rawText || content);
    }

    chatContainer.appendChild(div);
    if (autoScroll) {
        if (role === 'bot') chatContainer.scrollTo({ top: Math.max(0, div.offsetTop - 8), behavior: 'smooth' });
        else chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    return div;
}

window.regenerateImprovedReply = async function (userQuestion, previousAnswer, directive) {
    const chat = currentChat();
    const historySnapshot = chat ? [...chat.messages] : [];

    const typing = document.createElement('div');
    typing.className = 'message-bubble bot';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    chatContainer.appendChild(typing);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const replyObj = await shinuReply(userQuestion, historySnapshot, directive);
    typing.remove();

    if (chat) {
        chat.messages.push({
            role: 'bot',
            text: replyObj.text,
            rawText: replyObj.rawText || replyObj.text,
            isHtml: replyObj.isHtml
        });
        saveChats();
    }

    addBubble('bot', replyObj.text, replyObj.isHtml, true, {
        sources: replyObj.sources,
        followUp: replyObj.followUp,
        animateUndissolve: true,
        userQuestion,
        rawText: replyObj.rawText || replyObj.text
    });
};

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
        <strong>DESU Coded Studio, Calculus & Algebra Guide:</strong><br>
        • <strong>Coded 60fps Video:</strong> Try <code>video water</code>, <code>video of cat in a house</code>, or <code>video fire</code>.<br>
        • <strong>Coded Web Audio:</strong> Try <code>audio water</code>, <code>audio cat</code>, or <code>audio synth</code>.<br>
        • <strong>Calculus & Algebra:</strong> Try <code>Differential of 2x</code>, <code>Integration of 3x+6</code>, <code>Solve 2x=6</code>, or <code>Difference between 5 and 7</code>.
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
