/* =============================================================
   ASSEMBLE / SYSTEM — interactive layer
   ============================================================= */

(() => {
  'use strict';

  /* ---------- BOOT SEQUENCE ---------- */
  const boot = document.getElementById('boot');
  const bootFill = document.getElementById('bootFill');
  const bootStatus = document.getElementById('bootStatus');
  const bootMsgs = [
    '系统初始化',
    '加载着色器管线',
    '绑定神经层',
    '校准界面',
    '系统在线'
  ];
  let bootPct = 0;
  const bootTimer = setInterval(() => {
    bootPct = Math.min(100, bootPct + Math.random() * 12 + 4);
    bootFill.style.width = bootPct + '%';
    const idx = Math.min(bootMsgs.length - 1, Math.floor((bootPct / 100) * bootMsgs.length));
    bootStatus.textContent = `${bootMsgs[idx]} · ${String(Math.floor(bootPct)).padStart(2,'0')}%`;
    if (bootPct >= 100) {
      clearInterval(bootTimer);
      setTimeout(() => boot.classList.add('done'), 350);
    }
  }, 90);

  /* ---------- CLOCK ---------- */
  const hudClock = document.getElementById('hudClock');
  const footClock = document.getElementById('footClock');
  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    const t = `${hh}:${mm}:${ss}`;
    if (hudClock) hudClock.textContent = t;
    if (footClock) footClock.textContent = t;
  };
  tick();
  setInterval(tick, 1000);

  /* ---------- NAV SCROLLED STATE ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- SMOOTH ANCHOR SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- REVEAL ON SCROLL ---------- */
  const revealEls = document.querySelectorAll(
    '.section-head, .panel, .work-card, .lab-cell, .note, .contact-wrap, .footer'
  );
  revealEls.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => io.observe(el));

  /* ---------- CARD TILT ---------- */
  document.querySelectorAll('[data-tilt]').forEach(card => {
    let raf = null;
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (y - 0.5) * -4;
      const ry = (x - 0.5) *  6;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = '';
    };
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });

  /* ============================================================
     BACKGROUND CANVAS — particle network + drifting stars
     ============================================================ */
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  // Stars (deep layer)
  const STAR_COUNT = Math.floor((W * H) / 9000);
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random() * 0.8 + 0.2,       // depth
    r: Math.random() * 1.2 + 0.2,
    tw: Math.random() * Math.PI * 2,    // twinkle phase
    tws: Math.random() * 0.02 + 0.005,  // twinkle speed
  }));

  // Particles (network layer)
  const PARTICLE_COUNT = Math.min(72, Math.floor((W * H) / 22000));
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r: Math.random() * 1.4 + 0.6,
  }));

  // Mouse influence
  let mx = W / 2, my = H / 2, mActive = false;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY; mActive = true;
  });
  window.addEventListener('mouseleave', () => { mActive = false; });

  const COLOR_A = [0, 229, 255];
  const COLOR_B = [124, 92, 255];
  const COLOR_C = [255, 45, 146];

  const mix = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  let t0 = performance.now();
  let frame = 0;

  const draw = (now) => {
    const dt = Math.min(40, now - t0);
    t0 = now;
    frame++;

    ctx.clearRect(0, 0, W, H);

    // -------- Stars --------
    for (const s of stars) {
      s.tw += s.tws;
      const tw = (Math.sin(s.tw) + 1) * 0.5;
      const a = 0.15 + tw * 0.45 * s.z;
      const c = mix(COLOR_A, COLOR_B, s.z);
      ctx.fillStyle = `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
      ctx.fill();
    }

    // -------- Particles --------
    for (const p of particles) {
      p.x += p.vx * dt * 0.6;
      p.y += p.vy * dt * 0.6;

      // soft mouse attraction
      if (mActive) {
        const dx = mx - p.x, dy = my - p.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 40000) {
          const f = (1 - d2 / 40000) * 0.0006 * dt;
          p.vx += dx * f;
          p.vy += dy * f;
        }
      }

      // damping
      p.vx *= 0.992; p.vy *= 0.992;
      // small ambient drift to prevent freezing
      p.vx += (Math.random() - 0.5) * 0.0015;
      p.vy += (Math.random() - 0.5) * 0.0015;

      // wrap
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      ctx.fillStyle = 'rgba(180, 220, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // -------- Connections --------
    const MAX_DIST = 140;
    const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < MAX_DIST_SQ) {
          const t = 1 - d2 / MAX_DIST_SQ;
          const mixT = (a.x + b.x) / (2 * W);
          const c = mixT < 0.5
            ? mix(COLOR_A, COLOR_B, mixT * 2)
            : mix(COLOR_B, COLOR_C, (mixT - 0.5) * 2);
          ctx.strokeStyle = `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${t * 0.22})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // -------- Cursor halo --------
    if (mActive) {
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.10)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(mx - 200, my - 200, 400, 400);
    }

    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);

  /* ---------- HERO PARALLAX ---------- */
  const heroTitle = document.querySelector('.hero-title');
  const heroSub   = document.querySelector('.hero-sub');
  if (heroTitle) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const off = Math.min(y * 0.25, 200);
      heroTitle.style.transform = `translateY(${off * 0.4}px)`;
      heroTitle.style.opacity = String(Math.max(0, 1 - y / 600));
      if (heroSub) {
        heroSub.style.transform = `translateY(${off * 0.7}px)`;
        heroSub.style.opacity = String(Math.max(0, 1 - y / 500));
      }
    }, { passive: true });
  }

})();
