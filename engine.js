// engine.js — DESU YouTube-Scrubbable Three.js/Canvas/Audio Studio, Nerdamer CAS Math & Omni-Search
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

// Inject CSS for YouTube-Style Timeline Scrubber, Duration Selector & Three.js Controls
(function injectScrubberAndStudioStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .desu-player-controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px 12px;
            background: rgba(8, 5, 16, 0.92);
            border-top: 1px solid var(--panel-border);
        }
        .desu-scrubber-row {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
        }
        .desu-play-btn {
            background: var(--accent-purple);
            color: #050308;
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            box-shadow: 0 0 10px var(--accent-glow);
        }
        .desu-scrubber {
            -webkit-appearance: none;
            appearance: none;
            flex: 1;
            height: 6px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.16);
            outline: none;
            cursor: pointer;
        }
        .desu-scrubber::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: var(--accent-purple);
            box-shadow: 0 0 10px var(--accent-purple), 0 0 4px #ffffff;
            cursor: grab;
            transition: transform 0.15s ease;
        }
        .desu-scrubber::-webkit-slider-thumb:active {
            transform: scale(1.3);
            cursor: grabbing;
        }
        .desu-time-badge {
            font-size: 11px;
            font-variant-numeric: tabular-nums;
            color: var(--text-main);
            min-width: 68px;
            text-align: right;
            flex-shrink: 0;
        }
        .desu-duration-select {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--panel-border);
            color: var(--accent-purple);
            border-radius: 8px;
            padding: 3px 6px;
            font-size: 11px;
            font-weight: 600;
            outline: none;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
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
                    const delay = Math.min(wordIndex * 0.022, 1.4).toFixed(3);
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
// 1. UNIVERSAL COMPUTER ALGEBRA SYSTEM (Nerdamer CAS + Multi-Variable Solver)
// Solves Systems of Equations, Any Polynomial, Calculus, Factoring & Word Math
// ============================================================================
function tryUniversalMathematics(raw) {
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

    // 2. Natural-Language Word Math ("Difference between 5 and 7", "Sum of...", "Product of...", "20% of 150")
    const diffMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?difference\s+between\s+([+-]?\d+(?:\.\d+)?)\s+and\s+([+-]?\d+(?:\.\d+)?)[?.!]*$/i);
    if (diffMatch) {
        const a = parseFloat(diffMatch[1]), b = parseFloat(diffMatch[2]);
        return {
            text: `The absolute difference between <strong>${a}</strong> and <strong>${b}</strong> is <strong>|${a} - ${b}| = ${Math.abs(a - b)}</strong> (directed subtraction: <code>${a} - ${b} = ${a - b}</code>).`,
            isHtml: true
        };
    }

    // 3. Nerdamer Symbolic CAS (Handles Multi-Variable Systems, Polynomials of any degree, Integrals, Derivatives, Factoring)
    if (typeof window.nerdamer !== 'undefined') {
        try {
            // A. Multi-Variable Systems of Equations ("solve 2x + y = 10, x - y = 2" or "solve x + y = 5 and 2x - y = 4")
            const sysMatch = q.match(/^(?:solve\s*:?\s*)(.+)$/i);
            if (sysMatch && (sysMatch[1].includes(',') || /\band\b/i.test(sysMatch[1])) && sysMatch[1].includes('=')) {
                const eqs = sysMatch[1].split(/,|\band\b/i).map(s => s.trim().replace(/(\d)([a-z])/gi, '$1*$2')).filter(Boolean);
                if (eqs.length >= 2) {
                    const sol = nerdamer.solveEquations(eqs);
                    if (Array.isArray(sol) && sol.length) {
                        const formatted = sol.map(pair => `<strong>${pair[0]} = ${Math.round(Number(pair[1]) * 100000) / 100000}</strong>`).join(', &nbsp; ');
                        return {
                            text: `<strong>System of Equations Solution:</strong><br>• Equations: <code>${escapeHtml(eqs.join(' , '))}</code><br>• Solution: ${formatted}`,
                            isHtml: true
                        };
                    }
                }
            }

            // B. Single Equation Solver of Any Degree ("solve 2x=6", "solve x^3 - 6x^2 + 11x - 6 = 0", "sin(x) = 0.5")
            if (/^(?:solve|find)\b/i.test(q) || (/^[0-9a-z+\-*/^().\s]+=+[0-9a-z+\-*/^().\s]+$/i.test(q) && /[a-z]/i.test(q) && !q.includes(','))) {
                const eqClean = q.replace(/^(?:solve|find\s+[a-z]\s+in|find)\s*:?\s*/i, '').replace(/[?!.]+$/, '').trim();
                if (eqClean.includes('=')) {
                    const varName = (eqClean.match(/[a-z]/i) || ['x'])[0].toLowerCase();
                    const normalizedEq = eqClean.replace(/(\d)([a-z(])/gi, '$1*$2');
                    const roots = nerdamer.solve(normalizedEq, varName).toString();
                    if (roots && roots !== '[]') {
                        return {
                            text: `<strong>Symbolic Equation Solution (${escapeHtml(eqClean)}):</strong><br>• Variable: <code>${varName}</code><br>• Roots / Solutions: <strong>${varName} ∈ ${escapeHtml(roots)}</strong>`,
                            isHtml: true
                        };
                    }
                }
            }

            // C. Symbolic & Definite Integration ("integration of 2x", "integrate x^2 * sin(x)", "integrate x^2 from 0 to 3")
            const intMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:integration|integral|antiderivative|integrate)\s+(?:of\s+)?(.+?)(?:\s+d([a-z]))?(?:\s+from\s+([+-]?\d+(?:\.\d+)?)\s+to\s+([+-]?\d+(?:\.\d+)?))?[?.!]*$/i) ||
                             q.match(/^∫\s*(.+?)(?:\s*d([a-z]))?$/i);
            if (intMatch) {
                const rawExpr = intMatch[1].trim();
                const v = (intMatch[2] || 'x').toLowerCase();
                const limA = intMatch[3], limB = intMatch[4];
                const normExpr = rawExpr.replace(/(\d)([a-z(])/gi, '$1*$2');

                if (limA !== undefined && limB !== undefined) {
                    const defRes = nerdamer(`defint(${normExpr}, ${limA}, ${limB}, ${v})`).text();
                    const indefRes = nerdamer(`integrate(${normExpr}, ${v})`).text();
                    return {
                        text: `<strong>Definite & Symbolic Integration:</strong><br>• Antiderivative: ∫ (${escapeHtml(rawExpr)}) d${v} = <code>${escapeHtml(indefRes)} + C</code><br>• Definite Integral [${limA} to ${limB}] = <strong>${escapeHtml(defRes)}</strong>`,
                        isHtml: true
                    };
                } else {
                    const res = nerdamer(`integrate(${normExpr}, ${v})`).text();
                    return {
                        text: `<strong>Symbolic Integration:</strong><br>∫ (${escapeHtml(rawExpr)}) d${v} = <strong>${escapeHtml(res)} + C</strong>`,
                        isHtml: true,
                        followUp: `differentiation of ${rawExpr}`
                    };
                }
            }

            // D. Symbolic Differentiation & Differentials ("Differential of 2x", "derivative of sin(x)*x^2")
            const derivMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:differential|derivative|differentiation|differentiate|d\/dx)\s+(?:of\s+)?(.+?)[?.!]*$/i);
            if (derivMatch) {
                const rawExpr = derivMatch[1].trim();
                const normExpr = rawExpr.replace(/(\d)([a-z(])/gi, '$1*$2');
                const res = nerdamer(`diff(${normExpr}, x)`).text();
                const isDiffWord = /\bdifferential\b/i.test(q);
                return {
                    text: `<strong>Symbolic ${isDiffWord ? 'Differential & Derivative' : 'Derivative'}:</strong><br>` +
                          (isDiffWord ? `• Total Differential: <strong>dy = (${escapeHtml(res)}) dx</strong><br>` : '') +
                          `• Derivative: d/dx (${escapeHtml(rawExpr)}) = <strong>${escapeHtml(res)}</strong>`,
                    isHtml: true,
                    followUp: `integration of ${rawExpr}`
                };
            }

            // E. Factoring & Expanding ("factor x^2 - 5x + 6", "expand (x+2)^3")
            const facMatch = q.match(/^(factor|expand|simplify)\s+(.+)$/i);
            if (facMatch) {
                const op = facMatch[1].toLowerCase();
                const expr = facMatch[2].trim().replace(/(\d)([a-z(])/gi, '$1*$2');
                const out = nerdamer(`${op}(${expr})`).text();
                return {
                    text: `<strong>Symbolic ${escapeHtml(op.toUpperCase())}:</strong><br><code>${escapeHtml(facMatch[2])}</code> = <strong>${escapeHtml(out)}</strong>`,
                    isHtml: true
                };
            }
        } catch (e) {}
    }

    // 4. Direct Arithmetic & Scientific Expressions
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
// 2. DYNAMIC AI CODE SYNTHESIS + YOUTUBE-SCRUBBABLE THREE.JS / CANVAS / AUDIO STUDIO
// ============================================================================
const activePlayers = {};

