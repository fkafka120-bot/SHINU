// engine.js — DESU Coded Media Studio (Canvas Image, Rigged Video, Web Audio), Calculus Solver & AI Router
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

// Add "Audio" Pill alongside Image & Video in Drawer
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
// 1. SYMBOLIC CALCULUS, ALGEBRA & MATHEMATICS ENGINE (Solves Integrals, Derivatives, Equations)
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

    // Constant: e.g. "5"
    if (/^[+-]?\d+(\.\d+)?$/.test(t)) {
        const c = parseFloat(t);
        if (c === 0) return '0';
        return c === 1 ? 'x' : c === -1 ? '-x' : `${c}x`;
    }

    // Reciprocal: 1/x or a/x
    const recipMatch = t.match(/^([+-]?\d*(?:\.\d+)?)\/x$/);
    if (recipMatch) {
        const c = recipMatch[1] === '' || recipMatch[1] === '+' ? 1 : recipMatch[1] === '-' ? -1 : parseFloat(recipMatch[1]);
        return c === 1 ? 'ln|x|' : `${c}·ln|x|`;
    }

    // Trig & Exponential functions
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

    // Polynomial term: a*x^n or ax or x^n
    const polyMatch = t.match(/^([+-]?\d*(?:\.\d+)?)\*?x(?:\^([+-]?\d+(?:\.\d+)?))?$/);
    if (polyMatch) {
        const rawC = polyMatch[1];
        const c = (rawC === '' || rawC === '+') ? 1 : (rawC === '-') ? -1 : parseFloat(rawC);
        const n = polyMatch[2] !== undefined ? parseFloat(polyMatch[2]) : 1;
        if (n === -1) return c === 1 ? 'ln|x|' : `${c}·ln|x|`;
        const newPow = n + 1;
        const newCoef = c / newPow;
        // Format cleanly as fraction if not exact decimal
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

    // 2. Indefinite & Definite Integration ("integration of 2x", "integrate 3x^2 + 4x", "∫ 2x dx")
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
                    // Simpson's rule numerical evaluation
                    const steps = 200;
                    const h = (limB - limA) / steps;
                    let sum = jsFn(limA) + jsFn(limB);
                    for (let i = 1; i < steps; i++) {
                        sum += jsFn(limA + i * h) * (i % 2 === 0 ? 2 : 4);
                    }
                    const defVal = Math.round(((h / 3) * sum) * 100000) / 100000;
                    html += `<br>• <strong>Definite Integral [${limA} to ${limB}]:</strong> <strong>${defVal}</strong>`;
                } catch (e) {}
            }
            return { text: html, isHtml: true };
        }
    }

    // 3. Differentiation / Derivatives ("derivative of 2x", "differentiate x^3 + 4x", "d/dx sin(x)")
    const derivMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:derivative|differentiation|differentiate|d\/dx)\s+(?:of\s+)?(.+?)[?.!]*$/i);
    if (derivMatch) {
        const expr = derivMatch[1].trim();
        const rawTerms = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [expr];
        const diffTerms = rawTerms.map(differentiateSingleTerm);
        if (diffTerms.every(Boolean)) {
            const nonZero = diffTerms.filter(t => t !== '0');
            const joined = (nonZero.length ? nonZero.join(' + ') : '0').replace(/\+\s*-/g, '- ');
            return {
                text: `<strong>Symbolic Derivative:</strong><br>d/dx (${escapeHtml(expr)}) = <strong>${escapeHtml(joined)}</strong><br><br><span style="color:var(--text-muted); font-size:13.5px;">• Applied the Power / Differentiation Rule: d/dx (a·xⁿ) = a·n·xⁿ⁻¹.</span>`,
                isHtml: true
            };
        }
    }

    // 4. Quadratic & Linear Equation Solver ("solve x^2 - 5x + 6 = 0", "solve 2x + 6 = 14")
    const solveMatch = q.match(/^(?:solve\s+)?([+-]?\d*x\^2\s*[+-]\s*\d*x\s*[+-]\s*\d+)\s*=\s*0$/i);
    if (solveMatch) {
        const cleanEq = solveMatch[1].replace(/\s+/g, '');
        const m = cleanEq.match(/^([+-]?\d*)x\^2([+-]\d*)x([+-]\d+)$/i);
        if (m) {
            const a = (m[1] === '' || m[1] === '+') ? 1 : m[1] === '-' ? -1 : parseFloat(m[1]);
            const b = (m[2] === '+' || m[2] === '') ? 1 : m[2] === '-' ? -1 : parseFloat(m[2]);
            const c = parseFloat(m[3]);
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const r1 = Math.round(((-b + Math.sqrt(disc)) / (2 * a)) * 10000) / 10000;
                const r2 = Math.round(((-b - Math.sqrt(disc)) / (2 * a)) * 10000) / 10000;
                return {
                    text: `<strong>Quadratic Equation Solution (${escapeHtml(cleanEq)} = 0):</strong><br>• Discriminant (Δ = b² - 4ac) = <strong>${disc}</strong><br>• Roots: <strong>x₁ = ${r1}</strong>, <strong>x₂ = ${r2}</strong>`,
                    isHtml: true
                };
            }
        }
    }

    // 5. Direct Arithmetic & Scientific Expressions
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
// 2. 100% CODED PROCEDURAL IMAGE, ANIMATED VIDEO & WEB AUDIO STUDIO (NO POLLINATIONS!)
// ============================================================================
function parseMediaCommand(raw) {
    const q = raw.trim();

    // Audio / Sound / Music commands ("audio cat", "sound of rain", "music lofi", "play cat sound")
    const audMatch = q.match(/^(?:generate\s+|create\s+|make\s+|play\s+|synthesize\s+)?(?:a\s+|an\s+)?(?:coded\s+)?(?:audio|sound|music|melody|voice|sfx|beat|tone)\s*(?:of|for|about|:)?\s+(.+)$/i);
    if (audMatch) return { type: 'audio', prompt: audMatch[1].trim() };

    // Video / Animation commands ("video cat playing", "animate solar system")
    const vidMatch = q.match(/^(?:generate\s+|create\s+|make\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:video|animation|motion|reel|clip)\s*(?:of|about|for|:)?\s+(.+)$/i) ||
                     q.match(/^(?:animate)\s*:?\s+(.+)$/i);
    if (vidMatch) return { type: 'video', prompt: vidMatch[1].trim() };

    // Image / Drawing commands ("image cat", "draw neon city")
    const imgMatch = q.match(/^(?:generate\s+|create\s+|make\s+|draw\s+|paint\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:image|picture|photo|art|illustration|drawing)\s*(?:of|for|about|:)?\s+(.+)$/i) ||
                     q.match(/^(?:draw|paint)\s*:?\s+(.+)$/i);
    if (imgMatch) return { type: 'image', prompt: imgMatch[1].trim() };

    return null;
}

