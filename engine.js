// engine.js — DESU Universal CAS Math, Three.js 3D / 2D / Web Audio Scrubbable Studio & AI Router
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

function formatTime(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(1).padStart(4, '0');
    return `${m}:${rem}`;
}

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
                    span.style.animationDelay = `${Math.min(wordIndex * 0.022, 1.4).toFixed(3)}s`;
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
// 1. UNIVERSAL COMPUTER ALGEBRA SYSTEM (Nerdamer CAS + Symbolic & Word Math)
// Solves multivariable systems, any polynomial equation, integrals, differentials, factoring
// ============================================================================
function normalizeMathExpr(expr) {
    return expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
        .replace(/(\))(\d|[a-zA-Z(])/g, '$1*$2')
        .trim();
}

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

    // 2. Word-Based Arithmetic ("Difference between 5 and 7", "Sum of...", "Product of...", "25% of 400")
    const diffMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?difference\s+between\s+([+-]?\d+(?:\.\d+)?)\s+and\s+([+-]?\d+(?:\.\d+)?)[?.!]*$/i);
    if (diffMatch) {
        const a = parseFloat(diffMatch[1]), b = parseFloat(diffMatch[2]);
        return {
            text: `• Absolute difference: <strong>|${a} - ${b}| = ${Math.abs(a - b)}</strong><br>• Directed subtraction: <code>${a} - ${b} = ${a - b}</code>`,
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

    // 3. Nerdamer Symbolic CAS (Integrals, Differentials, Derivatives, Multivariable Equations, Factoring)
    if (typeof window.nerdamer === 'function') {
        try {
            // A. Definite & Indefinite Integration
            const intMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:integration|integral|antiderivative|integrate)\s+(?:of\s+)?(.+?)(?:\s+d([a-z]))?(?:\s+from\s+([+-]?\d+(?:\.\d+)?)\s+to\s+([+-]?\d+(?:\.\d+)?))?[?.!]*$/i) ||
                             q.match(/^∫\s*(.+?)(?:\s*d([a-z]))?$/i);
            if (intMatch) {
                const rawExpr = intMatch[1].trim();
                const variable = intMatch[2] || 'x';
                const limA = intMatch[3], limB = intMatch[4];
                const normExpr = normalizeMathExpr(rawExpr);

                if (limA !== undefined && limB !== undefined) {
                    const defRes = window.nerdamer(`defint(${normExpr}, ${limA}, ${limB}, ${variable})`).text();
                    const indefRes = window.nerdamer(`integrate(${normExpr}, ${variable})`).text();
                    return {
                        text: `<strong>Symbolic Definite & Indefinite Integral:</strong><br>` +
                              `• Antiderivative: ∫ (${escapeHtml(rawExpr)}) d${variable} = <strong>${escapeHtml(indefRes)} + C</strong><br>` +
                              `• Definite Integral [${limA} to ${limB}] = <strong>${escapeHtml(defRes)}</strong>`,
                        isHtml: true,
                        followUp: `differential of ${rawExpr}`
                    };
                } else {
                    const res = window.nerdamer(`integrate(${normExpr}, ${variable})`).text();
                    return {
                        text: `<strong>Symbolic Integration:</strong><br>` +
                              `∫ (${escapeHtml(rawExpr)}) d${variable} = <strong>${escapeHtml(res)} + C</strong>`,
                        isHtml: true,
                        followUp: `differential of ${rawExpr}`
                    };
                }
            }

            // B. Differentiation, Derivatives & Differentials ("Differential of 2x", "derivative of x^2*sin(x)")
            const derivMatch = q.match(/^(?:what\s+is\s+)?(?:the\s+)?(?:differential|derivative|differentiation|differentiate|d\/d([a-z]))\s+(?:of\s+)?(.+?)[?.!]*$/i);
            if (derivMatch) {
                const variable = derivMatch[1] || 'x';
                const rawExpr = derivMatch[2].trim();
                const normExpr = normalizeMathExpr(rawExpr);
                const res = window.nerdamer(`diff(${normExpr}, ${variable})`).text();
                const isDiffWord = /\bdifferential\b/i.test(q);
                return {
                    text: `<strong>Symbolic ${isDiffWord ? 'Differential & Derivative' : 'Derivative'}:</strong><br>` +
                          (isDiffWord ? `• Total Differential: <strong>dy = (${escapeHtml(res)}) d${variable}</strong><br>` : '') +
                          `• Derivative: d/d${variable} (${escapeHtml(rawExpr)}) = <strong>${escapeHtml(res)}</strong>`,
                    isHtml: true,
                    followUp: `integration of ${rawExpr}`
                };
            }

            // C. Factoring & Expanding ("factor x^4 - 1", "expand (x+2)^3")
            const factorMatch = q.match(/^(?:factor|factorize|factorise)\s+(.+?)[?.!]*$/i);
            if (factorMatch) {
                const normExpr = normalizeMathExpr(factorMatch[1]);
                const res = window.nerdamer(`factor(${normExpr})`).text();
                return { text: `<strong>Factored Form:</strong><br><code>${escapeHtml(factorMatch[1])}</code> = <strong>${escapeHtml(res)}</strong>`, isHtml: true };
            }

            const expandMatch = q.match(/^(?:expand|simplify)\s+(.+?)[?.!]*$/i);
            if (expandMatch) {
                const normExpr = normalizeMathExpr(expandMatch[1]);
                const res = window.nerdamer(`expand(${normExpr})`).text();
                return { text: `<strong>Expanded / Simplified Form:</strong><br><code>${escapeHtml(expandMatch[1])}</code> = <strong>${escapeHtml(res)}</strong>`, isHtml: true };
            }

            // D. Single-Variable & Multi-Variable Equation Systems ("Solve 2x=6", "solve x+y=10, x-y=4", "solve x^3 - 6x^2 + 11x - 6 = 0")
            const isSolveCmd = /^(?:solve|find\s+roots?\s+of|find\s+[a-z]\s+in)\b/i.test(q) ||
                               (/^[0-9a-zA-Z+\-*/^(),.\s]+=+[0-9a-zA-Z+\-*/^(),.\s]+$/.test(q) && /[a-zA-Z]/.test(q));
            if (isSolveCmd) {
                const eqBody = q.replace(/^(?:solve|find\s+roots?\s+of|find\s+[a-z]\s+in)\s*:?\s*/i, '').replace(/[?!.]+$/, '').trim();
                const rawEquations = eqBody.split(/\s*(?:,|and|;)\s*/i).filter(e => e.includes('='));

                if (rawEquations.length > 1) {
                    // System of Equations in Multiple Variables
                    const normEqs = rawEquations.map(normalizeMathExpr);
                    const sol = window.nerdamer.solveEquations(normEqs);
                    const formatted = sol.map(pair => `<strong>${pair[0]} = ${pair[1]}</strong>`).join(', &nbsp; ');
                    return {
                        text: `<strong>System of Equations Solution:</strong><br>` +
                              `• Equations: <code>${escapeHtml(rawEquations.join(' , '))}</code><br>` +
                              `• Solution: ${formatted}`,
                        isHtml: true
                    };
                } else if (rawEquations.length === 1) {
                    const normEq = normalizeMathExpr(rawEquations[0]);
                    const vars = Array.from(new Set(normEq.match(/[a-zA-Z]+/g) || ['x'])).filter(v => !['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'exp', 'pi'].includes(v));
                    const targetVar = vars[0] || 'x';
                    const sol = window.nerdamer.solveEquations(normEq, targetVar);
                    const roots = Array.isArray(sol) ? sol.map(r => r.toString()) : [sol.toString()];
                    return {
                        text: `<strong>Equation Solution (${escapeHtml(rawEquations[0])}):</strong><br>` +
                              `• Solved for <strong>${escapeHtml(targetVar)}</strong>: <strong>${escapeHtml(targetVar)} = ${escapeHtml(roots.join(' , '))}</strong>`,
                        isHtml: true
                    };
                }
            }
        } catch (e) {}
    }

    // 4. Direct Numerical & Scientific Expressions
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
// 2. UNIVERSAL COMPOSITIONAL 2D, THREE.JS 3D & WEB AUDIO ENGINE + AI CODE SYNTHESIS
// Generates ANY scene in the world with YouTube-style timeline scrubbing & custom duration
// ============================================================================
function parseMediaCommand(raw) {
    const q = raw.trim().replace(/^(?:tell\s+me\s+about|would\s+you\s+like\s+to\s+explore|explore|show\s+me)\s+/i, '').trim();

    // Extract custom duration if requested (e.g. "make a 25 second 3d video of...", "15s audio of...")
    let duration = 10;
    const durMatch = q.match(/\b(\d+)\s*(?:seconds?|secs?|s)\b/i) || q.match(/\b(\d+)\s*(?:minutes?|mins?)\b/i);
    if (durMatch) {
        const val = parseInt(durMatch[1], 10);
        duration = /min/i.test(durMatch[0]) ? Math.min(120, val * 60) : Math.min(120, Math.max(2, val));
    }

    const cleanPrompt = q
        .replace(/\b(?:for|of length|lasting)?\s*\d+\s*(?:seconds?|secs?|s|minutes?|mins?)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 1. Audio / Music / Sound
    const audMatch = cleanPrompt.match(/^(?:generate\s+|create\s+|make\s+|play\s+|synthesize\s+)?(?:a\s+|an\s+)?(?:coded\s+)?(?:audio|sound|music|melody|voice|sfx|beat|tone|song)\s*(?:of|for|about|:)?\s+(.+)$/i);
    if (audMatch) return { type: 'audio', prompt: audMatch[1].trim(), duration };

    // 2. Three.js 3D Video / Scene
    const threeMatch = cleanPrompt.match(/^(?:generate\s+|create\s+|make\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:3d\s+video|3d\s+animation|3d\s+scene|3d\s+model|three\.?js(?:\s+video|\s+scene)?|video\s+in\s+3d)\s*(?:of|about|for|:)?\s+(.+)$/i);
    if (threeMatch) return { type: '3d', prompt: threeMatch[1].trim(), duration };

    // 3. 2D / 3D Video
    const vidMatch = cleanPrompt.match(/^(?:generate\s+|create\s+|make\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:video|animation|motion|reel|clip)\s*(?:of|about|for|:)?\s+(.+)$/i) ||
                     cleanPrompt.match(/^(?:animate)\s*:?\s+(.+)$/i);
    if (vidMatch) {
        const p = vidMatch[1].trim();
        const wants3D = /\b(3d|three\.?js|cube|sphere|helix|dna|atom|rotating|planet|solar|drone|helicopter|car|airplane|robot|pyramid|torus|galaxy)\b/i.test(p);
        return { type: wants3D ? '3d' : 'video', prompt: p, duration };
    }

    // 4. Image
    const imgMatch = cleanPrompt.match(/^(?:generate\s+|create\s+|make\s+|draw\s+|paint\s+|render\s+|code\s+)?(?:a\s+|an\s+)?(?:coded\s+|ai\s+)?(?:image|picture|photo|art|illustration|drawing)\s*(?:of|for|about|:)?\s+(.+)$/i) ||
                     cleanPrompt.match(/^(?:draw|paint)\s*:?\s+(.+)$/i);
    if (imgMatch) return { type: 'image', prompt: imgMatch[1].trim(), duration: 10 };

    return null;
}

function hashPrompt(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}

// Universal Compositional 3D World Builder (Three.js) — Builds ANY subject procedurally in 3D
function renderCompositionalThreeScene(THREE, scene, camera, t, duration, state, prompt) {
    const p = prompt.toLowerCase();
    const h = hashPrompt(p);

    if (!state.initialized) {
        state.initialized = true;
        scene.background = new THREE.Color(
            /\b(day|sky|sun|beach|forest|park|mountain|bird|airplane|cloud)\b/.test(p) ? 0x0f253e : 0x060311
        );

        const amb = new THREE.AmbientLight(0xffffff, 0.75);
        const dir = new THREE.DirectionalLight(0xfff4e6, 1.3);
        dir.position.set(10, 18, 14);
        const point = new THREE.PointLight(0xc496ff, 1.4, 50);
        point.position.set(-8, 6, 8);
        scene.add(amb, dir, point);

        const root = new THREE.Group();
        scene.add(root);
        state.root = root;
        state.actors = [];

        // Environment Ground / Ocean / Starfield
        if (/\b(water|ocean|sea|wave|boat|ship|fish|island|rain)\b/.test(p)) {
            const geo = new THREE.PlaneGeometry(36, 36, 32, 32);
            geo.rotateX(-Math.PI / 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.4, wireframe: false });
            const water = new THREE.Mesh(geo, mat);
            water.position.y = -2.2;
            scene.add(water);
            state.waterMesh = water;
        } else if (/\b(house|room|city|road|car|dog|cat|tree|forest|mountain|park|person|robot|human)\b/.test(p)) {
            const groundGeo = new THREE.PlaneGeometry(40, 40);
            groundGeo.rotateX(-Math.PI / 2);
            const groundMat = new THREE.MeshStandardMaterial({
                color: /\b(grass|tree|forest|park|nature|dog)\b/.test(p) ? 0x143326 : 0x18112b,
                roughness: 0.8
            });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.position.y = -2.2;
            scene.add(ground);

            const grid = new THREE.GridHelper(40, 28, 0xc496ff, 0x2d1f4a);
            grid.position.y = -2.18;
            scene.add(grid);
        }

        // Star / Particle Field
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(180 * 3);
        for (let i = 0; i < 180 * 3; i++) starPos[i] = (Math.random() - 0.5) * 45;
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xe9d5ff, size: 0.14 });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);
        state.stars = stars;

        // Build 3D Subject Models based on prompt semantics
        const matPrimary = new THREE.MeshStandardMaterial({ color: 0xc496ff, roughness: 0.3, metalness: 0.3 });
        const matAccent = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.25, metalness: 0.4 });
        const matDark = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.5 });
        const matGlow = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });

        if (/\b(car|vehicle|truck|bus|race|train)\b/.test(p)) {
            const car = new THREE.Group();
            const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 2.1), matPrimary);
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.8), matGlow);
            cabin.position.set(-0.2, 0.8, 0);
            car.add(chassis, cabin);
            [[-1.3, -0.5, 1.1], [1.3, -0.5, 1.1], [-1.3, -0.5, -1.1], [1.3, -0.5, -1.1]].forEach(([x, y, z]) => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 20), matDark);
                wheel.rotation.x = Math.PI / 2;
                wheel.position.set(x, y, z);
                car.add(wheel);
                state.actors.push({ mesh: wheel, role: 'wheel' });
            });
            car.position.y = -1.2;
            root.add(car);
            state.actors.push({ mesh: car, role: 'vehicle' });
        } else if (/\b(helicopter|airplane|plane|jet|drone|bird|eagle|butterfly|dragon)\b/.test(p)) {
            const flyer = new THREE.Group();
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.6, 16), matPrimary);
            body.rotation.z = Math.PI / 2;
            const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 4.4), matAccent);
            const rotor = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.28), matGlow);
            rotor.position.y = 0.85;
            flyer.add(body, wingL, rotor);
            root.add(flyer);
            state.actors.push({ mesh: flyer, role: 'flyer' }, { mesh: rotor, role: 'rotor' }, { mesh: wingL, role: 'wing' });
        } else if (/\b(dna|helix|molecule|atom|quantum|physics|chemistry)\b/.test(p)) {
            const dna = new THREE.Group();
            for (let i = -12; i <= 12; i++) {
                const y = i * 0.35;
                const a = i * 0.45;
                const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), matPrimary);
                const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), matAccent);
                s1.position.set(Math.cos(a) * 1.6, y, Math.sin(a) * 1.6);
                s2.position.set(Math.cos(a + Math.PI) * 1.6, y, Math.sin(a + Math.PI) * 1.6);
                const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), matGlow);
                bar.position.set(0, y, 0);
                bar.rotation.z = Math.PI / 2;
                bar.rotation.y = -a;
                dna.add(s1, s2, bar);
            }
            root.add(dna);
            state.actors.push({ mesh: dna, role: 'spinY' });
        } else if (/\b(cat|dog|wolf|lion|tiger|animal|pet|rabbit|horse)\b/.test(p)) {
            const animal = new THREE.Group();
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 2.2, 18), matPrimary);
            torso.rotation.z = Math.PI / 2;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 20), matPrimary);
            head.position.set(1.3, 0.65, 0);
            const earL = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12), matAccent);
            const earR = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12), matAccent);
            earL.position.set(1.35, 1.35, 0.38);
            earR.position.set(1.35, 1.35, -0.38);
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 12), matAccent);
            tail.position.set(-1.3, 0.6, 0);
            tail.rotation.z = 0.6;
            animal.add(torso, head, earL, earR, tail);
            [[-0.8, -0.9, 0.45], [0.8, -0.9, 0.45], [-0.8, -0.9, -0.45], [0.8, -0.9, -0.45]].forEach(([x, y, z], idx) => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 1.2, 12), matPrimary);
                leg.position.set(x, y, z);
                animal.add(leg);
                state.actors.push({ mesh: leg, role: 'leg', idx });
            });
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), matGlow);
            ball.position.set(2.8, -0.8, 0);
            scene.add(ball);
            state.actors.push({ mesh: animal, role: 'creature' }, { mesh: tail, role: 'tail' }, { mesh: ball, role: 'ball' });
            animal.position.y = -0.7;
            root.add(animal);
        } else if (/\b(house|home|building|city|castle|tower)\b/.test(p)) {
            const house = new THREE.Group();
            const walls = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.8), matPrimary);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4), matAccent);
            roof.position.y = 2.0;
            roof.rotation.y = Math.PI / 4;
            const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.1), matGlow);
            door.position.set(0, -0.6, 1.42);
            house.add(walls, roof, door);
            house.position.y = -1.0;
            root.add(house);
            state.actors.push({ mesh: house, role: 'turntable' });
        } else {
            // Dynamic Multi-Body Sculpture / Planetary / Abstract Generator seeded by prompt
            const centerMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1.2, 0.34, 110, 18, (h % 3) + 2, (h % 4) + 3), matPrimary);
            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 16, 80), matAccent);
            const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.06, 16, 80), matGlow);
            ring1.rotation.x = Math.PI / 3;
            ring2.rotation.y = Math.PI / 3;
            root.add(centerMesh, ring1, ring2);
            state.actors.push({ mesh: centerMesh, role: 'spinXY' }, { mesh: ring1, role: 'spinX' }, { mesh: ring2, role: 'spinY' });
        }
    }

    // Deterministic Update at Exact Time `t` (So Scrubbing Forward & Backward Works Perfectly!)
    if (state.waterMesh) {
        const pos = state.waterMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, Math.sin(x * 0.45 + t * 2.6) * 0.35 + Math.cos(z * 0.45 + t * 2.0) * 0.35);
        }
        pos.needsUpdate = true;
        state.waterMesh.geometry.computeVertexNormals();
    }

    if (state.stars) {
        state.stars.rotation.y = t * 0.08;
    }

    state.actors.forEach(a => {
        if (a.role === 'wheel') a.mesh.rotation.z = -t * 6;
        if (a.role === 'vehicle') {
            a.mesh.position.x = Math.sin(t * 0.9) * 2.5;
            a.mesh.position.y = -1.2 + Math.sin(t * 8) * 0.04;
            a.mesh.rotation.y = Math.cos(t * 0.9) * 0.25;
        }
        if (a.role === 'flyer') {
            a.mesh.position.x = Math.cos(t * 1.1) * 2.2;
            a.mesh.position.y = 0.6 + Math.sin(t * 2.2) * 0.7;
            a.mesh.rotation.z = Math.sin(t * 1.1) * 0.25;
        }
        if (a.role === 'rotor') a.mesh.rotation.y = t * 18;
        if (a.role === 'wing') a.mesh.rotation.x = Math.sin(t * 7) * 0.3;
        if (a.role === 'spinY') a.mesh.rotation.y = t * 1.1;
        if (a.role === 'spinX') a.mesh.rotation.x = t * 1.3;
        if (a.role === 'spinXY') { a.mesh.rotation.x = t * 0.9; a.mesh.rotation.y = t * 1.2; }
        if (a.role === 'turntable') a.mesh.rotation.y = Math.sin(t * 0.6) * 0.8;
        if (a.role === 'creature') {
            a.mesh.position.x = Math.sin(t * 1.6) * 1.2;
            a.mesh.position.y = -0.7 + Math.abs(Math.sin(t * 3.2)) * 0.35;
        }
        if (a.role === 'leg') a.mesh.rotation.z = Math.sin(t * 6.4 + a.idx * Math.PI * 0.5) * 0.45;
        if (a.role === 'tail') a.mesh.rotation.x = Math.sin(t * 7) * 0.45;
        if (a.role === 'ball') {
            a.mesh.position.x = 2.4 + Math.cos(t * 2.4) * 1.1;
            a.mesh.position.y = -1.5 + Math.abs(Math.sin(t * 4.8)) * 1.8;
        }
    });

    camera.position.x = Math.sin(t * 0.35) * 6.5;
    camera.position.z = Math.cos(t * 0.35) * 6.5;
    camera.position.y = 2.2 + Math.sin(t * 0.5) * 0.8;
    camera.lookAt(0, 0, 0);
}