function extractDurationSeconds(raw, defaultSec = 10) {
    const m = raw.match(/\b(\d+(?:\.\d+)?)\s*(?:sec|secs|seconds|s)\b/i) ||
              raw.match(/\bfor\s+(\d+)\s*s?\b/i);
    if (m) {
        const val = parseFloat(m[1]);
        if (val >= 1 && val <= 180) return val;
    }
    const minMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*(?:min|mins|minutes)\b/i);
    if (minMatch) {
        const val = parseFloat(minMatch[1]) * 60;
        if (val >= 5 && val <= 180) return val;
    }
    return defaultSec;
}

function parseMediaCommand(raw) {
    const q = raw.trim().replace(/^(?:tell\s+me\s+about|would\s+you\s+like\s+to\s+explore|explore|show\s+me)\s+/i, '').trim();
    const duration = extractDurationSeconds(q, 10);
    const is3D = /\b(3d|three\.?js|webgl|cube|sphere|rotating|orbiting|lowpoly|voxel)\b/i.test(q);

    const audMatch = q.match(/^(?:generate\s+|create\s+|make\s+|play\s+|synthesize\s+)?(?:a\s+|an\s+)?(?:\d+\s*(?:s|sec|seconds)\s+)?(?:coded\s+)?(?:audio|sound|music|melody|voice|sfx|beat|tone)\s*(?:of|for|about|:)?\s+(.+)$/i);
    if (audMatch) return { type: 'audio', prompt: audMatch[1].replace(/\b(?:for\s+)?\d+\s*(?:s|sec|seconds)\b/gi, '').trim(), duration };

    const vidMatch = q.match(/^(?:generate\s+|create\s+|make\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:\d+\s*(?:s|sec|seconds)\s+)?(?:3d\s+|three\.?js\s+|coded\s+|ai\s+)?(?:video|animation|motion|reel|clip|scene)\s*(?:of|about|for|:)?\s+(.+)$/i) ||
                     q.match(/^(?:animate|3d)\s*:?\s+(.+)$/i);
    if (vidMatch) return { type: 'video', is3D, prompt: vidMatch[1].replace(/\b(?:for\s+)?\d+\s*(?:s|sec|seconds)\b/gi, '').trim(), duration };

    const imgMatch = q.match(/^(?:generate\s+|create\s+|make\s+|draw\s+|paint\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:3d\s+|coded\s+|ai\s+)?(?:image|picture|photo|art|illustration|drawing)\s*(?:of|for|about|:)?\s+(.+)$/i) ||
                     q.match(/^(?:draw|paint)\s*:?\s+(.+)$/i);
    if (imgMatch) return { type: 'image', is3D, prompt: imgMatch[1].trim(), duration: 10 };

    return null;
}