// Shared Procedural Character & Scene Primitives (100% Pure Canvas Code)
function drawProceduralScene(ctx, w, h, prompt, t = 0, seed = 1) {
    const p = prompt.toLowerCase();
    const isCat = /\b(cat|kitten|feline|kitty|meow)\b/.test(p);
    const isSpace = /\b(space|planet|solar|galaxy|star|cosmos|orbit|astrophysics)\b/.test(p);
    const isCity = /\b(city|cyberpunk|street|building|neon|urban|car)\b/.test(p);
    const isNature = /\b(tree|forest|mountain|sunset|ocean|flower|nature|rain)\b/.test(p);

    // 1. Procedural Sky / Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isSpace) {
        bgGrad.addColorStop(0, '#04020c');
        bgGrad.addColorStop(1, '#120828');
    } else if (isCity) {
        bgGrad.addColorStop(0, '#080318');
        bgGrad.addColorStop(1, '#240b36');
    } else if (isNature) {
        bgGrad.addColorStop(0, '#0d1b2a');
        bgGrad.addColorStop(0.6, '#415a77');
        bgGrad.addColorStop(1, '#1b263b');
    } else {
        bgGrad.addColorStop(0, '#0c071d');
        bgGrad.addColorStop(0.6, '#1c1136');
        bgGrad.addColorStop(1, '#090612');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Twinkling Procedural Stars / Bokeh Particles
    for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5 * seed) % w);
        const sy = ((i * 293.1 * seed) % (h * 0.72));
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i));
        ctx.fillStyle = `rgba(230, 210, 255, ${twinkle * 0.7})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) * 0.8 + 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    if (isCat) {
        // Floor / Carpet
        ctx.fillStyle = '#150d2a';
        ctx.fillRect(0, h * 0.73, w, h * 0.27);
        ctx.strokeStyle = 'rgba(196, 150, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.73);
        ctx.lineTo(w, h * 0.73);
        ctx.stroke();

        const cx = w * 0.45 + Math.sin(t * 2.2) * 18;
        const cy = h * 0.62 + Math.abs(Math.sin(t * 4.4)) * -14;

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

        // Animated Paws (Swatting when t > 0)
        const pawLift = Math.sin(t * 6) * 24;
        ctx.fillStyle = '#e9d5ff';
        // Back paw
        ctx.beginPath();
        ctx.ellipse(cx - 42, cy + 60, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Front reaching paw
        ctx.beginPath();
        ctx.ellipse(cx + 38 + Math.max(0, pawLift * 0.6), cy + 45 - Math.max(0, pawLift), 15, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Cat Head
        ctx.fillStyle = '#d8b4f8';
        ctx.beginPath();
        ctx.arc(cx + 15, cy - 22, 40, 0, Math.PI * 2);
        ctx.fill();

        // Left & Right Pointed Ears
        ctx.fillStyle = '#c496ff';
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 45);
        ctx.lineTo(cx - 8, cy - 82);
        ctx.lineTo(cx + 10, cy - 55);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 22, cy - 55);
        ctx.lineTo(cx + 46, cy - 82);
        ctx.lineTo(cx + 50, cy - 42);
        ctx.closePath();
        ctx.fill();

        // Inner Pink Ears
        ctx.fillStyle = '#ff85c0';
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 48);
        ctx.lineTo(cx - 6, cy - 72);
        ctx.lineTo(cx + 5, cy - 54);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 26, cy - 54);
        ctx.lineTo(cx + 42, cy - 72);
        ctx.lineTo(cx + 44, cy - 45);
        ctx.closePath();
        ctx.fill();

        // Glowing Emerald Eyes (with periodic blink)
        const blink = (Math.sin(t * 1.7) > 0.96) ? 0.12 : 1;
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

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx + 4, cy - 27, 2, 0, Math.PI * 2);
            ctx.arc(cx + 34, cy - 27, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pink Nose & Cute Mouth
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 12);
        ctx.lineTo(cx + 21, cy - 12);
        ctx.lineTo(cx + 17.5, cy - 7);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#3b1d5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + 13, cy - 5, 4.5, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 22, cy - 5, 4.5, 0, Math.PI);
        ctx.stroke();

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

        // Bouncing Physics Yarn Ball for the Cat to Play With!
        const ballX = w * 0.72 + Math.cos(t * 3.2) * 38;
        const ballY = h * 0.70 - Math.abs(Math.sin(t * 5.2)) * 68;
        ctx.fillStyle = '#ff69b4';
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffd6eb';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 12, t, t + Math.PI * 1.3);
        ctx.stroke();
    } else if (isSpace) {
        // Orbiting Solar System / Astrophysics Simulation
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
            ctx.beginPath();
            ctx.arc(cx, cy, pl.r, 0, Math.PI * 2);
            ctx.stroke();

            const angle = t * pl.speed + idx * 2.1 + seed;
            const px = cx + Math.cos(angle) * pl.r;
            const py = cy + Math.sin(angle) * pl.r;
            ctx.fillStyle = pl.color;
            ctx.shadowColor = pl.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(px, py, pl.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    } else if (isCity) {
        // Procedural Cyberpunk Neon Skyline & Moving Light Trails
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
        // Neon Highway Streaks
        for (let k = 0; k < 6; k++) {
            const lx = ((t * 140 * (k % 2 ? 1 : -1) + k * 90) % w + w) % w;
            const ly = h * 0.82 + k * 8;
            ctx.fillStyle = k % 2 ? '#ff69b4' : '#60a5fa';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillRect(lx, ly, 36, 3);
            ctx.shadowBlur = 0;
        }
    } else {
        // Procedural Sacred Geometry / Harmonic Lissajous Art for General Prompts
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

// A. Coded Procedural Image Generator (100% Canvas Code, Zero Pollinations)
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

// B. Coded Multi-Actor Animated Video Generator (Real Rigged 60fps Canvas Animation, Zero Pollinations)
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

// C. Coded Web Audio API Sound & Music Synthesizer ("audio cat", "audio piano", "audio rain", etc.)
function buildCodedAudioReply(prompt) {
    const canvasId = 'aud_vis_' + Date.now().toString(36);
    const codeId = 'aud_src_' + Date.now().toString(36);
    const safePrompt = escapeHtml(prompt).replace(/'/g, "\\'");

    const codeSnippet = `// DESU Web Audio API Procedural Synthesizer — "${prompt}"
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const filter = ctx.createBiquadFilter();
const gain = ctx.createGain();
osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);`;

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

// Synthesizes audio buffer from pure math/DSP code (Cat Meow + Purr, Rain, or Musical Chords/Melody)
function renderProceduralAudioBuffer(ctx, prompt, duration = 3.2) {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const p = prompt.toLowerCase();

    if (/\b(cat|kitten|meow|purr)\b/.test(p)) {
        // Realistic Coded Cat Meow (Formant-filtered pitch contour: 520Hz -> 880Hz -> 410Hz) + Purr
        let phase = 0;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;
            // Two meows at t=[0.1..1.1] and t=[1.5..2.6]
            [[0.1, 1.05], [1.5, 2.55]].forEach(([start, end]) => {
                if (t >= start && t <= end) {
                    const local = (t - start) / (end - start);
                    const env = Math.sin(Math.PI * local);
                    const freq = 480 + 360 * Math.sin(Math.PI * Math.pow(local, 0.7)) - 140 * local + Math.sin(t * 32) * 8;
                    phase += (2 * Math.PI * freq) / sampleRate;
                    // Rich harmonic series for feline vocal tract
                    sample += (Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.3 + Math.sin(phase * 3) * 0.15) * env * 0.5;
                }
            });
            // Subtle purr vibration
            const purr = Math.sin(2 * Math.PI * 26 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 2.5 * t)) * 0.08;
            data[i] = Math.max(-1, Math.min(1, sample + purr));
        }
    } else if (/\b(rain|storm|water|ocean|wind)\b/.test(p)) {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.04 * white)) / 1.04;
            const swell = 0.5 + 0.4 * Math.sin((i / sampleRate) * 1.5);
            data[i] = lastOut * swell * 1.8;
        }
    } else {
        // Procedural Arpeggiated Synth / Piano Melody
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
// 3. INTENT CLASSIFIER: Never Send Math, Media, or Personal Chat to Omni-Search!
// ============================================================================
function shouldRunOmniSearch(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    // Never run OmniSearch on math, calculus, media generation, personal chat, or coding
    if (/\b(integrate|integration|integral|derivative|differentiate|calculus|solve|equation|limit|matrix|sin|cos|tan|log|ln|sqrt|audio|video|image|draw|animate|sound|music|i|im|i'm|my|me|you|your|we|us|sad|happy|tired|bored|feeling|feel|good|bad|wrong|right|code|coding|program|script|weather|temperature|how are you|can you|do you|remember)\b/i.test(lower)) {
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

// ============================================================================
// 4. PLATFORM CONNECTORS & CONVERSATIONAL AI ENGINE
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
// 5. MASTER ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory, extraDirective = '') {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Coded Image, Video & Audio Generation (100% Procedural Code, No Pollinations!)
    const mediaCmd = parseMediaCommand(raw);
    if (mediaCmd) {
        if (mediaCmd.type === 'audio') return buildCodedAudioReply(mediaCmd.prompt);
        if (mediaCmd.type === 'video') return buildCodedVideoReply(mediaCmd.prompt);
        return buildCodedImageReply(mediaCmd.prompt);
    }

    // 2. Symbolic Calculus, Algebra & Mathematics Solver (Fixes "Integration of 2x", derivatives, etc.)
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

    // 5. Check Thumbs-Up Verified Golden Memory (unless regenerating via Thumbs-Down)
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

    return {
        text: `I'm right here with you — tell me a bit more about what you're thinking or what we should build.`,
        isHtml: false
    };
}

// ============================================================================
// 6. CHAT SESSION, UNDISSOLVE RENDERER & ACTIVE QUALITY REGENERATION
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

    // Attach Neon Thumbs Up / Thumbs Down Quality Trainer on every bot reply
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

// Triggered when the user clicks Thumbs Down -> picks an improvement chip
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
        <strong>DESU Coded Studio, Calculus & Quality Trainer:</strong><br>
        • <strong>Coded Image:</strong> Type <code>image cat</code> or <code>draw neon city</code>.<br>
        • <strong>Coded 60fps Video:</strong> Type <code>video cat playing</code> or <code>video solar system</code>.<br>
        • <strong>Coded Web Audio:</strong> Type <code>audio cat</code>, <code>audio rain</code>, or <code>audio synth</code>.<br>
        • <strong>Calculus & Math:</strong> Type <code>Integration of 2x</code>, <code>derivative of x^3</code>, or <code>solve x^2 - 5x + 6 = 0</code>.<br>
        • <strong>Neon Quality Trainer:</strong> Tap <strong>Good</strong> or <strong>Improve</strong> below any answer to train DESU's reply depth and accuracy.
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
