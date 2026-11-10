// ui.js — Visuals, Chiaroscuro Eye, Particles, Themes & DOM Helpers
(function () {
    // Inject Shared SVG Defs for Chiaroscuro Eye
    const defsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defsSvg.setAttribute('width', '0');
    defsSvg.setAttribute('height', '0');
    defsSvg.style.position = 'absolute';
    defsSvg.innerHTML = `
        <defs>
            <clipPath id="eyeOpeningClip"><path d="M 32 45 C 58 23, 122 23, 148 42 C 124 61, 60 61, 32 45 Z"/></clipPath>
            <linearGradient id="hoodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#000" stop-opacity="0"/>
                <stop offset="22%" stop-color="var(--eye-mid)" stop-opacity="0.38"/>
                <stop offset="50%" stop-color="var(--eye-highlight)" stop-opacity="0.68"/>
                <stop offset="78%" stop-color="var(--eye-mid)" stop-opacity="0.38"/>
                <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="scleraGrad" cx="52%" cy="58%" r="52%">
                <stop offset="0%" stop-color="var(--eye-highlight)" stop-opacity="0.88"/>
                <stop offset="55%" stop-color="var(--eye-mid)" stop-opacity="0.65"/>
                <stop offset="85%" stop-color="var(--eye-dark)" stop-opacity="0.92"/>
                <stop offset="100%" stop-color="#000" stop-opacity="1"/>
            </radialGradient>
            <linearGradient id="topCastShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#000" stop-opacity="0.92"/>
                <stop offset="38%" stop-color="#000" stop-opacity="0.35"/>
                <stop offset="75%" stop-color="#000" stop-opacity="0"/>
                <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
            </linearGradient>
            <radialGradient id="darkIrisGrad" cx="50%" cy="55%" r="50%">
                <stop offset="0%" stop-color="#000"/>
                <stop offset="45%" stop-color="#070609"/>
                <stop offset="80%" stop-color="var(--eye-iris)"/>
                <stop offset="100%" stop-color="#020203"/>
            </radialGradient>
            <linearGradient id="lowerRimGrad" x1="15%" y1="0%" x2="85%" y2="0%">
                <stop offset="0%" stop-color="var(--eye-highlight)" stop-opacity="0"/>
                <stop offset="35%" stop-color="var(--eye-highlight)" stop-opacity="0.45"/>
                <stop offset="55%" stop-color="#fff" stop-opacity="0.85"/>
                <stop offset="80%" stop-color="var(--eye-highlight)" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="var(--eye-highlight)" stop-opacity="0"/>
            </linearGradient>
        </defs>`;
    document.body.prepend(defsSvg);

    const EYE_SVG = `
    <svg class="eye-svg" viewBox="0 0 180 80" aria-hidden="true">
        <path d="M 6 48 C 46 13, 128 13, 174 39 C 128 24, 52 24, 6 48 Z" fill="url(#hoodGrad)"/>
        <g clip-path="url(#eyeOpeningClip)">
            <rect x="20" y="15" width="140" height="55" fill="url(#scleraGrad)"/>
            <g class="iris-move">
                <circle cx="90" cy="41" r="19.5" fill="url(#darkIrisGrad)"/>
                <circle class="iris-fibers" cx="90" cy="41" r="13.5"/>
                <circle cx="90" cy="41" r="19" fill="none" stroke="#000" stroke-width="1.6" stroke-opacity="0.85"/>
                <g class="pupil"><circle cx="90" cy="41" r="8.5" fill="#000"/></g>
            </g>
            <g class="glint-move">
                <circle cx="97.5" cy="32.5" r="4.2" fill="#fff" fill-opacity="0.18"/>
                <circle cx="97.5" cy="32.5" r="2.7" fill="#fff" fill-opacity="0.92"/>
            </g>
            <rect x="20" y="15" width="140" height="55" fill="url(#topCastShadow)"/>
            <g class="blink-lid"><path d="M 0 -40 H 180 V 25 Q 90 36 0 25 Z" fill="#050408"/></g>
        </g>
        <path d="M 22 46 C 56 22, 124 22, 158 40" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
        <path d="M 33 45.5 C 60 61, 124 61, 148 42.5" fill="none" stroke="url(#lowerRimGrad)" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`;
    document.querySelectorAll('[data-eye]').forEach(el => { el.innerHTML = EYE_SVG; });

    // Eye Tracking
    const rootEl = document.documentElement;
    let lastPointer = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function lookAt(nx, ny) {
        rootEl.style.setProperty('--ex', (nx * 6.5).toFixed(2) + 'px');
        rootEl.style.setProperty('--ey', (ny * 2.8).toFixed(2) + 'px');
    }
    window.addEventListener('pointermove', e => {
        lastPointer = Date.now();
        lookAt(clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1), clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1));
    });
    setInterval(() => {
        if (Date.now() - lastPointer > 3500) lookAt((Math.random() * 2 - 1), (Math.random() * 2 - 1) * 0.65);
    }, 2800);

    // Greeting
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('openGreeting');
    if (greetingEl) {
        greetingEl.textContent = hour >= 5 && hour < 12 ? "Good morning!"
            : hour >= 12 && hour < 17 ? "Good afternoon!"
            : hour >= 17 && hour < 22 ? "Good evening!" : "Late night hustle?";
    }

    // Theme Switcher
    function applyTheme(themeName) {
        document.body.classList.remove('theme-amber', 'theme-pink');
        if (themeName === 'amber') document.body.classList.add('theme-amber');
        else if (themeName === 'pink') document.body.classList.add('theme-pink');
        document.querySelectorAll('.theme-sub-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
        });
        try { localStorage.setItem('shinu_theme', themeName); } catch (e) {}
    }
    document.querySelectorAll('.theme-sub-item').forEach(btn => {
        btn.onclick = () => applyTheme(btn.getAttribute('data-theme'));
    });
    try { applyTheme(localStorage.getItem('shinu_theme') || 'purple'); } catch (e) {}

    // Platform Quick Pills in Drawer
    document.querySelectorAll('.plat-pill').forEach(pill => {
        pill.onclick = () => {
            const input = document.getElementById('userInput');
            input.value = pill.getAttribute('data-prefix');
            document.getElementById('sideDrawer').classList.remove('open');
            document.getElementById('drawerBackdrop').classList.remove('active');
            input.focus();
        };
    });

    // Background Particles
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particles = Array.from({ length: 32 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.8 + 0.6,
        speedY: (Math.random() - 0.5) * 0.25,
        speedX: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.6 + 0.2
    }));

    function drawBackground() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isAmber = document.body.classList.contains('theme-amber');
        const isPink = document.body.classList.contains('theme-pink');
        const strokeColor = isAmber ? 'rgba(255, 170, 80, 0.14)' : isPink ? 'rgba(255, 105, 180, 0.14)' : 'rgba(196, 150, 255, 0.14)';
        const particleColor = isAmber ? '255, 200, 120' : isPink ? '255, 160, 210' : '210, 180, 255';

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath(); ctx.arc(canvas.width + 50, -50, 480, Math.PI * 0.75, Math.PI * 1.35); ctx.stroke();
        ctx.beginPath(); ctx.arc(-50, canvas.height + 50, 520, Math.PI * 1.7, Math.PI * 2.15); ctx.stroke();

        particles.forEach(p => {
            p.y = (p.y + p.speedY + canvas.height) % canvas.height;
            p.x = (p.x + p.speedX + canvas.width) % canvas.width;
            ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        });
        requestAnimationFrame(drawBackground);
    }
    drawBackground();
})();