// Calls the LLM to dynamically write custom deterministic JavaScript drawing/3D code for ANY object in the world!
async function synthesizeCustomSceneCode(prompt, mode = '2d') {
    const sysPrompt = mode === '3d'
        ? `You are a Three.js 3D procedural artist. Write ONLY the raw JavaScript body for a function \`render3D(t, duration, THREE, scene, camera)\` that builds and animates "${prompt}".
Rules:
- First check \`if (!scene.userData.initialized) { scene.userData.initialized = true; ... }\` to add Lights (AmbientLight, DirectionalLight) and 3D Meshes (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, Group) to \`scene\`, storing references in \`scene.userData\`.
- Then animate positions/rotations smoothly as a deterministic function of \`t\` (time in seconds, from 0 to \`duration\`).
- Output ONLY valid JavaScript statements. No markdown backticks, no explanations.`
        : `You are an HTML5 Canvas procedural artist. Write ONLY the raw JavaScript body for a deterministic function \`render2D(ctx, w, h, t, duration)\` that draws and animates "${prompt}" on a ${520}x${380} canvas.
Rules:
- Every position, wave, limb, vehicle, animal, or object must be computed directly from \`t\` (seconds, 0 to \`duration\`) using Math.sin/cos/linear interpolation so scrubbing \`t\` forward or backward works smoothly.
- Fill the background first, then draw detailed recognizable shapes, colors, and motion for "${prompt}".
- Output ONLY valid JavaScript statements. No markdown backticks, no explanations.`;

    const extractCleanCode = (rawText) => {
        if (!rawText) return null;
        let code = rawText.replace(/^```(?:javascript|js)?/i, '').replace(/```$/i, '').trim();
        const blockMatch = rawText.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
        if (blockMatch) code = blockMatch[1].trim();
        if (code.length < 30 || code.includes('Free limit reached') || code.startsWith('<')) return null;
        return code;
    };

    // 1. Try Server API (Groq / Gemini / OpenRouter)
    try {
        const r = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: 'codegen',
                q: `Write deterministic ${mode.toUpperCase()} procedural animation code for: ${prompt}`,
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: `Prompt: "${prompt}"` }
                ]
            })
        });
        const d = await r.json();
        const clean = extractCleanCode(d?.reply);
        if (clean) return clean;
    } catch (e) {}

    // 2. Try Direct Browser LLM Fallback
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5200);
        const r = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai',
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: `Prompt: "${prompt}"` }
                ]
            }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (r.ok) {
            const d = await r.json();
            const clean = extractCleanCode(d?.choices?.[0]?.message?.content);
            if (clean) return clean;
        }
    } catch (e) {}

    return null;
}

// Universal Built-in Three.js 3D Scene Composer (Renders 3D worlds deterministically at any time `t`)
function renderBuiltInThreeJsScene(t, duration, THREE, scene, camera, prompt) {
    const p = prompt.toLowerCase();
    if (!scene.userData.init) {
        scene.userData.init = true;
        scene.background = new THREE.Color(0x070412);

        const amb = new THREE.AmbientLight(0xffffff, 0.65);
        const dir = new THREE.DirectionalLight(0xc496ff, 1.2);
        dir.position.set(5, 10, 7);
        const pt = new THREE.PointLight(0xff69b4, 1.5, 25);
        pt.position.set(-4, 4, 4);
        scene.add(amb, dir, pt);

        // Grid / Terrain
        const grid = new THREE.GridHelper(30, 30, 0xc496ff, 0x2a1b4e);
        grid.position.y = -2.2;
        scene.add(grid);

        const group = new THREE.Group();
        scene.add(group);
        scene.userData.mainGroup = group;

        if (/\b(car|vehicle|truck|train|bus|bike)\b/.test(p)) {
            const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 1.4), new THREE.MeshStandardMaterial({ color: 0xc496ff, metalness: 0.5, roughness: 0.2 }));
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.1 }));
            cabin.position.set(-0.2, 0.6, 0);
            group.add(body, cabin);
            const wheels = [];
            [[-0.9, -0.4, 0.75], [0.9, -0.4, 0.75], [-0.9, -0.4, -0.75], [0.9, -0.4, -0.75]].forEach(([x, y, z]) => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 20), new THREE.MeshStandardMaterial({ color: 0x111118 }));
                w.rotation.x = Math.PI / 2;
                w.position.set(x, y, z);
                group.add(w);
                wheels.push(w);
            });
            scene.userData.wheels = wheels;
        } else if (/\b(solar|planet|space|earth|saturn|galaxy|atom)\b/.test(p)) {
            const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), new THREE.MeshStandardMaterial({ color: 0xffaa50, emissive: 0xff6600, emissiveIntensity: 0.6 }));
            group.add(sun);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 16, 64), new THREE.MeshStandardMaterial({ color: 0xc496ff }));
            ring.rotation.x = Math.PI / 2.3;
            group.add(ring);
            const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
            const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), new THREE.MeshStandardMaterial({ color: 0xff69b4 }));
            group.add(p1, p2);
            scene.userData.planets = [p1, p2];
        } else {
            // Dynamic 3D Character / Sculpture with Orbiting Energy Rings
            const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 2), new THREE.MeshStandardMaterial({ color: 0xc496ff, wireframe: false, metalness: 0.4, roughness: 0.2 }));
            const wire = new THREE.Mesh(new THREE.OctahedronGeometry(1.18, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 }));
            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 16, 80), new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xff69b4, emissiveIntensity: 0.4 }));
            const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.04, 16, 80), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.4 }));
            group.add(core, wire, ring1, ring2);
            scene.userData.rings = [ring1, ring2];
        }
    }

    // Deterministic animation at exact time `t`
    const g = scene.userData.mainGroup;
    if (g) {
        g.rotation.y = t * 0.85;
        g.position.y = Math.sin(t * 2.2) * 0.25;
    }
    if (scene.userData.wheels) {
        scene.userData.wheels.forEach(w => { w.rotation.z = -t * 5; });
        g.position.x = Math.sin(t * 1.5) * 1.2;
    }
    if (scene.userData.planets) {
        const [p1, p2] = scene.userData.planets;
        p1.position.set(Math.cos(t * 1.8) * 2.0, Math.sin(t * 1.2) * 0.3, Math.sin(t * 1.8) * 2.0);
        p2.position.set(Math.cos(t * 1.1 + 2) * 3.1, Math.cos(t * 1.5) * 0.4, Math.sin(t * 1.1 + 2) * 3.1);
    }
    if (scene.userData.rings) {
        scene.userData.rings[0].rotation.x = t * 1.4;
        scene.userData.rings[1].rotation.y = t * 1.1;
    }
    camera.position.set(Math.sin(t * 0.35) * 6.5, 2.2 + Math.sin(t * 0.7) * 0.8, Math.cos(t * 0.35) * 6.5);
    camera.lookAt(0, 0, 0);
}