// Universal Deterministic 2D Canvas Renderer (Supports Scrubbing at Exact Time `t`)
function renderDeterministic2DScene(ctx, w, h, prompt, t, duration, customFn) {
    if (typeof customFn === 'function') {
        try {
            ctx.save();
            ctx.clearRect(0, 0, w, h);
            customFn(ctx, w, h, t, duration, Math);
            ctx.restore();
            return;
        } catch (e) {
            ctx.restore();
        }
    }

    // Fallback Compositional 2D Engine (Water, House, Cat, Car, Bird, Tree, Fire, Space, City, etc.)
    const p = prompt.toLowerCase();
    const seed = (hashPrompt(p) % 50) + 1;
    const isCat = /\b(cat|kitten|feline|kitty|dog|puppy|pet|animal)\b/.test(p);
    const isHouse = /\b(house|home|room|living|indoors|inside|window)\b/.test(p);
    const isWater = /\b(water|ocean|sea|wave|waves|river|lake|rain|underwater|boat|fish)\b/.test(p);
    const isFire = /\b(fire|flame|lava|campfire|bonfire|ember)\b/.test(p);
    const isSpace = /\b(space|planet|solar|galaxy|star|cosmos|orbit|astrophysics)\b/.test(p);
    const isCity = /\b(city|cyberpunk|street|building|neon|urban|car|road|traffic)\b/.test(p);
    const isNature = /\b(tree|forest|mountain|sunset|sunrise|park|flower|bird|nature|sky)\b/.test(p);

    ctx.clearRect(0, 0, w, h);

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
        ctx.strokeStyle = '#6b4c9a'; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
        ctx.fillStyle = 'rgba(196, 150, 255, 0.18)';
        ctx.beginPath(); ctx.ellipse(w * 0.48, h * 0.83, 165, 34, 0, 0, Math.PI * 2); ctx.fill();
    } else if (isWater) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#040d1a'); skyGrad.addColorStop(0.42, '#0a2246'); skyGrad.addColorStop(1, '#031026');
        ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.22, 30, 0, Math.PI * 2); ctx.fill();

        ['rgba(14,116,144,0.55)', 'rgba(2,132,199,0.65)', 'rgba(56,189,248,0.55)', 'rgba(3,105,161,0.88)'].forEach((col, layer) => {
            const baseY = h * (0.46 + layer * 0.11);
            const amp = 14 + layer * 4;
            const freq = 0.014 - layer * 0.002;
            const speed = (layer % 2 === 0 ? 1 : -1) * (2.2 + layer * 0.5);
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 6) {
                const y = baseY + Math.sin(x * freq + t * speed + layer) * amp + Math.cos(x * freq * 1.8 - t * 1.5) * (amp * 0.4);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        });
    } else if (isNature) {
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
        sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(0.5, '#7e22ce'); sky.addColorStop(1, '#f97316');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        // Sun
        const sunY = h * 0.48 - Math.sin((t / Math.max(1, duration)) * Math.PI) * 55;
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#f97316'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(w * 0.5, sunY, 42, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        // Mountains
        ctx.fillStyle = '#1e1035';
        ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.lineTo(w * 0.28, h * 0.42); ctx.lineTo(w * 0.58, h * 0.75); ctx.fill();
        ctx.fillStyle = '#120924';
        ctx.beginPath(); ctx.moveTo(w * 0.35, h * 0.75); ctx.lineTo(w * 0.72, h * 0.38); ctx.lineTo(w, h * 0.75); ctx.fill();
        ctx.fillStyle = '#090414'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
        // Animated Flying Birds
        for (let b = 0; b < 5; b++) {
            const bx = ((t * 65 + b * 95) % (w + 60)) - 30;
            const by = h * 0.26 + Math.sin(t * 3 + b) * 18 + b * 12;
            const flap = Math.sin(t * 9 + b * 1.4) * 9;
            ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(bx - 12, by + flap); ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
            ctx.quadraticCurveTo(bx + 5, by - 6, bx + 12, by + flap);
            ctx.stroke();
        }
    } else if (isFire) {
        ctx.fillStyle = '#090204'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 35; i++) {
            const fx = w * 0.5 + Math.sin(i * 1.7 + t * 3) * (110 - (i % 20) * 3);
            const fy = h * 0.82 - ((t * 110 + i * 25) % (h * 0.65));
            const radius = Math.max(4, 38 - ((h * 0.82 - fy) * 0.14));
            const hue = 15 + ((h * 0.82 - fy) * 0.18);
            ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.55)`;
            ctx.beginPath(); ctx.arc(fx, fy, radius, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#060312'); bgGrad.addColorStop(1, '#180d30');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 36; i++) {
            const sx = ((i * 137.5 * seed) % w);
            const sy = ((i * 293.1 * seed) % (h * 0.72));
            ctx.fillStyle = `rgba(230, 210, 255, ${0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i))})`;
            ctx.beginPath(); ctx.arc(sx, sy, (i % 3) * 0.8 + 0.8, 0, Math.PI * 2); ctx.fill();
        }
    }

    if (isCat) {
        if (!isHouse && !isWater && !isNature) {
            ctx.fillStyle = '#150d2a'; ctx.fillRect(0, h * 0.73, w, h * 0.27);
        }
        const cx = w * 0.42 + Math.sin(t * 2.2) * 22;
        const cy = h * 0.63 + Math.abs(Math.sin(t * 4.4)) * -15;
        ctx.strokeStyle = '#d8b4f8'; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 45, cy + 35);
        const tailSwing = Math.sin(t * 5) * 35;
        ctx.bezierCurveTo(cx - 95, cy + 10 + tailSwing, cx - 110, cy - 45 + tailSwing, cx - 75 + tailSwing * 0.5, cy - 65);
        ctx.stroke();

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

        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath(); ctx.arc(cx + 2, cy - 24, 6.5, 0, Math.PI * 2); ctx.arc(cx + 32, cy - 24, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#05020a';
        ctx.beginPath(); ctx.ellipse(cx + 2, cy - 24, 2.2, 5.5, 0, 0, Math.PI * 2); ctx.ellipse(cx + 32, cy - 24, 2.2, 5.5, 0, 0, Math.PI * 2); ctx.fill();

        const ballX = w * 0.72 + Math.cos(t * 3.2) * 38;
        const ballY = h * 0.71 - Math.abs(Math.sin(t * 5.2)) * 68;
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath(); ctx.arc(ballX, ballY, 18, 0, Math.PI * 2); ctx.fill();
    } else if (isCity) {
        for (let i = 0; i < 12; i++) {
            const bw = w / 10, bx = i * (w / 12), bh = 90 + ((i * 73 + seed * 31) % 160);
            ctx.fillStyle = i % 2 === 0 ? '#0d061a' : '#160b2c';
            ctx.fillRect(bx, h * 0.78 - bh, bw, bh);
        }
        // Moving Coded Car on Highway
        const carX = ((t * 110) % (w + 140)) - 70;
        const carY = h * 0.82;
        ctx.fillStyle = '#c496ff';
        ctx.fillRect(carX, carY - 16, 68, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(carX + 14, carY - 28, 36, 13);
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(carX + 15, carY, 8, 0, Math.PI * 2); ctx.arc(carX + 52, carY, 8, 0, Math.PI * 2); ctx.fill();
    } else if (isSpace) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = '#ffaa50';
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
        [{ r: 65, size: 7, s: 1.8, c: '#60a5fa' }, { r: 105, size: 11, s: 1.1, c: '#c496ff' }, { r: 150, size: 9, s: 0.65, c: '#f472b6' }].forEach((pl, idx) => {
            ctx.strokeStyle = 'rgba(255,255,255,0.14)';
            ctx.beginPath(); ctx.arc(cx, cy, pl.r, 0, Math.PI * 2); ctx.stroke();
            const a = t * pl.s + idx * 2.1;
            ctx.fillStyle = pl.c;
            ctx.beginPath(); ctx.arc(cx + Math.cos(a) * pl.r, cy + Math.sin(a) * pl.r, pl.size, 0, Math.PI * 2); ctx.fill();
        });
    }
}

// ============================================================================
// YOUTUBE-STYLE SCRUBBABLE 2D & THREE.JS 3D VIDEO STUDIO
// ============================================================================
const activePlayers = {};

function buildScrubbableVideoReply(prompt, initialMode = '2d', initialDuration = 10) {
    const uid = 'vid_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const w = 520, h = 390;

    const html = `
        <div>Synthesized interactive <strong>${initialMode.toUpperCase()}</strong> coded video for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card" id="${uid}_card">
            <div class="desu-media-stage" id="${uid}_stage">
                <canvas id="${uid}_canvas2d" width="${w}" height="${h}" style="display:${initialMode === '2d' ? 'block' : 'none'};"></canvas>
                <div id="${uid}_mount3d" style="width:100%; display:${initialMode === '3d' ? 'block' : 'none'};"></div>
                <div class="desu-engine-badge" id="${uid}_badge">${initialMode === '3d' ? 'Three.js WebGL' : '2D Canvas'} · AI Synthesis</div>
            </div>

            <!-- YouTube-Style Scrubbable Progress & Timeline Controls -->
            <div class="desu-yt-controls">
                <button type="button" class="desu-play-btn" id="${uid}_play" title="Play / Pause">⏸</button>
                <span class="desu-time-label" id="${uid}_time">0:00.0 / ${formatTime(initialDuration)}</span>
                <input type="range" class="desu-scrubber" id="${uid}_scrub" min="0" max="${initialDuration}" step="0.02" value="0" />
            </div>

            <!-- Duration Selector & Engine Switcher Bar -->
            <div class="desu-media-bar">
                <div class="desu-dur-group">
                    <span style="font-size:11px; color:var(--text-muted);">Length:</span>
                    ${[5, 10, 20, 30, 60].map(sec => `<button type="button" class="desu-dur-pill ${sec === initialDuration ? 'active' : ''}" onclick="window.setDesuVideoDuration('${uid}', ${sec}, this)">${sec}s</button>`).join('')}
                </div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="desu-media-btn" onclick="window.toggleDesu3DMode('${uid}')">🧊 2D/3D</button>
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${uid}_code'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt;</button>
                    <button type="button" class="desu-media-btn" onclick="window.exportDesuPlayerWebM('${uid}', this)">⬇ .WebM</button>
                </div>
            </div>
            <pre id="${uid}_code" class="desu-code-drawer" style="display:none;"><code>// Generating custom deterministic ${initialMode.toUpperCase()} scene code for "${escapeHtml(prompt)}"...</code></pre>
        </div>`;

    setTimeout(() => initScrubbableVideoPlayer(uid, prompt, initialMode, initialDuration, w, h), 60);

    return {
        text: html,
        rawText: `[Coded ${initialMode.toUpperCase()} Video: ${prompt} (${initialDuration}s)]`,
        isHtml: true,
        followUp: `audio ${prompt}`
    };
}

async function initScrubbableVideoPlayer(uid, prompt, initialMode, initialDuration, w, h) {
    const canvas2d = document.getElementById(`${uid}_canvas2d`);
    const mount3d = document.getElementById(`${uid}_mount3d`);
    const playBtn = document.getElementById(`${uid}_play`);
    const timeLabel = document.getElementById(`${uid}_time`);
    const scrubber = document.getElementById(`${uid}_scrub`);
    const codeEl = document.getElementById(`${uid}_code`);
    const badgeEl = document.getElementById(`${uid}_badge`);
    if (!canvas2d || !scrubber) return;

    const player = {
        uid,
        prompt,
        mode: initialMode,
        duration: initialDuration,
        t: 0,
        playing: true,
        scrubbing: false,
        lastNow: performance.now(),
        custom2DFn: null,
        custom3DFn: null,
        three: null
    };
    activePlayers[uid] = player;

    // Setup Three.js WebGL Context if available
    if (typeof window.THREE !== 'undefined' && mount3d) {
        const scene = new window.THREE.Scene();
        const camera = new window.THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
        const renderer = new window.THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(w, h);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = 'auto';
        renderer.domElement.style.display = 'block';
        mount3d.innerHTML = '';
        mount3d.appendChild(renderer.domElement);
        player.three = { scene, camera, renderer, state: {} };
    }

    function renderAtCurrentTime() {
        const clampedT = Math.max(0, Math.min(player.duration, player.t));
        if (player.mode === '3d' && player.three) {
            const { scene, camera, renderer, state } = player.three;
            if (typeof player.custom3DFn === 'function') {
                try {
                    player.custom3DFn(window.THREE, scene, camera, clampedT, player.duration, state);
                } catch (e) {
                    renderCompositionalThreeScene(window.THREE, scene, camera, clampedT, player.duration, state, player.prompt);
                }
            } else {
                renderCompositionalThreeScene(window.THREE, scene, camera, clampedT, player.duration, state, player.prompt);
            }
            renderer.render(scene, camera);
        } else {
            const ctx = canvas2d.getContext('2d');
            renderDeterministic2DScene(ctx, w, h, player.prompt, clampedT, player.duration, player.custom2DFn);
        }
        if (!player.scrubbing) scrubber.value = clampedT.toFixed(2);
        timeLabel.textContent = `${formatTime(clampedT)} / ${formatTime(player.duration)}`;
    }
    player.renderAtCurrentTime = renderAtCurrentTime;

    // YouTube-Style Hold & Drag Scrubber Events (Forward & Backward in Real Time!)
    const startScrub = () => { player.scrubbing = true; };
    const moveScrub = () => {
        player.t = parseFloat(scrubber.value) || 0;
        renderAtCurrentTime();
    };
    const endScrub = () => {
        player.t = parseFloat(scrubber.value) || 0;
        player.scrubbing = false;
        player.lastNow = performance.now();
        renderAtCurrentTime();
    };

    scrubber.addEventListener('pointerdown', startScrub);
    scrubber.addEventListener('touchstart', startScrub, { passive: true });
    scrubber.addEventListener('input', moveScrub);
    scrubber.addEventListener('change', endScrub);
    scrubber.addEventListener('pointerup', endScrub);
    scrubber.addEventListener('touchend', endScrub);

    playBtn.onclick = () => {
        player.playing = !player.playing;
        playBtn.textContent = player.playing ? '⏸' : '▶';
        player.lastNow = performance.now();
    };

    function tick(now) {
        if (!document.body.contains(scrubber)) return;
        const dt = (now - player.lastNow) / 1000;
        player.lastNow = now;
        if (player.playing && !player.scrubbing) {
            player.t += dt;
            if (player.t >= player.duration) player.t = player.t % player.duration;
            renderAtCurrentTime();
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Request AI-Synthesized Custom Code for this exact prompt in the background
    try {
        const res = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'code_media', kind: player.mode, q: prompt })
        });
        const data = await res.json();
        if (data?.code) {
            if (player.mode === '3d') {
                player.custom3DFn = new Function('THREE', 'scene', 'camera', 't', 'duration', 'state', data.code);
                if (player.three) {
                    // Clear scene for custom AI 3D build
                    while (player.three.scene.children.length > 0) player.three.scene.remove(player.three.scene.children[0]);
                    player.three.state = {};
                }
            } else {
                player.custom2DFn = new Function('ctx', 'w', 'h', 't', 'duration', 'Math', data.code);
            }
            if (codeEl) codeEl.textContent = data.code;
            if (badgeEl) badgeEl.textContent = `${player.mode === '3d' ? 'Three.js 3D' : '2D Canvas'} · Custom AI Code`;
            renderAtCurrentTime();
        }
    } catch (e) {}
}

window.setDesuVideoDuration = function (uid, newSec, pillEl) {
    const p = activePlayers[uid];
    if (!p) return;
    p.duration = newSec;
    if (p.t > newSec) p.t = 0;
    const scrubber = document.getElementById(`${uid}_scrub`);
    if (scrubber) scrubber.max = String(newSec);
    if (pillEl && pillEl.parentElement) {
        pillEl.parentElement.querySelectorAll('.desu-dur-pill').forEach(el => el.classList.remove('active'));
        pillEl.classList.add('active');
    }
    p.renderAtCurrentTime();
};

window.toggleDesu3DMode = function (uid) {
    const p = activePlayers[uid];
    if (!p) return;
    p.mode = p.mode === '3d' ? '2d' : '3d';
    const c2d = document.getElementById(`${uid}_canvas2d`);
    const m3d = document.getElementById(`${uid}_mount3d`);
    const badge = document.getElementById(`${uid}_badge`);
    if (c2d) c2d.style.display = p.mode === '2d' ? 'block' : 'none';
    if (m3d) m3d.style.display = p.mode === '3d' ? 'block' : 'none';
    if (badge) badge.textContent = p.mode === '3d' ? 'Three.js WebGL 3D' : '2D Canvas';
    p.renderAtCurrentTime();
};

window.exportDesuPlayerWebM = function (uid, btnEl) {
    const p = activePlayers[uid];
    if (!p) return;
    const activeCanvas = (p.mode === '3d' && p.three)
        ? p.three.renderer.domElement
        : document.getElementById(`${uid}_canvas2d`);
    if (!activeCanvas || !activeCanvas.captureStream || typeof MediaRecorder === 'undefined') return;

    const recSecs = Math.min(p.duration, 15);
    const orig = btnEl.textContent;
    btnEl.textContent = `⏺ ${recSecs}s...`;
    btnEl.disabled = true;

    try {
        const stream = activeCanvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `desu-${p.mode}-${Date.now().toString(36)}.webm`;
            a.click();
            btnEl.textContent = orig;
            btnEl.disabled = false;
        };
        recorder.start();
        setTimeout(() => recorder.stop(), recSecs * 1000);
    } catch (e) {
        btnEl.textContent = orig;
        btnEl.disabled = false;
    }
};

// Coded Image Generator (Also Uses AI-Synthesized Canvas Code + Compositional Engine)
function buildCodedImageReply(prompt) {
    const uid = 'img_' + Date.now().toString(36);
    const w = 520, h = 380;
    const html = `
        <div>Rendered procedural coded image for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card">
            <div class="desu-media-stage">
                <canvas id="${uid}_canvas" width="${w}" height="${h}"></canvas>
            </div>
            <pre id="${uid}_code" class="desu-code-drawer" style="display:none;"><code>// Procedural Canvas Image Code — "${escapeHtml(prompt)}"</code></pre>
            <div class="desu-media-bar">
                <span style="font-size:11.5px; color:var(--text-muted);">Coded Canvas · ${w}×${h}</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="desu-media-btn" onclick="window.remixCodedImage('${uid}', '${escapeHtml(prompt).replace(/'/g, "\\'")}')">↻ Remix</button>
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${uid}_code'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt; Code</button>
                    <button type="button" class="desu-media-btn" onclick="window.downloadCodedCanvas('${uid}_canvas', 'desu-image.png')">⬇ PNG</button>
                </div>
            </div>
        </div>`;

    setTimeout(async () => {
        const c = document.getElementById(`${uid}_canvas`);
        if (!c) return;
        const ctx = c.getContext('2d');
        renderDeterministic2DScene(ctx, w, h, prompt, 1.4, 10, null);
        try {
            const r = await fetch('/api/web', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: 'code_media', kind: '2d', q: prompt })
            });
            const d = await r.json();
            if (d?.code) {
                const fn = new Function('ctx', 'w', 'h', 't', 'duration', 'Math', d.code);
                renderDeterministic2DScene(ctx, w, h, prompt, 1.4, 10, fn);
                const ce = document.getElementById(`${uid}_code`);
                if (ce) ce.textContent = d.code;
            }
        } catch (e) {}
    }, 50);

    return { text: html, rawText: `[Coded Image: ${prompt}]`, isHtml: true, followUp: `3d video ${prompt}` };
}

window.remixCodedImage = function (uid, prompt) {
    const c = document.getElementById(`${uid}_canvas`);
    if (!c) return;
    renderDeterministic2DScene(c.getContext('2d'), c.width, c.height, prompt, Math.random() * 12, 10, null);
};

window.downloadCodedCanvas = function (canvasId, filename) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = filename;
    a.click();
};

// ============================================================================
// 3. YOUTUBE-STYLE SCRUBBABLE WEB AUDIO SYNTHESIZER (Pre-Computed WAV + Custom Duration)
// ============================================================================
const activeAudioPlayers = {};

function buildScrubbableAudioReply(prompt, initialDuration = 10) {
    const uid = 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const html = `
        <div>Synthesized scrubbable Web Audio track for <strong>${escapeHtml(prompt)}</strong>:</div>
        <div class="desu-media-card">
            <div class="desu-media-stage" style="min-height:130px;">
                <canvas id="${uid}_vis" width="480" height="130"></canvas>
            </div>
            <audio id="${uid}_audio" style="display:none;"></audio>

            <!-- YouTube-Style Audio Progress Scrubber -->
            <div class="desu-yt-controls">
                <button type="button" class="desu-play-btn" id="${uid}_play">▶</button>
                <span class="desu-time-label" id="${uid}_time">0:00.0 / ${formatTime(initialDuration)}</span>
                <input type="range" class="desu-scrubber" id="${uid}_scrub" min="0" max="${initialDuration}" step="0.02" value="0" />
            </div>

            <div class="desu-media-bar">
                <div class="desu-dur-group">
                    <span style="font-size:11px; color:var(--text-muted);">Length:</span>
                    ${[5, 10, 20, 30].map(sec => `<button type="button" class="desu-dur-pill ${sec === initialDuration ? 'active' : ''}" onclick="window.setDesuAudioDuration('${uid}', ${sec}, this)">${sec}s</button>`).join('')}
                </div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="desu-media-btn" onclick="const el=document.getElementById('${uid}_code'); el.style.display=el.style.display==='none'?'block':'none';">&lt;/&gt;</button>
                    <a class="desu-media-btn" id="${uid}_dl" download="desu-audio.wav">⬇ .WAV</a>
                </div>
            </div>
            <pre id="${uid}_code" class="desu-code-drawer" style="display:none;"><code>// Web Audio DSP Sample Synthesizer — "${escapeHtml(prompt)}"</code></pre>
        </div>`;

    setTimeout(() => initScrubbableAudioPlayer(uid, prompt, initialDuration), 60);
    return { text: html, rawText: `[Coded Audio: ${prompt} (${initialDuration}s)]`, isHtml: true };
}

function generateAudioWavBlob(prompt, duration, customSampleFn = null) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    const p = prompt.toLowerCase();
    const h = hashPrompt(p);

    let phase = 0;
    let lastNoise = 0;
    const scales = [
        [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
        [220.00, 261.63, 293.66, 329.63, 392.00, 440.00],
        [196.00, 246.94, 293.66, 370.00, 392.00, 493.88]
    ];
    const scale = scales[h % scales.length];

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let val = 0;

        if (typeof customSampleFn === 'function') {
            try { val = Number(customSampleFn(t, duration, Math)) || 0; } catch (e) { customSampleFn = null; }
        }

        if (!customSampleFn) {
            if (/\b(cat|kitten|meow|purr)\b/.test(p)) {
                const cycle = t % 2.2;
                if (cycle > 0.15 && cycle < 1.25) {
                    const local = (cycle - 0.15) / 1.1;
                    const env = Math.sin(Math.PI * local);
                    const freq = 480 + 360 * Math.sin(Math.PI * Math.pow(local, 0.7)) - 140 * local;
                    phase += (2 * Math.PI * freq) / sampleRate;
                    val = (Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.25) * env * 0.55;
                }
                val += Math.sin(2 * Math.PI * 26 * t) * 0.08;
            } else if (/\b(dog|bark|wolf)\b/.test(p)) {
                const cycle = t % 1.4;
                if (cycle < 0.28) {
                    const local = cycle / 0.28;
                    const env = Math.sin(Math.PI * local) * Math.exp(-local * 2);
                    const freq = 320 - local * 140;
                    phase += (2 * Math.PI * freq) / sampleRate;
                    val = (Math.sin(phase) + (Math.random() * 0.4 - 0.2)) * env * 0.7;
                }
            } else if (/\b(bird|chirp|tweet|whistle|flute)\b/.test(p)) {
                const cycle = t % 0.9;
                if (cycle < 0.35) {
                    const local = cycle / 0.35;
                    const freq = 1600 + Math.sin(local * 18) * 450 + local * 600;
                    phase += (2 * Math.PI * freq) / sampleRate;
                    val = Math.sin(phase) * Math.sin(Math.PI * local) * 0.45;
                }
            } else if (/\b(rain|water|ocean|wave|sea|wind|storm|river)\b/.test(p)) {
                const white = Math.random() * 2 - 1;
                lastNoise = (lastNoise + 0.04 * white) / 1.04;
                const swell = 0.4 + 0.5 * Math.sin(t * 1.8);
                val = lastNoise * swell * 1.9;
            } else {
                // Melodic Multi-Voice Synthesizer seeded by prompt
                const tempo = 2.4 + (h % 3) * 0.4;
                const step = Math.floor(t * tempo);
                const noteTime = (t * tempo) % 1;
                const freq = scale[(step + (h % 5)) % scale.length];
                const env = Math.exp(-noteTime * 3.2) * Math.min(1, noteTime * 35);
                val = (Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25 + Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.12) * env * 0.65;
            }
        }
        samples[i] = Math.max(-1, Math.min(1, val));
    }

    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, numSamples * 2, true);
    for (let i = 0, off = 44; i < numSamples; i++, off += 2) {
        const s = samples[i];
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return { blob: new Blob([view], { type: 'audio/wav' }), samples };
}

function initScrubbableAudioPlayer(uid, prompt, initialDuration) {
    const audioEl = document.getElementById(`${uid}_audio`);
    const visCanvas = document.getElementById(`${uid}_vis`);
    const playBtn = document.getElementById(`${uid}_play`);
    const timeLabel = document.getElementById(`${uid}_time`);
    const scrubber = document.getElementById(`${uid}_scrub`);
    const dlLink = document.getElementById(`${uid}_dl`);
    if (!audioEl || !visCanvas || !scrubber) return;

    const state = { uid, prompt, duration: initialDuration, samples: null, customFn: null };
    activeAudioPlayers[uid] = state;

    function rebuildTrack() {
        const { blob, samples } = generateAudioWavBlob(state.prompt, state.duration, state.customFn);
        state.samples = samples;
        const url = URL.createObjectURL(blob);
        audioEl.src = url;
        if (dlLink) dlLink.href = url;
        scrubber.max = String(state.duration);
        drawAudioScrubWaveform(visCanvas, samples, audioEl.currentTime || 0, state.duration);
        timeLabel.textContent = `${formatTime(audioEl.currentTime || 0)} / ${formatTime(state.duration)}`;
    }
    state.rebuildTrack = rebuildTrack;
    rebuildTrack();

    playBtn.onclick = () => {
        if (audioEl.paused) { audioEl.play(); playBtn.textContent = '⏸'; }
        else { audioEl.pause(); playBtn.textContent = '▶'; }
    };

    audioEl.addEventListener('timeupdate', () => {
        scrubber.value = audioEl.currentTime.toFixed(2);
        timeLabel.textContent = `${formatTime(audioEl.currentTime)} / ${formatTime(state.duration)}`;
        drawAudioScrubWaveform(visCanvas, state.samples, audioEl.currentTime, state.duration);
    });

    audioEl.addEventListener('ended', () => { playBtn.textContent = '▶'; });

    scrubber.addEventListener('input', () => {
        const target = parseFloat(scrubber.value) || 0;
        audioEl.currentTime = target;
        timeLabel.textContent = `${formatTime(target)} / ${formatTime(state.duration)}`;
        drawAudioScrubWaveform(visCanvas, state.samples, target, state.duration);
    });
}

function drawAudioScrubWaveform(canvas, samples, currentT, duration) {
    if (!canvas || !samples) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#070410';
    ctx.fillRect(0, 0, w, h);

    const progressX = (currentT / Math.max(0.1, duration)) * w;
    const bars = 64;
    const step = Math.floor(samples.length / bars);
    const barW = (w / bars) - 2;

    for (let i = 0; i < bars; i++) {
        let peak = 0;
        for (let j = 0; j < step; j += 12) {
            const v = Math.abs(samples[i * step + j] || 0);
            if (v > peak) peak = v;
        }
        const bh = Math.max(6, peak * (h - 24));
        const x = i * (barW + 2);
        ctx.fillStyle = x <= progressX ? '#ff69b4' : 'rgba(196, 150, 255, 0.38)';
        ctx.fillRect(x, (h - bh) / 2, barW, bh);
    }
}

window.setDesuAudioDuration = function (uid, newSec, pillEl) {
    const st = activeAudioPlayers[uid];
    if (!st) return;
    st.duration = newSec;
    if (pillEl && pillEl.parentElement) {
        pillEl.parentElement.querySelectorAll('.desu-dur-pill').forEach(el => el.classList.remove('active'));
        pillEl.classList.add('active');
    }
    st.rebuildTrack();
};

// ============================================================================
// 4. INTENT CLASSIFIER & CONVERSATIONAL AI ROUTER
// ============================================================================
function shouldRunOmniSearch(raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();

    if (/\b(integrate|integration|integral|derivative|differentiation|differential|differentiate|calculus|solve|equation|factor|expand|simplify|limit|matrix|sin|cos|tan|log|ln|sqrt|audio|video|image|draw|animate|3d|threejs|sound|music|i|im|i'm|my|me|you|your|we|us|sad|happy|tired|bored|feeling|feel|good|bad|wrong|right|code|coding|program|script|weather|temperature|how are you|can you|do you|remember)\b/i.test(lower)) {
        return false;
    }
    if (/[0-9+\-*/^=]/.test(lower)) return false;
    if (/^(and|so|but|also|then|why|how come|what about|how about|not\b)/i.test(lower)) return false;
    if (/^(who|what|where|tell me about|search|look up|find|info on|information about|explain|define|describe)\b/i.test(lower)) return true;
    const wordCount = q.split(/\s+/).length;
    return wordCount >= 1 && wordCount <= 4 && !q.endsWith('?');
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
        if (parts.length) groundingContext = `\nLive Research:\n${parts.join('\n')}`;
    }

    const systemPrompt = `You are ${profile.botName || 'Desu'}, a self-improving, empathetic, independent AI assistant.