function formatTimeMMSS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

// Builds the YouTube-Style Scrubbable Video / 3D / Image Studio Card
async function buildScrubbableMediaReply(mediaCmd) {
    const { type, is3D, prompt, duration } = mediaCmd;
    const playerId = 'player_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const canvasId = 'canvas_' + playerId;
    const codeId = 'code_' + playerId;
    const w = 520, h = 380;

    // Ask AI to write custom scene code for any prompt in the world (with instant fallback)
    const customCode = await synthesizeCustomSceneCode(prompt, is3D ? '3d' : '2d');

    const codeDisplay = customCode || `// DESU Deterministic Timeline Renderer (${is3D ? 'Three.js 3D' : 'HTML5 Canvas 2D'})\n// Scrubbable at any time t ∈ [0, ${duration}s]\nrenderScene(t, duration, "${prompt.replace(/"/g, '')}");`;

    const isVideo = type === 'video';
    const badgeLabel = is3D ? 'Three.js 3D WebGL' : (isVideo ? '60fps Scrubbable Video' : 'Procedural Canvas');

    const html = `
        <div>Synthesized ${is3D ? '3D Three.js' : 'procedural'} ${escapeHtml(type)} for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card" id="${playerId}">
            <div class="desu-media-stage">
                <canvas id="${canvasId}" width="${w}" height="${h}"></canvas>
            </div>
            ${isVideo || is3D ? `
            <div class="desu-player-controls">
                <div class="desu-scrubber-row">
                    <button type="button" class="desu-play-btn" id="play_${playerId}" title="Play / Pause">⏸</button>
                    <input type="range" class="desu-scrubber" id="scrub_${playerId}" min="0" max="1000" value="0" />
                    <span class="desu-time-badge" id="time_${playerId}">0:00 / ${formatTimeMMSS(duration)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:11px; color:var(--text-muted);">Length:</span>
                        <select class="desu-duration-select" id="dur_${playerId}">
                            ${[5, 10, 15, 20, 30, 60].map(s => `<option value="${s}" ${s === duration ? 'selected' : ''}>${s}s</option>`).join('')}
                        </select>
                        <button type="button" class="desu-media-btn" id="mode_${playerId}">${is3D ? 'Switch to 2D' : '🧊 View in 3D'}</button>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${codeId}'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                        <button type="button" class="desu-media-btn" onclick="window.recordDesuVideo('${canvasId}', this)">⬇ .WebM</button>
                    </div>
                </div>
            </div>` : `
            <div class="desu-media-bar">
                <span style="font-size:11.5px; color:var(--text-muted);">${badgeLabel}</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${codeId}'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                    <button type="button" class="desu-media-btn" onclick="window.downloadCodedCanvas('${canvasId}', 'desu-art.png')">⬇ PNG</button>
                </div>
            </div>`}
            <pre id="${codeId}" class="desu-code-drawer" style="display:none;"><code>${escapeHtml(codeDisplay)}</code></pre>
        </div>`;

    setTimeout(() => mountTimelinePlayer({
        playerId,
        canvasId,
        prompt,
        initialDuration: duration,
        initial3D: is3D,
        isStaticImage: !isVideo && !is3D,
        customCode
    }), 60);

    return {
        text: html,
        rawText: `[Generated ${is3D ? '3D ' : ''}${type}: ${prompt} (${duration}s)]`,
        isHtml: true,
        followUp: type === 'video' ? `audio ${prompt}` : `3d video ${prompt}`
    };
}

function mountTimelinePlayer(cfg) {
    const canvas = document.getElementById(cfg.canvasId);
    if (!canvas) return;

    let use3D = cfg.initial3D;
    let duration = cfg.initialDuration || 10;
    let currentTime = cfg.isStaticImage ? 1.2 : 0;
    let isPlaying = !cfg.isStaticImage;
    let isScrubbing = false;
    let lastFrameTs = performance.now();

    const playBtn = document.getElementById(`play_${cfg.playerId}`);
    const scrubInput = document.getElementById(`scrub_${cfg.playerId}`);
    const timeBadge = document.getElementById(`time_${cfg.playerId}`);
    const durSelect = document.getElementById(`dur_${cfg.playerId}`);
    const modeBtn = document.getElementById(`mode_${cfg.playerId}`);

    // Compile AI-generated custom 2D or 3D function if present
    let custom2DFn = null;
    let custom3DFn = null;
    if (cfg.customCode) {
        try {
            if (use3D) custom3DFn = new Function('t', 'duration', 'THREE', 'scene', 'camera', cfg.customCode);
            else custom2DFn = new Function('ctx', 'w', 'h', 't', 'duration', cfg.customCode);
        } catch (e) {}
    }

    // Dedicated offscreen Three.js WebGLRenderer that draws into our visible canvas so 2D/3D switching works seamlessly
    let threeState = null;
    function ensureThreeState() {
        if (threeState || typeof window.THREE === 'undefined') return threeState;
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(canvas.width, canvas.height);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
        camera.position.set(0, 2, 6.5);
        threeState = { renderer, scene, camera };
        return threeState;
    }

    function renderAtTime(t) {
        const ctx = canvas.getContext('2d');
        if (use3D && typeof window.THREE !== 'undefined') {
            const st = ensureThreeState();
            if (st) {
                let ok = false;
                if (custom3DFn) {
                    try {
                        custom3DFn(t, duration, window.THREE, st.scene, st.camera);
                        ok = true;
                    } catch (e) { custom3DFn = null; }
                }
                if (!ok) {
                    renderBuiltInThreeJsScene(t, duration, window.THREE, st.scene, st.camera, cfg.prompt);
                }
                st.renderer.render(st.scene, st.camera);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(st.renderer.domElement, 0, 0, canvas.width, canvas.height);
                return;
            }
        }

        // 2D Canvas Render
        let ok2D = false;
        if (custom2DFn) {
            try {
                ctx.save();
                custom2DFn(ctx, canvas.width, canvas.height, t, duration);
                ctx.restore();
                ok2D = true;
            } catch (e) { custom2DFn = null; }
        }
        if (!ok2D) {
            drawProceduralScene(ctx, canvas.width, canvas.height, cfg.prompt, t, 1);
        }
    }

    function updateUI() {
        if (scrubInput && !isScrubbing) {
            scrubInput.value = Math.round((currentTime / duration) * 1000);
        }
        if (timeBadge) {
            timeBadge.textContent = `${formatTimeMMSS(currentTime)} / ${formatTimeMMSS(duration)}`;
        }
        if (playBtn) {
            playBtn.textContent = isPlaying ? '⏸' : '▶';
        }
    }

    if (playBtn) {
        playBtn.onclick = () => {
            isPlaying = !isPlaying;
            lastFrameTs = performance.now();
            updateUI();
        };
    }

    // YouTube-Style Hold & Drag Scrubbing Forward and Backward!
    if (scrubInput) {
        const startScrub = () => { isScrubbing = true; };
        const endScrub = () => { isScrubbing = false; lastFrameTs = performance.now(); };
        scrubInput.addEventListener('pointerdown', startScrub);
        scrubInput.addEventListener('touchstart', startScrub, { passive: true });
        window.addEventListener('pointerup', endScrub);
        window.addEventListener('touchend', endScrub);

        scrubInput.addEventListener('input', () => {
            isScrubbing = true;
            const ratio = parseFloat(scrubInput.value) / 1000;
            currentTime = ratio * duration;
            renderAtTime(currentTime);
            if (timeBadge) {
                timeBadge.textContent = `${formatTimeMMSS(currentTime)} / ${formatTimeMMSS(duration)}`;
            }
        });
    }

    if (durSelect) {
        durSelect.onchange = () => {
            duration = parseFloat(durSelect.value) || 10;
            if (currentTime > duration) currentTime = 0;
            updateUI();
            renderAtTime(currentTime);
        };
    }

    if (modeBtn) {
        modeBtn.onclick = () => {
            use3D = !use3D;
            modeBtn.textContent = use3D ? 'Switch to 2D' : '🧊 View in 3D';
            renderAtTime(currentTime);
        };
    }

    function tick(now) {
        if (!document.body.contains(canvas)) return;
        const dt = (now - lastFrameTs) / 1000;
        lastFrameTs = now;

        if (isPlaying && !isScrubbing) {
            currentTime += dt;
            if (currentTime >= duration) currentTime = currentTime % duration;
            renderAtTime(currentTime);
            updateUI();
        }
        requestAnimationFrame(tick);
    }

    renderAtTime(currentTime);
    updateUI();
    if (!cfg.isStaticImage) requestAnimationFrame(tick);
}

// ============================================================================
// 3. YOUTUBE-SCRUBBABLE OFFLINEAUDIOCONTEXT WAV SYNTHESIZER (Custom Duration!)
// Pre-renders any length of audio into a real WAV file with a draggable progress bar
// ============================================================================
function buildScrubbableAudioReply(prompt, initialDuration = 10) {
    const audioId = 'aud_' + Date.now().toString(36);
    const canvasId = 'vis_' + audioId;
    const safePrompt = escapeHtml(prompt).replace(/'/g, "\\'");

    const html = `
        <div>Synthesized scrubbable Web Audio track for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card" id="card_${audioId}">
            <div class="desu-media-stage" style="min-height:110px;">
                <canvas id="${canvasId}" width="480" height="110"></canvas>
            </div>
            <audio id="${audioId}" style="display:none;"></audio>
            <div class="desu-player-controls">
                <div class="desu-scrubber-row">
                    <button type="button" class="desu-play-btn" id="play_${audioId}">▶</button>
                    <input type="range" class="desu-scrubber" id="scrub_${audioId}" min="0" max="1000" value="0" />
                    <span class="desu-time-badge" id="time_${audioId}">0:00 / ${formatTimeMMSS(initialDuration)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:11px; color:var(--text-muted);">Length:</span>
                        <select class="desu-duration-select" id="dur_${audioId}">
                            ${[5, 10, 15, 30, 60].map(s => `<option value="${s}" ${s === initialDuration ? 'selected' : ''}>${s}s</option>`).join('')}
                        </select>
                    </div>
                    <a class="desu-media-btn" id="dl_${audioId}" download="desu-audio.wav">⬇ Download .WAV</a>
                </div>
            </div>
        </div>`;

    setTimeout(() => initScrubbableAudioPlayer(audioId, canvasId, prompt, initialDuration), 60);
    return { text: html, rawText: `[Scrubbable Audio: ${prompt} (${initialDuration}s)]`, isHtml: true };
}

function generateWavBlobForPrompt(prompt, durationSec) {
    const sampleRate = 22050;
    const length = Math.floor(sampleRate * durationSec);
    const samples = new Float32Array(length);
    const p = prompt.toLowerCase();

    let phase = 0;
    let lastNoise = 0;
    const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 293.66];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        if (/\b(cat|kitten|meow|purr)\b/.test(p)) {
            const cycle = t % 2.2;
            let sample = 0;
            if (cycle >= 0.15 && cycle <= 1.25) {
                const local = (cycle - 0.15) / 1.1;
                const env = Math.sin(Math.PI * local);
                const freq = 480 + 360 * Math.sin(Math.PI * Math.pow(local, 0.7)) - 140 * local;
                phase += (2 * Math.PI * freq) / sampleRate;
                sample = (Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.3) * env * 0.55;
            }
            const purr = Math.sin(2 * Math.PI * 26 * t) * 0.08;
            samples[i] = Math.max(-1, Math.min(1, sample + purr));
        } else if (/\b(water|ocean|rain|storm|wind|sea|river)\b/.test(p)) {
            const white = Math.random() * 2 - 1;
            lastNoise = (lastNoise + 0.04 * white) / 1.04;
            const swell = 0.4 + 0.5 * Math.sin(t * 1.8) * Math.sin(t * 0.7);
            samples[i] = Math.max(-1, Math.min(1, lastNoise * swell * 2.2));
        } else {
            const step = Math.floor(t * 2.5) % notes.length;
            const noteTime = (t * 2.5) % 1;
            const freq = notes[step];
            const env = Math.exp(-noteTime * 3.5) * Math.min(1, noteTime * 35);
            const tone = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25;
            samples[i] = tone * env * 0.65;
        }
    }

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
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
}

function initScrubbableAudioPlayer(audioId, canvasId, prompt, initialDuration) {
    const audioEl = document.getElementById(audioId);
    const canvas = document.getElementById(canvasId);
    const playBtn = document.getElementById(`play_${audioId}`);
    const scrubInput = document.getElementById(`scrub_${audioId}`);
    const timeBadge = document.getElementById(`time_${audioId}`);
    const durSelect = document.getElementById(`dur_${audioId}`);
    const dlLink = document.getElementById(`dl_${audioId}`);
    if (!audioEl || !canvas) return;

    let duration = initialDuration;
    let isScrubbing = false;

    function rebuildAudioTrack(dur) {
        duration = dur;
        const blob = generateWavBlobForPrompt(prompt, duration);
        const url = URL.createObjectURL(blob);
        audioEl.src = url;
        if (dlLink) dlLink.href = url;
        if (timeBadge) timeBadge.textContent = `0:00 / ${formatTimeMMSS(duration)}`;
        drawAudioProgressWave(canvas, 0, prompt);
    }

    function drawAudioProgressWave(c, progressRatio, p) {
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height;
        ctx.fillStyle = '#070410';
        ctx.fillRect(0, 0, w, h);
        const bars = 48;
        const barW = (w - bars * 3) / bars;
        for (let i = 0; i < bars; i++) {
            const ratio = i / bars;
            const amp = 0.25 + 0.65 * Math.abs(Math.sin(i * 0.45 + p.length));
            const bh = amp * (h - 24);
            ctx.fillStyle = ratio <= progressRatio ? '#c496ff' : 'rgba(196, 150, 255, 0.22)';
            ctx.fillRect(i * (barW + 3) + 6, (h - bh) / 2, barW, bh);
        }
    }

    rebuildAudioTrack(duration);

    if (playBtn) {
        playBtn.onclick = () => {
            if (audioEl.paused) { audioEl.play(); playBtn.textContent = '⏸'; }
            else { audioEl.pause(); playBtn.textContent = '▶'; }
        };
    }

    audioEl.ontimeupdate = () => {
        if (!isScrubbing && duration > 0) {
            const ratio = audioEl.currentTime / duration;
            if (scrubInput) scrubInput.value = Math.round(ratio * 1000);
            if (timeBadge) timeBadge.textContent = `${formatTimeMMSS(audioEl.currentTime)} / ${formatTimeMMSS(duration)}`;
            drawAudioProgressWave(canvas, ratio, prompt);
        }
    };

    audioEl.onended = () => {
        if (playBtn) playBtn.textContent = '▶';
    };

    if (scrubInput) {
        scrubInput.addEventListener('pointerdown', () => { isScrubbing = true; });
        window.addEventListener('pointerup', () => { isScrubbing = false; });
        scrubInput.addEventListener('input', () => {
            isScrubbing = true;
            const ratio = parseFloat(scrubInput.value) / 1000;
            audioEl.currentTime = ratio * duration;
            if (timeBadge) timeBadge.textContent = `${formatTimeMMSS(audioEl.currentTime)} / ${formatTimeMMSS(duration)}`;
            drawAudioProgressWave(canvas, ratio, prompt);
        });
    }

    if (durSelect) {
        durSelect.onchange = () => {
            audioEl.pause();
            if (playBtn) playBtn.textContent = '▶';
            rebuildAudioTrack(parseFloat(durSelect.value) || 10);
        };
    }
}