${modeMap[profile.mode] || modeMap.conversational}
Rules:
- Adapt to user preferences: ${profile.text || 'Be clear and natural.'}
${extraDirective ? `- CRITICAL QUALITY OVERRIDE: ${extraDirective}` : ''}
- Solve math, calculus, physics, and coding questions accurately step-by-step.
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

    // 1. Try Server Provider Router (Groq / Gemini / OpenRouter / Multi-Model)
    try {
        const savedKey = load('desu_api_key') || '';
        const r = await fetch('/api/web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'ai', q: raw, messages, apiKey: savedKey })
        });
        const d = await r.json();
        if (d?.reply) return d.reply;
    } catch (e) {}

    // 2. Direct Browser Fallback
    try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(raw)}?model=openai&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent(systemPrompt.slice(0, 450))}`;
        const r = await fetch(url);
        if (r.ok) {
            const txt = (await r.text()).trim();
            if (txt && !txt.includes('Free limit reached') && !txt.startsWith('<!DOCTYPE')) return txt;
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

async function shinuReply(inputMessage, chatHistory, extraDirective = '') {
    const raw = inputMessage.trim();
    const lower = raw.toLowerCase();

    // Optional In-Chat API Key Setter ("key: gsk_..." or "key: AIza...")
    const keyMatch = raw.match(/^(?:set\s+)?key\s*:\s*(\S+)$/i);
    if (keyMatch) {
        store('desu_api_key', keyMatch[1].trim());
        return { text: `Connected your high-speed AI API key! DESU will now use it for instant code synthesis and reasoning.`, isHtml: false };
    }

    // 1. Coded 2D Video, Three.js 3D Video, Image & Scrubbable Audio Studio
    const mediaCmd = parseMediaCommand(raw);
    if (mediaCmd) {
        if (mediaCmd.type === 'audio') return buildScrubbableAudioReply(mediaCmd.prompt, mediaCmd.duration);
        if (mediaCmd.type === '3d') return buildScrubbableVideoReply(mediaCmd.prompt, '3d', mediaCmd.duration);
        if (mediaCmd.type === 'video') return buildScrubbableVideoReply(mediaCmd.prompt, '2d', mediaCmd.duration);
        return buildCodedImageReply(mediaCmd.prompt);
    }

    // 2. Universal Nerdamer CAS Symbolic & Numerical Math Solver
    const mathReply = tryUniversalMathematics(raw);
    if (mathReply) return mathReply;

    // 3. Identity, Personal Profile & Mode Switching
    const prof = Learn.observe(raw);
    if (prof) return prof;

    if (!extraDirective) {
        const golden = Learn.getGoldenReply(raw);
        if (golden) return { text: formatCleanMarkdown(golden), rawText: golden, isHtml: true };
    }

    if (/^(hi+|hey+|hello+|yo|sup|hi bro|hey bro|hello bro)\b[\s!.,?]*$|^hi$/i.test(lower)) {
        const who = Learn.userName() ? ' ' + Learn.userName() : '';
        return { text: `Hey${who}! What are we exploring or building today?`, isHtml: false };
    }

    const profile = Learn.context();

    // 4. Automatic Omni-Search on Factual Topics
    if (shouldRunOmniSearch(raw) && !extraDirective) {
        const coreTopic = Learn.core(raw);
        Learn.noteTopic(coreTopic);
        let multiData = null;
        try {
            const mRes = await fetch(`/api/web?source=multisearch&q=${encodeURIComponent(coreTopic)}`);
            multiData = await mRes.json();
        } catch (e) {}

        const hasMulti = multiData && (multiData.wiki || multiData.google?.length || multiData.reddit?.length);
        let aiSynth = await queryDirectBrowserAI(raw, chatHistory, profile, hasMulti ? multiData : null);
        let followUp = multiData?.wiki?.relatedTopic || null;

        if (aiSynth) {
            const fw = aiSynth.match(/\n*FOLLOWUP:\s*(.+)$/i);
            if (fw) { followUp = fw[1].trim(); aiSynth = aiSynth.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim(); }
        }
        if (hasMulti) {
            return {
                text: buildOmniPulseHtml(multiData, aiSynth ? formatCleanMarkdown(aiSynth) : null),
                rawText: aiSynth || multiData?.wiki?.extract || coreTopic,
                isHtml: true,
                sources: multiData.sources || [],
                followUp
            };
        }
    }

    // 5. Conversational AI
    let chatReply = await queryDirectBrowserAI(raw, chatHistory, profile, null, extraDirective);
    if (chatReply) {
        let followUp = null;
        const fw = chatReply.match(/\n*FOLLOWUP:\s*(.+)$/i);
        if (fw) { followUp = fw[1].trim(); chatReply = chatReply.replace(/\n*FOLLOWUP:\s*(.+)$/i, '').trim(); }
        return { text: formatCleanMarkdown(chatReply), rawText: chatReply, isHtml: true, sources: [], followUp };
    }

    return {
        text: `Try asking any math problem (<code>solve x+y=10, x-y=4</code>, <code>integrate x^2*sin(x)</code>), or generate scrubbable 2D/3D videos & audio (<code>3d video helicopter 20s</code>, <code>video car in city</code>, <code>audio rain 15s</code>).`,
        isHtml: true
    };
}

// ============================================================================
// 5. CHAT SESSION & HISTORY
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
                const isDirectCmd = /^(audio|video|3d|image|draw|animate|table of|integration|differentiation|differential|solve)\b/i.test(meta.followUp.trim());
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

function closeDrawer() { sideDrawer.classList.remove('open'); drawerBackdrop.classList.remove('active'); }

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
            chat.messages.forEach(m => addBubble(m.role, m.text, m.isHtml, false, { sources: m.sources, followUp: m.followUp, animateUndissolve: false, rawText: m.rawText }));
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
    chatContainer.classList.