// Built-in 2D Scene Renderer (Water, House, Cat, Fire, Space, City, Nature, Vehicles, etc.)
function drawProceduralScene(ctx, w, h, prompt, t = 0, seed = 1) {
    const p = prompt.toLowerCase();
    const isCat = /\b(cat|kitten|feline|kitty|meow|dog|pet|animal)\b/.test(p);
    const isHouse = /\b(house|home|room|living|indoors|inside|sofa|couch|window)\b/.test(p);
    const isWater = /\b(water|ocean|sea|wave|waves|river|lake|rain|underwater|fish|aqua|boat|ship)\b/.test(p);
    const isFire = /\b(fire|flame|lava|campfire|bonfire|ember|burn)\b/.test(p);
    const isSpace = /\b(space|planet|solar|galaxy|star|cosmos|orbit|astrophysics|rocket)\b/.test(p);
    const isCity = /\b(city|cyberpunk|street|building|neon|urban|car|highway)\b/.test(p);

    if (isHouse) {
        const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
        wallGrad.addColorStop(0, '#1e1533');
        wallGrad.addColorStop(1, '#2d1f4a');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, h * 0.72);

        ctx.fillStyle = '#26152b';
        ctx.fillRect(0, h * 0.72, w, h * 0.28);

        const wx = w * 0.62, wy = h * 0.12, ww = 120, wh = 135;
        ctx.fillStyle = '#090619';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(wx + 82, wy + 38, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6b4c9a';
        ctx.lineWidth = 5;
        ctx.strokeRect(wx, wy, ww, wh);

        ctx.fillStyle = 'rgba(196, 150, 255, 0.18)';
        ctx.beginPath(); ctx.ellipse(w * 0.48, h * 0.83, 165, 34, 0, 0, Math.PI * 2); ctx.fill();
    } else if (isWater) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#040d1a');
        skyGrad.addColorStop(0.42, '#0a2246');
        skyGrad.addColorStop(1, '#031026');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.22, 30, 0, Math.PI * 2); ctx.fill();

        const waveColors = ['rgba(14, 116, 144, 0.55)', 'rgba(2, 132, 199, 0.65)', 'rgba(56, 189, 248, 0.55)', 'rgba(3, 105, 161, 0.85)'];
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
        });
    } else if (isFire) {
        ctx.fillStyle = '#090204';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 35; i++) {
            const fx = w * 0.5 + Math.sin(i * 1.7 + t * 3) * (110 - (i % 20) * 3);
            const fy = h * 0.82 - (((t * 110 + i * 25) % (h * 0.65) + (h * 0.65)) % (h * 0.65));
            const radius = Math.max(4, 38 - ((h * 0.82 - fy) * 0.14));
            const hue = 15 + ((h * 0.82 - fy) * 0.18);
            ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.55)`;
            ctx.beginPath(); ctx.arc(fx, fy, radius, 0, Math.PI * 2); ctx.fill();
        }
    } else {
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
            ctx.beginPath(); ctx.arc(sx, sy, (i % 3) * 0.8 + 0.8, 0, Math.PI * 2); ctx.fill();
        }
    }

    if (isCat) {
        if (!isHouse && !isWater) {
            ctx.fillStyle = '#150d2a';
            ctx.fillRect(0, h * 0.73, w, h * 0.27);
        }
        const cx = w * 0.42 + Math.sin(t * 2.2) * 18;
        const cy = h * 0.63 + Math.abs(Math.sin(t * 4.4)) * -14;

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

        ctx.fillStyle = '#c496ff';
        ctx.beginPath(); ctx.ellipse(cx - 10, cy + 25, 52, 40, -0.1, 0, Math.PI * 2); ctx.fill();

        const pawLift = Math.sin(t * 6) * 24;
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath(); ctx.ellipse(cx - 42, cy + 60, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 38 + Math.max(0, pawLift * 0.6), cy + 45 - Math.max(0, pawLift), 15, 10, -0.3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#d8b4f8';
        ctx.beginPath(); ctx.arc(cx + 15, cy - 22, 40, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#c496ff';
        ctx.beginPath(); ctx.moveTo(cx - 18, cy - 45); ctx.lineTo(cx - 8, cy - 82); ctx.lineTo(cx + 10, cy - 55); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 22, cy - 55); ctx.lineTo(cx + 46, cy - 82); ctx.lineTo(cx + 50, cy - 42); ctx.closePath(); ctx.fill();

        const blink = (Math.sin(t * 1.7) > 0.94) ? 0.12 : 1;
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy - 24, 7, 8 * blink, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 32, cy - 24, 7, 8 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        const ballX = w * 0.72 + Math.cos(t * 3.2) * 38;
        const ballY = h * 0.71 - Math.abs(Math.sin(t * 5.2)) * 68;
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath(); ctx.arc(ballX, ballY, 18, 0, Math.PI * 2); ctx.fill();
    } else if (isSpace) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = '#ffaa50';
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
        [{ r: 65, size: 7, speed: 1.8, color: '#60a5fa' }, { r: 105, size: 11, speed: 1.1, color: '#c496ff' }, { r: 150, size: 9, speed: 0.65, color: '#f472b6' }].forEach((pl, idx) => {
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.arc(cx, cy, pl.r, 0, Math.PI * 2); ctx.stroke();
            const angle = t * pl.speed + idx * 2.1;
            ctx.fillStyle = pl.color;
            ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * pl.r, cy + Math.sin(angle) * pl.r, pl.size, 0, Math.PI * 2); ctx.fill();
        });
    } else if (isCity) {
        for (let i = 0; i < 12; i++) {
            const bw = w / 10, bx = i * (w / 12), bh = 90 + ((i * 73) % 160);
            ctx.fillStyle = i % 2 === 0 ? '#0d061a' : '#160b2c';
            ctx.fillRect(bx, h * 0.78 - bh, bw, bh);
        }
        for (let k = 0; k < 6; k++) {
            const lx = ((t * 140 * (k % 2 ? 1 : -1) + k * 90) % w + w) % w;
            ctx.fillStyle = k % 2 ? '#ff69b4' : '#60a5fa';
            ctx.fillRect(lx, h * 0.82 + k * 8, 36, 3);
        }
    }
}

window.downloadCodedCanvas = function (canvasId, filename) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = filename;
    a.click();
};

window.recordDesuVideo = function (canvasId, btnEl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.captureStream || typeof MediaRecorder === 'undefined') return;
    const origText = btnEl.textContent;
    btnEl.textContent = '⏺ Rec 4s...';
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
            a.download = `desu-video-${Date.now().toString(36)}.webm`;
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

// ============================================================================
// 4. INTENT CLASSIFIER & CONVERSATIONAL AI ROUTER
// ============================================================================
function shouldRunOmniSearch(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    if (/\b(integrate|integration|integral|derivative|differentiation|differential|differentiate|calculus|solve|factor|expand|simplify|equation|limit|matrix|sin|cos|tan|log|ln|sqrt|3d|audio|video|image|draw|animate|sound|music|i|im|i'm|my|me|you|your|we|us|sad|happy|tired|bored|feeling|feel|good|bad|wrong|right|code|coding|program|script|weather|temperature|how are you|can you|do you|remember)\b/i.test(lower)) {
        return false;
    }
    if (/[0-9+\-*/^=]/.test(lower)) return false;
    if (/^(and|so|but|also|then|why|how come|what about|how about|not\b)/i.test(lower)) return false;
    if (/^(who|what|where|tell me about|search|look up|find|info on|information about|explain|define|describe)\b/i.test(lower)) return true;
    const wordCount = q.split(/\s+/).length;
    return wordCount >= 1 && wordCount <= 4 && !q.endsWith('?');
}

async function queryConversationalAI(raw, chatHistory, profile, multiData, extraDirective = '') {
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
        if (parts.length) groundingContext = `\nLive Research:\n${parts.join('\n')}`;
    }

    const systemPrompt = `You are ${profile.botName || 'Desu'}, a self-improving, empathetic, independent AI assistant.
${modeMap[profile.mode] || modeMap.conversational}
Rules:
- Adapt to the user's preferences: ${profile.text || 'Be clear and natural.'}
${extraDirective ? `- CRITICAL QUALITY OVERRIDE: ${extraDirective}` : ''}
- Solve any math, physics, multivariable algebra, or coding question step-by-step.
- Optionally append a final line "FOLLOWUP: [short 3-5 word topic]" if relevant.
Today is ${new Date().toDateString()}.${groundingContext}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(chatHistory || []).slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.rawText || m.text || '').replace(/<[^>]+>/g, '').slice(0, 900)
        })),
        { role: 'user', content: raw }
    ];

    // 1. Try Server Backend First (Uses Groq / Gemini / OpenRouter if configured)
    try {
        const r = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'ai', q: raw, messages })
        });
        const d = await r.json();
        if (d?.reply && !d.rateLimited) return d.reply;
    } catch (e) {}

    // 2. Direct Browser Fallback
    try {
        const r = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'openai', messages, seed: Math.floor(Math.random() * 999999) })
        });
        if (r.ok) {
            const d = await r.json();
            const reply = (d?.choices?.[0]?.message?.content || '').trim();
            if (reply && !reply.includes('Free limit reached')) return reply;
        }
    } catch (e) {}

    return null;
}

function buildOmniPulseHtml(multiData, aiSynthesisHtml) {
    let html = '';
    if (multiData?.wiki?.thumbnail) {
        html += `<img class="wiki-thumb" src="${escapeHtml(safeUrl(multiData.wiki.thumbnail))}" alt="${escapeHtml(multiData.wiki.title)}" loading="lazy" />`;
    }
    if (aiSynthesisHtml) html += `<div>${aiSynthesisHtml}</div>`;
    else if (multiData?.wiki?.extract) html += `<div>${escapeHtml(multiData.wiki.extract)}</div>`;

    const highlights = [];
    if (multiData?.google?.length > 0) {
        const g = multiData.google[0];
        highlights.push(`<div class="result-item"><strong>Google · </strong><a href="${escapeHtml(safeUrl(g.url))}" target="_blank" rel="noopener">${escapeHtml(g.title)}</a><div class="result-meta">${escapeHtml(g.snippet)}</div></div>`);
    }
    if (multiData?.reddit?.length > 0) {
        const r = multiData.reddit[0];
        highlights.push(`<div class="result-item"><strong>Reddit · </strong><a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a><div class="result-meta">r/${escapeHtml(r.subreddit)} • ⬆ ${r.score} • 💬 ${r.comments}</div></div>`);
    }
    if (highlights.length > 0) html += `<div style="margin-top: 10px;">${highlights.join('')}</div>`;
    return html;
}

// ============================================================================
// 5. MASTER ROUTER
// ============================================================================
async function shinuReply(inputMessage, chatHistory, extraDirective = '') {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // 1. Scrubbable Three.js 3D, 2D Video, Image & Custom-Length Audio Studio
    const mediaCmd = parseMediaCommand(raw);
    if (mediaCmd) {
        if (mediaCmd.type === 'audio') return buildScrubbableAudioReply(mediaCmd.prompt, mediaCmd.duration);
        return await buildScrubbableMediaReply(mediaCmd);
    }

    // 2. Universal Symbolic CAS Math Solver (Nerdamer + Multi-Variable Systems + Calculus)
    const mathReply = tryUniversalMathematics(raw);
    if (mathReply) return mathReply;

    // 3. Identity, Personal Profile & Mode Switching
    const prof = Learn.observe(raw);
    if (prof) return prof;

    if (!extraDirective) {
        const golden = Learn.getGoldenReply(raw);
        if (golden) return { text: formatCleanMarkdown(golden), rawText: golden, isHtml: true };
    }

    // 4. Greetings
    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    const profile = Learn.context();

    // 5. Automatic Omni-Search on Topic Queries
    if (shouldRunOmniSearch(raw) && !extraDirective) {
        const coreTopic = Learn.core(raw);
        Learn.noteTopic(coreTopic);

        let multiData = null;
        try {
            const mRes = await fetch(`/api/web?source=multisearch&q=${encodeURIComponent(coreTopic)}`);
            multiData = await mRes.json();
        } catch (e) {}

        const hasMultiContent = multiData && (multiData.wiki || multiData.google?.length || multiData.reddit?.length);
        let aiSynthesis = await queryConversationalAI(raw, chatHistory, profile, hasMultiContent ? multiData : null);
        let suggestedFollowUp = multiData?.wiki?.relatedTopic || null;

        if (aiSynthesis) {
            const fwMatch = aiSynthesis.match(/\n*FOLLOWUP:\s*(.+)$/i);
            if (fwMatch) {
                suggestedFollowUp = fwMatch[1].replace(/[?.!]+$/, '').trim();
                aiSynthesis = aiSynthesis.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim();
            }
        }

        if (hasMultiContent) {
            return {
                text: buildOmniPulseHtml(multiData, aiSynthesis ? formatCleanMarkdown(aiSynthesis) : null),
                rawText: aiSynthesis || multiData?.wiki?.extract || coreTopic,
                isHtml: true,
                sources: multiData.sources || [],
                followUp: suggestedFollowUp
            };
        }
    }

    // 6. Conversational AI & Complex Mathematical Word Problems
    let chatReply = await queryConversationalAI(raw, chatHistory, profile, null, extraDirective);
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
        text: `Ready when you are — try <code>3d video solar system 20s</code>, <code>video of a car in a city</code>, <code>solve 2x + y = 10, x - y = 2</code>, or <code>Integration of x^2 * sin(x)</code>!`,
        isHtml: true
    };
}

// ============================================================================
// 6. CHAT SESSION & HISTORY
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

    if (role === 'bot' && meta.animateUndissolve) applyUndissolveEffect(div);

    if (role === 'bot' && window.DESUCore && Array.isArray(meta.sources) && meta.sources.length > 0) {
        const sourceBar = window.DESUCore.createSourceBar(meta.sources);
        if (sourceBar) div.appendChild(sourceBar);
    }

    if (role === 'bot' && window.DESUCore && meta.followUp) {
        const followEl = window.DESUCore.createFollowUp(meta.followUp);
        if (followEl) {
            followEl.style.cursor = 'pointer';
            followEl.onclick = () => {
                const isDirectCmd = /^(3d|audio|video|image|draw|animate|table of|integration|differentiation|differential|solve)\b/i.test(meta.followUp.trim());
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
        chat.messages.push({ role: 'bot', text: replyObj.text, rawText: replyObj.rawText || replyObj.text, isHtml: replyObj.isHtml });
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
        <strong>DESU 3D Studio, YouTube Scrubber & CAS Math Guide:</strong><br>
        • <strong>3D Three.js & 2D Videos (with Scrubber):</strong> Try <code>3d video solar system 20s</code>, <code>3d video car</code>, or <code>video of a helicopter over mountains</code>. Hold & drag the timeline bar to scrub!<br>
        • <strong>Custom-Length Audio:</strong> Try <code>audio rain 30s</code> or <code>audio cat 15s</code>.<br>
        • <strong>Multivariable & Higher Math (Nerdamer CAS):</strong> Try <code>solve 2x + y = 10, x - y = 2</code>, <code>solve x^3 - 6x^2 + 11x - 6 = 0</code>, or <code>integrate x^2 * sin(x)</code>.
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
