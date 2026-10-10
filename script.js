/* =====================================================================
   HAPPY 24TH ANNIVERSARY, MOM & DAD — script.js
   A gift from Bivor & Bornil.

   ASSET LOCATIONS
     • Photos: assets/photos/photo-1.jpg … photo-6.jpg
     • Music:  assets/music/anniversary-song.mp3
     • Fonts:  assets/fonts/ (already included)

   TESTING SHORTCUTS (add to the address bar after index.html)
     ?countdown=10     → the countdown finishes 10 seconds after loading
     ?skip             → the countdown is already complete
     ?scene=gallery    → jump straight to a scene. Names: countdown, reveal,
                         letter, gallery, cake, candles, cutting, finale
   ===================================================================== */

(function () {
  'use strict';

  /* ===================================================================
     1. CONFIGURATION — everything you might want to change lives here
     =================================================================== */
  const CONFIG = {
    /* The anniversary midnight, in Bangladesh time.
       Asia/Dhaka is UTC+06:00 all year round (no daylight saving),
       so the fixed "+06:00" offset is exact. To change the moment,
       edit only the date and time; keep "+06:00". */
    countdownTarget: '2026-10-10T00:00:00+06:00',

    /* One background song for the whole experience. */
    music: {
      src: 'assets/music/anniversary-song.mp3',
      volume: 0.45,     // comfortable background level (0 – 1)
      fadeInMs: 3500    // gentle fade-in so it never starts abruptly
    },

    /* The six photographs, shown one at a time, in this order.
       `author` is only filled in for verified quotations;
       original lines are left unattributed on purpose. */
    photos: [
      {
        src: 'assets/photos/photo-1.jpg',
        alt: 'Dad and Mom standing together beside an ornate iron gate on a sunny hillside, with bare trees and misty mountains behind them.',
        theme: 'The Beginning of a Beautiful Journey',
        caption: 'Up in the hills, side by side — the same quiet promise you made twenty-four years ago, still standing strong.',
        quote: 'The bravest thing two hearts can do is begin — and then keep beginning, again and again, together.',
        author: ''
      },
      {
        src: 'assets/photos/photo-2.jpg',
        alt: 'Dad and Mom standing by a desert road in front of a towering rocky mountain.',
        theme: 'Love That Grows Stronger With Time',
        caption: 'Like the ancient mountain behind you — steady, patient, and only more beautiful with every passing year.',
        quote: 'A successful marriage requires falling in love many times, always with the same person.',
        author: 'Mignon McLaughlin',
        source: 'The Neurotic’s Notebook'
      },
      {
        src: 'assets/photos/photo-3.jpg',
        alt: 'Dad and Mom standing back to back beside the water, with tall city skyscrapers rising behind them.',
        theme: 'Standing Beside One Another',
        caption: 'Back to back, side by side — each other’s strongest support, wherever in the world you are.',
        quote: 'Love does not consist in gazing at each other, but in looking outward together in the same direction.',
        author: 'Antoine de Saint-Exupéry',
        source: 'Wind, Sand and Stars'
      },
      {
        src: 'assets/photos/photo-4.jpg',
        alt: 'A close, smiling selfie of Dad and Mom with their heads resting together.',
        theme: 'Happiness in Ordinary Moments',
        caption: 'No grand occasion, no special reason — just the two of you, smiling. These are the moments that make a life.',
        quote: 'Some of the most beautiful love stories are written quietly, one ordinary day at a time.',
        author: ''
      },
      {
        src: 'assets/photos/photo-5.jpg',
        alt: 'Mom and Dad standing arm in arm in a tall pine forest beside a huge fallen tree trunk.',
        theme: 'Growing Older Together',
        caption: 'Among the tall pines, still walking arm in arm — proof that the best journeys are the ones you take together.',
        quote: 'Grow old along with me! The best is yet to be.',
        author: 'Robert Browning',
        source: 'Rabbi Ben Ezra'
      },
      {
        src: 'assets/photos/photo-6.jpg',
        alt: 'Dad and Mom side by side in the bright desert sun, a rugged mountain rising behind them.',
        theme: 'A Family Built on Love',
        caption: 'Twenty-four years of patience, laughter, and togetherness — the home we were so lucky to grow up in.',
        quote: 'Home is not merely a place. Sometimes, it is two people who make life feel safe.',
        author: ''
      }
    ],

    /* Pacing of the letter and blessing (milliseconds). */
    timing: {
      letterMin: 1700,
      letterPerChar: 19,
      letterMax: 4400,
      blessingMin: 1500,
      blessingPerChar: 15,
      blessingMax: 3600
    }
  };

  /* ===================================================================
     2. SMALL UTILITIES
     =================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const r1 = (n) => Math.round(n * 10) / 10;

  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let REDUCED = !!(motionQuery && motionQuery.matches);
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', (e) => { REDUCED = e.matches; });
  }
  /** Shortens pauses for visitors who prefer reduced motion. */
  const pace = (ms) => (REDUCED ? Math.min(ms, 450) : ms);

  const show = (el) => el && el.classList.add('is-shown');
  const hide = (el) => el && el.classList.remove('is-shown');

  /** Runs a click handler only once (prevents double-click skipping).
      If the handler returns false, the button is re-armed. */
  function onceClick(btn, handler) {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      if (btn.dataset.used === '1') return;
      btn.dataset.used = '1';
      btn.disabled = true;
      Promise.resolve(handler(e)).then((ok) => {
        if (ok === false) { btn.dataset.used = ''; btn.disabled = false; }
      });
    });
  }

  /** Centre point of an element, in viewport pixels. */
  function centerOf(el, yFactor = 0.5) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * yFactor, w: r.width, h: r.height };
  }

  /** Runs an init step without letting one failure break the whole site. */
  function safely(label, fn) {
    try { fn(); } catch (err) { console.error(`[Anniversary] ${label} failed:`, err); }
  }

  /* ===================================================================
     3. PARTICLES — one canvas for stars, gold dust, petals, hearts,
        confetti and sparkles. Counts are modest to stay smooth.
     =================================================================== */
  const FX = (() => {
    const canvas = $('#fx-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    let W = 0, H = 0, DPR = 1;
    let stars = [];
    let starAlpha = 0;
    const parts = [];
    const MAX_PARTS = 420;
    let ambient = { stars: 0, dust: 0, petals: 0, hearts: 0 };
    const counts = { dust: 0, petals: 0, hearts: 0 };
    let last = 0;

    const CONFETTI = ['#d4af37', '#f6e3a1', '#fbf4e6', '#f2c4c9', '#d9909b', '#7d1d35', '#e8cf96'];
    const PETALS = ['#a3263f', '#b8324f', '#c94461', '#e7a0a8', '#f2c4c9'];
    const HEARTS = ['#f2c4c9', '#e7a0a8', '#d9909b', '#f6e3a1'];

    // Pre-rendered soft glow sprite (much cheaper than shadows)
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    (function paintSprite() {
      const s = sprite.getContext('2d');
      const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255, 250, 225, 1)');
      g.addColorStop(0.22, 'rgba(246, 227, 161, 0.85)');
      g.addColorStop(0.55, 'rgba(212, 175, 55, 0.25)');
      g.addColorStop(1, 'rgba(212, 175, 55, 0)');
      s.fillStyle = g;
      s.fillRect(0, 0, 64, 64);
    })();

    function init() {
      if (!ctx) { console.warn('[Anniversary] Canvas not supported — particles disabled.'); return; }
      resize();
      let t = 0;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 150); });
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (ambient.stars > 0) makeStars(ambient.stars);
    }

    function makeStars(n) {
      const count = W < 600 ? Math.round(n * 0.6) : n;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.9,
        r: rand(0.3, 1.3),
        ph: Math.random() * Math.PI * 2,
        sp: rand(0.5, 1.8),
        big: Math.random() < 0.07
      }));
    }

    /** Sets the gentle background particles for the current scene. */
    function setAmbient(cfg) {
      const small = W < 600 ? 0.7 : 1;
      ambient = Object.assign({ stars: 0, dust: 0, petals: 0, hearts: 0 }, cfg);
      ambient.dust = Math.round(ambient.dust * small);
      ambient.petals = Math.round(ambient.petals * small);
      if (REDUCED) {
        ambient.petals = 0;
        ambient.hearts = 0;
        ambient.dust = Math.min(ambient.dust, 8);
      }
      if (ambient.stars > 0 && stars.length === 0) makeStars(ambient.stars);
      // Pre-fill some gold dust so a scene never starts empty
      const prefill = Math.round(ambient.dust * 0.5) - counts.dust;
      for (let i = 0; i < prefill; i++) addAmbient('dust', true);
    }

    function push(p) {
      if (parts.length < MAX_PARTS) { parts.push(p); return true; }
      return false;
    }

    function addAmbient(kind, initial) {
      let p;
      if (kind === 'dust') {
        p = { t: 'dust', x: Math.random() * W, y: initial ? Math.random() * H : H + 10,
              vy: -rand(8, 26), r: rand(1, 2.6), ph: Math.random() * 6.28, life: 0, max: rand(9, 17), a: rand(0.35, 0.85) };
      } else if (kind === 'petals') {
        p = { t: 'petal', x: Math.random() * W, y: initial ? -Math.random() * H * 0.5 : rand(-60, -20),
              vx: rand(-8, 8), vy: rand(22, 48), rot: Math.random() * 6.28, vr: rand(-1.3, 1.3),
              ph: Math.random() * 6.28, sz: rand(6, 12), c: pick(PETALS), life: 0, max: 60, a: 0.85 };
      } else {
        p = { t: 'heart', x: Math.random() * W, y: H + 20, vx: 0, vy: -rand(14, 30), g: 0,
              ph: Math.random() * 6.28, sz: rand(6, 11), c: pick(HEARTS), life: 0, max: 60, a: rand(0.22, 0.45) };
      }
      p.amb = kind;
      if (push(p)) counts[kind]++;
    }

    /* ---- bursts ---- */
    function confetti({ x = W / 2, y = H * 0.4, count = 120, dir = -Math.PI / 2, spread = Math.PI * 0.85, power = 1 } = {}) {
      if (REDUCED) count = Math.round(count * 0.12);
      if (W < 600) count = Math.round(count * 0.65);
      for (let i = 0; i < count; i++) {
        const ang = dir + (Math.random() - 0.5) * spread;
        const sp = rand(260, 640) * power;
        push({ t: 'confetti', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
               w: rand(4, 8), h: rand(7, 14), rot: Math.random() * 6.28, vr: rand(-9, 9),
               ph: Math.random() * 6.28, c: pick(CONFETTI), life: 0, max: rand(3.5, 5.5), a: 1 });
      }
    }

    function sparkles({ x = W / 2, y = H / 2, count = 24, radius = 120 } = {}) {
      if (REDUCED) count = Math.min(count, 8);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * radius;
        push({ t: 'sparkle', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8,
               sz: rand(5, 13), delay: Math.random() * 0.9, life: 0, max: rand(0.6, 1.3), a: 1 });
      }
    }

    function hearts({ x = W / 2, y = H / 2, count = 12 } = {}) {
      if (REDUCED) count = Math.min(count, 3);
      for (let i = 0; i < count; i++) {
        push({ t: 'heart', x: x + rand(-30, 30), y: y + rand(-10, 10), vx: rand(-70, 70), vy: -rand(70, 160), g: 40,
               ph: Math.random() * 6.28, sz: rand(8, 15), c: pick(HEARTS), life: 0, max: rand(3, 4.5), a: 0.85 });
      }
    }

    /* ---- drawing helpers ---- */
    function heartPath(s) {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.bezierCurveTo(0, -s * 0.5, -s * 0.5, -s * 0.5, -s * 0.5, -s * 0.2);
      ctx.bezierCurveTo(-s * 0.5, s * 0.1, 0, s * 0.25, 0, s * 0.5);
      ctx.bezierCurveTo(0, s * 0.25, s * 0.5, s * 0.1, s * 0.5, -s * 0.2);
      ctx.bezierCurveTo(s * 0.5, -s * 0.5, 0, -s * 0.5, 0, -s * 0.2);
      ctx.closePath();
    }
    function petalPath(s) {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.7, s * 0.75, 0, s);
      ctx.bezierCurveTo(-s * 0.7, s * 0.75, -s * 0.95, -s * 0.55, 0, -s);
      ctx.closePath();
    }
    function sparklePath(s) {
      const k = s * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(k, -k, s, 0);
      ctx.quadraticCurveTo(k, k, 0, s);
      ctx.quadraticCurveTo(-k, k, -s, 0);
      ctx.quadraticCurveTo(-k, -k, 0, -s);
      ctx.closePath();
    }

    function drawStars(t) {
      for (const s of stars) {
        const tw = REDUCED ? 0.7 : 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        const a = (0.25 + 0.75 * tw) * starAlpha;
        ctx.globalAlpha = a;
        if (s.big) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(sprite, s.x - 7, s.y - 7, 14, 14);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = '#fff8e6';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /** Updates one particle; returns false when it should be removed. */
    function step(p, dt) {
      p.life += dt;
      switch (p.t) {
        case 'dust': {
          const speed = REDUCED ? 0.3 : 1;
          p.x += Math.sin(p.ph + p.life * 0.6) * 8 * dt * speed;
          p.y += p.vy * dt * speed;
          return p.life < p.max && p.y > -20;
        }
        case 'petal':
          p.ph += dt * 1.6;
          p.x += (p.vx + Math.sin(p.ph) * 18) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          return p.y < H + 30;
        case 'heart':
          p.vy += p.g * dt;
          p.x += (p.vx + Math.sin(p.ph + p.life * 1.4) * 12) * dt;
          p.vx *= 1 - 1.2 * dt;
          p.y += p.vy * dt;
          return p.y > -30 && p.life < p.max;
        case 'confetti':
          p.vx -= p.vx * 1.8 * dt;
          p.vy += 520 * dt;
          p.vy -= p.vy * 1.6 * dt;
          p.x += (p.vx + Math.sin(p.ph + p.life * 5) * 30) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          return p.life < p.max && p.y < H + 40;
        case 'sparkle':
          if (p.delay > 0) { p.delay -= dt; p.life = 0; return true; }
          return p.life < p.max;
        default:
          return false;
      }
    }

    function draw(p) {
      switch (p.t) {
        case 'dust': {
          const fade = Math.min(1, p.life / 1.5) * Math.min(1, (p.max - p.life) / 2);
          ctx.globalAlpha = p.a * fade;
          ctx.globalCompositeOperation = 'lighter';
          const s = p.r * 7;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'petal':
          ctx.save();
          ctx.globalAlpha = p.a * Math.min(1, p.life / 1.2);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.ph)));
          ctx.fillStyle = p.c;
          petalPath(p.sz);
          ctx.fill();
          ctx.restore();
          break;
        case 'heart': {
          let a = p.a;
          if (p.amb) a *= clamp(p.y / (H * 0.35), 0, 1) * Math.min(1, p.life / 2);
          else a *= Math.min(1, (p.max - p.life) / 1.2);
          ctx.save();
          ctx.globalAlpha = Math.max(0, a);
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.sin(p.ph + p.life) * 0.25);
          ctx.fillStyle = p.c;
          heartPath(p.sz);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'confetti':
          ctx.save();
          ctx.globalAlpha = Math.min(1, (p.max - p.life) / 1);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.ph + p.life * 7));
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          break;
        case 'sparkle': {
          if (p.delay > 0) break;
          const k = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
          const s = p.sz * (0.5 + 0.5 * k);
          ctx.save();
          ctx.globalAlpha = k;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(sprite, p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 1.5);
          ctx.fillStyle = '#fff8dc';
          sparklePath(s);
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

      // Stars fade in/out with the midnight scene
      const starTarget = ambient.stars > 0 ? 1 : 0;
      starAlpha += (starTarget - starAlpha) * Math.min(1, dt * 1.2);
      if (starAlpha > 0.01) drawStars(now / 1000);
      else if (starTarget === 0 && stars.length) stars = [];

      // Keep ambient particles topped up, a few at a time
      for (const kind of ['dust', 'petals', 'hearts']) {
        const target = ambient[kind] || 0;
        if (counts[kind] < target && Math.random() < dt * Math.max(1.5, target * 0.25)) addAmbient(kind, false);
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!step(p, dt)) {
          parts.splice(i, 1);
          if (p.amb) counts[p.amb]--;
          continue;
        }
        draw(p);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    const noop = () => {};
    if (!ctx) return { init, setAmbient: noop, confetti: noop, sparkles: noop, hearts: noop, size: () => ({ W: 0, H: 0 }) };
    return { init, setAmbient, confetti, sparkles, hearts, size: () => ({ W, H }) };
  })();

  /* ===================================================================
     4. MUSIC — a single persistent <audio> element for every scene.
        It is started once (after a real user interaction), never
        restarted, and only faded / muted by the control.
     =================================================================== */
  const Music = (() => {
    const audio = $('#bg-music');
    const control = $('#music-control');
    const btn = $('#music-toggle');
    const volume = $('#music-volume');
    const hint = $('#music-hint');
    let state = 'idle';
    let target = CONFIG.music.volume;
    let fadeRaf = 0;
    let hintTimer = 0;
    let loadFailed = false;

    const LABELS = {
      idle: 'Play background music',
      playing: 'Mute background music',
      muted: 'Unmute background music',
      blocked: 'Play background music',
      error: 'Music unavailable — tap to try again'
    };

    function setState(s) {
      state = s;
      control.dataset.state = s;
      btn.setAttribute('aria-label', LABELS[s]);
      btn.setAttribute('aria-pressed', s === 'playing' ? 'true' : 'false');
      btn.title = LABELS[s];
    }

    function showHint(text) {
      hint.textContent = text;
      hint.classList.add('is-shown');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint.classList.remove('is-shown'), 6000);
    }

    /** Smoothly moves the volume (no abrupt jumps). */
    function fadeTo(v, ms, done) {
      cancelAnimationFrame(fadeRaf);
      const from = audio.volume;
      const start = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const e = k * k * (3 - 2 * k);
        try { audio.volume = clamp(from + (v - from) * e, 0, 1); } catch (_) { /* iOS: volume is read-only */ }
        if (k < 1) fadeRaf = requestAnimationFrame(tick);
        else if (done) done();
      };
      fadeRaf = requestAnimationFrame(tick);
    }

    function init() {
      volume.value = String(Math.round(target * 100));
      btn.addEventListener('click', toggle);
      volume.addEventListener('input', () => {
        target = Number(volume.value) / 100;
        if (state === 'playing') { cancelAnimationFrame(fadeRaf); audio.volume = target; }
      });

      if (!CONFIG.music.src) {
        console.warn('[Anniversary] No music file configured (CONFIG.music.src). Continuing without music.');
        setState('error');
        return;
      }
      audio.addEventListener('error', () => {
        loadFailed = true;
        console.warn(`[Anniversary] The background music could not be loaded from "${CONFIG.music.src}". ` +
          'Put your song at that path (or update CONFIG.music.src). Everything else keeps working.');
        if (state !== 'playing') setState('error');
      });
      audio.loop = true;
      audio.volume = 0;
      audio.src = CONFIG.music.src;
    }

    /** Begins playback. Must be called directly from a click/tap. */
    function start() {
      if (state === 'playing' || state === 'muted') return; // never restart
      if (loadFailed) { loadFailed = false; audio.load(); }
      audio.muted = false;
      if (audio.paused) { try { audio.volume = 0; } catch (_) { /* ignore */ } }
      let p;
      try { p = audio.play(); } catch (err) { onFail(err); return; }
      if (p && typeof p.then === 'function') p.then(onPlaying, onFail);
      else onPlaying();
    }

    function onPlaying() {
      setState('playing');
      fadeTo(target, CONFIG.music.fadeInMs);
    }

    function onFail(err) {
      if (audio.error || loadFailed) {
        setState('error');
        showHint('Music file not found');
      } else {
        console.warn('[Anniversary] The browser did not allow music to start yet:', err && err.name);
        setState('blocked');
        showHint('Tap ♪ to play the music');
      }
    }

    function toggle() {
      if (state === 'playing') {
        setState('muted');
        fadeTo(0, 700, () => { audio.muted = true; });
      } else if (state === 'muted') {
        audio.muted = false;
        setState('playing');
        if (audio.paused) audio.play().catch(onFail);
        fadeTo(target, 1200);
      } else {
        start();
      }
    }

    return { init, start };
  })();

  /* ===================================================================
     5. SCENE 1 — THE MIDNIGHT COUNTDOWN
     =================================================================== */
  const Countdown = (() => {
    const scene = $('#scene-countdown');
    const nums = {
      d: $('#cd-days'), h: $('#cd-hours'), m: $('#cd-minutes'), s: $('#cd-seconds')
    };
    const timerEl = $('#countdown');
    const moment = $('#cd-moment');
    const btn = $('#btn-continue');
    let target = 0;
    let interval = 0;
    let done = false;

    function resolveTarget() {
      const params = new URLSearchParams(window.location.search);
      if (params.has('countdown')) {
        const secs = parseInt(params.get('countdown'), 10);
        if (!isNaN(secs) && secs >= 0) return Date.now() + secs * 1000;
      }
      if (params.has('skip')) return Date.now() - 1000;
      const t = Date.parse(CONFIG.countdownTarget);
      if (isNaN(t)) {
        console.warn('[Anniversary] CONFIG.countdownTarget is not a valid date — opening the celebration straight away.');
        return Date.now() - 1000;
      }
      return t;
    }

    function setNum(el, v) {
      const s = String(v).padStart(2, '0');
      if (el.textContent === s) return;
      el.textContent = s;
      if (!REDUCED) {
        el.classList.remove('tick');
        void el.offsetWidth; // restart the tiny tick animation
        el.classList.add('tick');
      }
    }

    function render() {
      const ms = target - Date.now();
      if (ms <= 0) { complete(false); return; }
      const total = Math.ceil(ms / 1000);
      setNum(nums.d, Math.floor(total / 86400));
      setNum(nums.h, Math.floor((total % 86400) / 3600));
      setNum(nums.m, Math.floor((total % 3600) / 60));
      setNum(nums.s, total % 60);
    }

    async function complete(instant) {
      if (done) return;
      done = true;
      clearInterval(interval);
      Object.values(nums).forEach((el) => setNum(el, 0));
      timerEl.setAttribute('aria-label', 'The countdown is complete');
      scene.classList.add('is-complete');

      if (!instant) {
        const flash = $('#flash');
        flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
        const c = centerOf(timerEl);
        FX.sparkles({ x: c.x, y: c.y, count: 40, radius: Math.max(160, c.w * 0.6) });
        await wait(pace(1300));
      } else {
        await wait(pace(1700)); // let the opening animation settle first
      }
      show(moment);
      await wait(pace(1100));
      show(btn);
      btn.focus({ preventScroll: true });
    }

    function init() {
      target = resolveTarget();
      onceClick(btn, () => {
        Music.start(); // first real interaction → music may begin
        return Scenes.go('reveal');
      });
    }

    function enter() {
      if (done) return;
      if (target - Date.now() <= 0) { complete(true); return; }
      render();
      interval = setInterval(render, 250); // cheap check; digits change once a second
    }

    function leave() { clearInterval(interval); }

    return { init, enter, leave };
  })();

  /* ===================================================================
     6. SCENE 2 — THE ANNIVERSARY REVEAL
     =================================================================== */
  const Reveal = (() => {
    const btn = $('#btn-to-letter');

    /** Draws the golden laurel wreath around the "24" medallion. */
    function buildLaurel() {
      const g = $('#laurel');
      if (!g) return;
      const cx = 100, cy = 100, R = 86;
      let html = '';
      const pt = (deg) => [cx + R * Math.cos(deg * Math.PI / 180), cy + R * Math.sin(deg * Math.PI / 180)];
      // Stems
      const [lx1, ly1] = pt(96), [lx2, ly2] = pt(218);
      html += `<path d="M${r1(lx1)} ${r1(ly1)} A${R} ${R} 0 0 1 ${r1(lx2)} ${r1(ly2)}" fill="none" stroke="url(#g-gold)" stroke-width="1"/>`;
      html += `<path d="M${r1(200 - lx1)} ${r1(ly1)} A${R} ${R} 0 0 0 ${r1(200 - lx2)} ${r1(ly2)}" fill="none" stroke="url(#g-gold)" stroke-width="1"/>`;
      // Leaves (left side, then mirrored)
      for (let k = 0; k < 9; k++) {
        const deg = 102 + k * 13.5;
        const [x, y] = pt(deg);
        const scale = 1 - k * 0.045;
        const rx = 9 * scale, ry = 3.3 * scale;
        for (const tilt of [-38, 38]) {
          const a = deg + 90 + tilt;
          const lx = x + rx * Math.cos(a * Math.PI / 180);
          const ly = y + rx * Math.sin(a * Math.PI / 180);
          html += `<ellipse class="laurel-leaf" cx="${r1(lx)}" cy="${r1(ly)}" rx="${r1(rx)}" ry="${r1(ry)}" transform="rotate(${r1(a)} ${r1(lx)} ${r1(ly)})"/>`;
          html += `<ellipse class="laurel-leaf" cx="${r1(200 - lx)}" cy="${r1(ly)}" rx="${r1(rx)}" ry="${r1(ry)}" transform="rotate(${r1(180 - a)} ${r1(200 - lx)} ${r1(ly)})"/>`;
        }
      }
      g.innerHTML = html;
    }

    function init() {
      buildLaurel();
      onceClick(btn, () => Scenes.go('letter'));
    }

    async function enter() {
      const { W, H } = FX.size();
      await wait(pace(1700));
      // Two soft confetti "cannons" from the lower corners…
      FX.confetti({ x: W * 0.08, y: H * 0.95, dir: -Math.PI / 2 + 0.45, spread: 0.6, count: 80 });
      FX.confetti({ x: W * 0.92, y: H * 0.95, dir: -Math.PI / 2 - 0.45, spread: 0.6, count: 80 });
      await wait(pace(900));
      // …then sparkles around the title as "Mom & Dad!" blooms in
      const title = $('#reveal-title');
      const c = centerOf(title);
      FX.sparkles({ x: c.x, y: c.y, count: 34, radius: Math.max(140, c.w * 0.55) });
      FX.hearts({ x: c.x, y: c.y + c.h * 0.6, count: 8 });
      await wait(pace(2800));
      show(btn);
    }

    return { init, enter };
  })();

  /* ===================================================================
     7. SCENE 3 — THE LETTER
     =================================================================== */
  const Letter = (() => {
    const scroller = $('#letter-scroll');
    const skipBtn = $('#btn-letter-skip');
    const nextBtn = $('#btn-to-gallery');
    let token = 0;
    let finished = false;

    function follow(p) {
      const bottom = p.offsetTop + p.offsetHeight;
      if (bottom > scroller.scrollTop + scroller.clientHeight - 8) {
        scroller.scrollTo({ top: bottom - scroller.clientHeight + 28, behavior: REDUCED ? 'auto' : 'smooth' });
      }
    }

    async function play() {
      const my = ++token;
      const paras = $$('.letter-p', scroller);
      await wait(pace(1400));
      for (const p of paras) {
        if (my !== token) return;
        if (p.classList.contains('is-shown')) continue;
        p.classList.add('is-shown');
        follow(p);
        const t = CONFIG.timing;
        const len = p.textContent.trim().length;
        await wait(pace(clamp(t.letterMin + len * t.letterPerChar, t.letterMin, t.letterMax)));
      }
      if (my === token) finish();
    }

    async function finish() {
      if (finished) return;
      finished = true;
      skipBtn.classList.add('is-gone');
      await wait(pace(550)); // let the quiet link fade before the button arrives
      skipBtn.disabled = true;
      show(nextBtn);
      nextBtn.focus({ preventScroll: true });
      const sign = $('.letter-sign', scroller);
      if (sign) FX.sparkles(Object.assign({ count: 14, radius: 70 }, centerOf(sign)));
    }

    function init() {
      skipBtn.addEventListener('click', () => {
        token++;
        $$('.letter-p', scroller).forEach((p) => p.classList.add('is-shown'));
        finish();
      });
      onceClick(nextBtn, () => Scenes.go('gallery'));
    }

    function enter() {
      Gallery.preload();
      play();
    }

    return { init, enter };
  })();

  /* ===================================================================
     8. SCENE 4 — THE GALLERY (one photograph at a time)
     =================================================================== */
  const Gallery = (() => {
    const photos = CONFIG.photos;
    const N = photos.length;
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const layout = $('#gallery-layout');
    const img = $('#gallery-img');
    const fallback = $('#photo-fallback');
    const backdrop = $('#gallery-backdrop');
    const theme = $('#gallery-theme');
    const caption = $('#gallery-caption');
    const quoteText = $('#gallery-quote-text');
    const quoteAuthor = $('#gallery-quote-author');
    const progress = $('#gallery-progress');
    const dotsWrap = $('#gallery-dots');
    const prevBtn = $('#gallery-prev');
    const nextBtn = $('#gallery-next');
    const epilogue = $('#gallery-epilogue');
    const epText = $('#epilogue-text');
    const toCake = $('#btn-to-cake');
    const backBtn = $('#epilogue-back');
    let idx = 0;
    let busy = false;
    let inEpilogue = false;
    let loadToken = 0;
    let preloaded = false;

    function preload() {
      if (preloaded) return;
      preloaded = true;
      photos.forEach((ph, i) => {
        const im = new Image();
        im.onerror = () => console.warn(`[Anniversary] Photo ${i + 1} is missing or unreadable: "${ph.src}". ` +
          'A graceful placeholder will be shown instead.');
        im.src = ph.src;
      });
    }

    function loadImage(ph) {
      const my = ++loadToken;
      return new Promise((resolve) => {
        const probe = new Image();
        let settled = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          if (my !== loadToken) { resolve(); return; }
          if (ok) {
            img.src = ph.src;
            img.alt = ph.alt;
            img.hidden = false;
            fallback.hidden = true;
            backdrop.style.backgroundImage = `url("${encodeURI(ph.src)}")`;
            show(backdrop);
          } else {
            img.removeAttribute('src');
            img.alt = '';
            img.hidden = true;
            fallback.hidden = false;
            hide(backdrop);
          }
          resolve();
        };
        probe.onload = () => done(true);
        probe.onerror = () => {
          console.warn(`[Anniversary] Could not load "${ph.src}". Showing a placeholder.`);
          done(false);
        };
        probe.src = ph.src;
        setTimeout(() => done(true), 8000); // slow disk/network: show it as it arrives
      });
    }

    function updateChrome() {
      progress.textContent = inEpilogue ? 'The story continues' : `Memory ${idx + 1} of ${N}`;
      $$('span', dotsWrap).forEach((d, i) => {
        d.classList.toggle('is-current', !inEpilogue && i === idx);
        d.classList.toggle('is-seen', inEpilogue || i < idx);
      });
      prevBtn.disabled = idx === 0;
      nextBtn.innerHTML = idx === N - 1
        ? 'Continue <span aria-hidden="true">→</span>'
        : 'Next Memory <span aria-hidden="true">→</span>';
    }

    async function render(i, instant) {
      busy = true;
      const ph = photos[i];
      if (!instant) {
        layout.classList.add('is-changing');
        await wait(pace(600));
      }
      theme.textContent = `${ROMAN[i] || i + 1} · ${ph.theme}`;
      caption.textContent = ph.caption;
      quoteText.textContent = ph.quote;
      quoteAuthor.textContent = ph.author ? `— ${ph.author}${ph.source ? ', ' + ph.source : ''}` : '';
      updateChrome();
      await loadImage(ph);
      img.classList.remove('kenburns');
      void img.offsetWidth;
      if (!REDUCED) img.classList.add('kenburns');
      layout.classList.remove('is-changing');
      busy = false;
    }

    async function showEpilogue() {
      busy = true;
      inEpilogue = true;
      layout.classList.add('is-changing');
      hide(backdrop);
      await wait(pace(650));
      layout.hidden = true;
      epilogue.hidden = false;
      updateChrome();
      await wait(60);
      show(epText);
      epText.focus({ preventScroll: true });
      const c = centerOf(epText);
      FX.sparkles({ x: c.x, y: c.y, count: 22, radius: Math.max(120, c.w * 0.5) });
      await wait(pace(2400));
      show(toCake);
      show(backBtn);
      busy = false;
    }

    async function hideEpilogue() {
      busy = true;
      hide(epText);
      hide(toCake);
      hide(backBtn);
      await wait(pace(500));
      epilogue.hidden = true;
      layout.hidden = false;
      inEpilogue = false;
      idx = N - 1;
      await render(idx, true);
      busy = false;
    }

    function next() {
      if (busy || inEpilogue) return;
      if (idx < N - 1) { idx++; render(idx); }
      else showEpilogue();
    }

    function prev() {
      if (busy) return;
      if (inEpilogue) { hideEpilogue(); return; }
      if (idx > 0) { idx--; render(idx); }
    }

    function init() {
      dotsWrap.innerHTML = photos.map(() => '<span></span>').join('');
      nextBtn.addEventListener('click', next);
      prevBtn.addEventListener('click', prev);
      backBtn.addEventListener('click', prev);
      onceClick(toCake, () => Scenes.go('cakeIntro'));

      // Keyboard arrows
      document.addEventListener('keydown', (e) => {
        if (Scenes.current() !== 'gallery') return;
        if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
        if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
      });

      // Swipe on touch screens
      let sx = 0, sy = 0;
      layout.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
      }, { passive: true });
      layout.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)();
      }, { passive: true });
    }

    function enter() {
      preload();
      idx = 0;
      inEpilogue = false;
      render(0, true);
    }

    return { init, enter, preload };
  })();

  /* ===================================================================
     9. SCENES 5–7 — THE CAKE, THE CANDLES & CUTTING TOGETHER
     =================================================================== */
  const Cake = (() => {
    const scene = $('#scene-cake');
    const stage = $('#cake-stage');
    const candlesEl = $('#candles');
    const statusEl = $('#candle-status');
    const dotsEl = $('#candle-dots');
    const panelCandles = $('#panel-candles');
    const panelCutting = $('#panel-cutting');
    const wishMsg = $('#wish-message');
    const toCutting = $('#btn-to-cutting');
    const cutBtn = $('#btn-cut');
    const cutHint = $('#cut-hint');
    const cutMsg = $('#cut-message');
    const toFinale = $('#btn-to-finale');

    // Candle positions are in the cake's 400 × 412 drawing units.
    const CANDLE_BASE_Y = 181;
    const CANDLES = [
      { x: 128, type: 'taper' },
      { x: 152, type: 'taper' },
      { x: 181, type: 'num', label: '2' },
      { x: 219, type: 'num', label: '4' },
      { x: 248, type: 'taper' },
      { x: 272, type: 'taper' }
    ];
    let lit = CANDLES.length;
    let cutStarted = false;

    /* ---------- drawing helpers (SVG markup strings) ---------- */
    const ellY = (cx, cy, rx, ry, x) => {
      const u = (x - cx) / rx;
      return cy + ry * Math.sqrt(Math.max(0, 1 - u * u));
    };

    /** Frosting that drips over the front edge of a tier. */
    function dripPath(cx, cy, rx, ry, base, drips) {
      let d = `M${cx - rx} ${cy}`;
      for (let x = cx - rx; x <= cx + rx + 0.01; x += 2) {
        let y = ellY(cx, cy, rx, ry, x) + base;
        for (const dp of drips) {
          const u = (x - dp.x) / dp.w;
          if (Math.abs(u) < 1) y += dp.len * Math.pow(1 - u * u, 0.45);
        }
        d += ` L${r1(x)} ${r1(y)}`;
      }
      return d + ` L${cx + rx} ${cy} Z`;
    }

    function pearls(cx, cy, rx, ry, stepX, r, lift) {
      let s = '';
      for (let x = cx - rx + stepX / 2; x < cx + rx; x += stepX) {
        s += `<circle cx="${r1(x)}" cy="${r1(ellY(cx, cy, rx, ry, x) - lift)}" r="${r}" fill="url(#g-pearl)"/>`;
      }
      return s;
    }

    function rose(x, y, r, tone) {
      const fill = tone === 'blush' ? 'url(#g-rose-blush)' : 'url(#g-rose-deep)';
      const line = tone === 'blush' ? '#b86b78' : '#5e1427';
      return `<g transform="translate(${x} ${y})">
        <ellipse cx="${r1(-r * 0.95)}" cy="${r1(r * 0.35)}" rx="${r1(r * 0.75)}" ry="${r1(r * 0.3)}" transform="rotate(-22)" fill="url(#g-leaf)"/>
        <ellipse cx="${r1(r * 0.95)}" cy="${r1(r * 0.35)}" rx="${r1(r * 0.75)}" ry="${r1(r * 0.3)}" transform="rotate(22)" fill="url(#g-leaf)"/>
        <circle r="${r}" fill="${fill}"/>
        <path d="M${r1(-r * 0.62)} ${r1(r * 0.12)} A${r1(r * 0.62)} ${r1(r * 0.62)} 0 0 1 ${r1(r * 0.5)} ${r1(-r * 0.35)}
                 M${r1(r * 0.6)} ${r1(r * 0.15)} A${r1(r * 0.55)} ${r1(r * 0.55)} 0 0 1 ${r1(-r * 0.2)} ${r1(r * 0.62)}
                 M${r1(-r * 0.22)} ${r1(-r * 0.05)} A${r1(r * 0.24)} ${r1(r * 0.24)} 0 1 1 ${r1(r * 0.16)} ${r1(r * 0.16)}"
              fill="none" stroke="${line}" stroke-width="${r1(Math.max(0.8, r * 0.12))}" stroke-linecap="round" opacity=".6"/>
      </g>`;
    }

    function buildStand() {
      let s = '';
      s += '<ellipse cx="200" cy="404" rx="52" ry="6" fill="#6f5017"/>';
      s += '<path d="M178 378 L222 378 L240 402 Q200 410 160 402 Z" fill="url(#g-gold-h)"/>';
      s += '<ellipse cx="200" cy="375" rx="170" ry="22" fill="#7a5a1a"/>';
      s += '<ellipse cx="200" cy="371" rx="170" ry="21" fill="url(#g-gold-h)"/>';
      s += '<ellipse cx="200" cy="368" rx="160" ry="17" fill="#fff3d0" opacity=".28"/>';
      for (let x = 44; x <= 356; x += 13) {
        s += `<circle cx="${x}" cy="${r1(ellY(200, 371, 170, 21, x) - 1)}" r="2.2" fill="#fff0bd" opacity=".85"/>`;
      }
      return s;
    }

    function buildTiers() {
      let s = '';
      // ---- Bottom tier (blush) ----
      s += '<path d="M70 262 L70 360 A130 14 0 0 0 330 360 L330 262 Z" fill="url(#g-blush-body)"/>';
      // gold garland swags
      const swY = (x) => ellY(200, 290, 130, 14, x);
      const n = 7, w = (260 - 16) / n;
      for (let i = 0; i < n; i++) {
        const x0 = 78 + i * w, x1 = x0 + w, mx = (x0 + x1) / 2;
        const y0 = swY(x0), y1 = swY(x1), my = (y0 + y1) / 2 + 18;
        s += `<path d="M${r1(x0)} ${r1(y0)} Q${r1(mx)} ${r1(my)} ${r1(x1)} ${r1(y1)}" fill="none" stroke="url(#g-gold-h)" stroke-width="2"/>`;
        s += `<circle cx="${r1(mx)}" cy="${r1((y0 + y1) / 2 + 13)}" r="2.2" fill="#e9c96a"/>`;
        s += `<circle cx="${r1(x0)}" cy="${r1(y0)}" r="3.2" fill="url(#g-pearl)"/>`;
      }
      s += `<circle cx="${r1(78 + n * w)}" cy="${r1(swY(78 + n * w))}" r="3.2" fill="url(#g-pearl)"/>`;
      // pearls at the base
      s += pearls(200, 360, 130, 14, 9, 3.3, 2);
      // ivory drips + top surface
      s += `<path d="${dripPath(200, 262, 130, 14, 5, [
        { x: 86, w: 7, len: 16 }, { x: 110, w: 6, len: 9 }, { x: 136, w: 8, len: 22 }, { x: 163, w: 6, len: 12 },
        { x: 190, w: 7, len: 18 }, { x: 228, w: 6, len: 10 }, { x: 254, w: 8, len: 24 }, { x: 282, w: 6, len: 13 },
        { x: 308, w: 7, len: 17 }])}" fill="url(#g-ivory-top)"/>`;
      s += '<ellipse cx="200" cy="262" rx="130" ry="14" fill="url(#g-ivory-top)"/>';

      // ---- Top tier (ivory with burgundy ganache) ----
      s += '<path d="M120 178 L120 258 A80 10 0 0 0 280 258 L280 178 Z" fill="url(#g-ivory-body)"/>';
      // satin ribbon with gold edges
      s += '<path d="M120 238 A80 10 0 0 0 280 238 L280 250 A80 10 0 0 1 120 250 Z" fill="url(#g-ganache)" opacity=".92"/>';
      s += '<path d="M120 238 A80 10 0 0 0 280 238 M120 250 A80 10 0 0 0 280 250" fill="none" stroke="url(#g-gold-h)" stroke-width="1"/>';
      s += pearls(200, 258, 80, 10, 8, 2.6, 1.5);
      s += `<path d="${dripPath(200, 178, 80, 10, 4, [
        { x: 132, w: 5, len: 12 }, { x: 150, w: 6, len: 20 }, { x: 170, w: 5, len: 10 }, { x: 190, w: 6, len: 16 },
        { x: 212, w: 5, len: 24 }, { x: 234, w: 6, len: 12 }, { x: 255, w: 5, len: 18 }, { x: 271, w: 4, len: 8 }])}" fill="url(#g-ganache)"/>`;
      s += '<ellipse cx="200" cy="178" rx="80" ry="10" fill="url(#g-ganache-top)"/>';
      s += '<ellipse cx="180" cy="175" rx="34" ry="2.6" fill="#ffffff" opacity=".13"/>';

      // ---- Roses nestled on the ledge between the tiers ----
      s += rose(82, 274, 6, 'blush') + rose(98, 271, 11, 'deep') + rose(117, 276, 8, 'blush');
      s += rose(318, 274, 6, 'blush') + rose(302, 271, 11, 'deep') + rose(283, 276, 8, 'blush');
      // a little cascade on the bottom tier
      s += rose(100, 302, 6, 'deep') + rose(300, 302, 6, 'deep');

      // ---- Roses on top, only visible once the candles are cleared ----
      s += `<g class="top-roses">${rose(146, 177, 9, 'deep')}${rose(164, 182, 6, 'blush')}${rose(254, 177, 9, 'deep')}${rose(236, 182, 6, 'blush')}
            <circle cx="184" cy="178" r="1.8" fill="url(#g-pearl)"/><circle cx="216" cy="177" r="1.8" fill="url(#g-pearl)"/>
            <circle cx="200" cy="181" r="1.6" fill="url(#g-pearl)"/></g>`;
      return s;
    }

    /** The inside of the cake, revealed when the two halves part. */
    function buildInterior() {
      const layers = [
        [176, 182, '#7a1f33'], [182, 204, '#ecc98f'], [204, 209, '#a3263f'], [209, 214, '#fff1dc'],
        [214, 236, '#e8c189'], [236, 240, '#b8324f'], [240, 260, '#ecc98f'], [260, 264, '#d4af37'],
        [264, 270, '#fbeee6'], [270, 298, '#e9c48b'], [298, 304, '#fff1dc'], [304, 309, '#a3263f'],
        [309, 336, '#ecc98f'], [336, 342, '#fff1dc'], [342, 370, '#e5bd85']
      ];
      let s = `<defs><linearGradient id="g-int-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3a1408" stop-opacity=".5"/><stop offset=".2" stop-color="#3a1408" stop-opacity="0"/>
          <stop offset=".8" stop-color="#3a1408" stop-opacity="0"/><stop offset="1" stop-color="#3a1408" stop-opacity=".5"/>
        </linearGradient></defs>`;
      for (const [y0, y1, c] of layers) s += `<rect x="176" y="${y0}" width="48" height="${y1 - y0 + 0.4}" fill="${c}"/>`;
      // crumb texture (deterministic, so it looks the same every time)
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 46; i++) {
        s += `<circle cx="${r1(178 + rnd() * 44)}" cy="${r1(184 + rnd() * 184)}" r="${r1(0.5 + rnd() * 0.9)}" fill="#b98a4e" opacity=".45"/>`;
      }
      s += '<rect x="176" y="176" width="48" height="194" fill="url(#g-int-shade)"/>';
      return s;
    }

    function buildTopper() {
      return `
        <line x1="140" y1="182" x2="140" y2="66" stroke="url(#g-gold-h)" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="260" y1="182" x2="260" y2="66" stroke="url(#g-gold-h)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M110 34 L290 34 L278 52 L290 70 L110 70 L122 52 Z" fill="url(#g-ganache)" stroke="url(#g-gold)" stroke-width="1.6"/>
        <path d="M124 39 L276 39 M124 65 L276 65" stroke="url(#g-gold)" stroke-width=".6" opacity=".7"/>
        <text x="200" y="59" text-anchor="middle" textLength="142" lengthAdjust="spacingAndGlyphs"
              font-family="'Great Vibes', 'Segoe Script', 'Brush Script MT', cursive" font-size="22" fill="url(#g-gold-h)">Happy Anniversary</text>
        <path d="M200 26 c -2.4 -4 -8 -3.2 -8 1.6 c 0 4 8 8 8 8 c 0 0 8 -4 8 -8 c 0 -4.8 -5.6 -5.6 -8 -1.6z" fill="url(#g-gold)"/>`;
    }

    function buildRig() {
      const blade = `<g class="knife-part">
          <path d="M191.5 96 L208.5 96 L208.5 156 Q207.5 170 200 178 Q192.5 168 191.5 150 Z" fill="url(#g-blade)" stroke="#7a828a" stroke-width=".6"/>
          <path d="M196 104 L196 160" stroke="#ffffff" stroke-width=".9" opacity=".55" stroke-linecap="round"/>
        </g>`;
      const handle = `<g class="knife-part">
          <rect x="190" y="2" width="20" height="8" rx="3" fill="url(#g-gold-h)"/>
          <rect x="191" y="8" width="18" height="82" rx="7" fill="url(#g-handle)" stroke="rgba(168,128,42,.55)" stroke-width=".8"/>
          <rect x="189" y="88" width="22" height="9" rx="2" fill="url(#g-gold-h)"/>
          <path d="M199 104 C194 115 190 125 184 135 L190 134 L192 140 C196 128 200 116 201 105 Z" fill="url(#g-ribbon)"/>
          <path d="M201 104 C206 115 210 125 216 135 L210 134 L208 140 C204 128 200 116 199 105 Z" fill="url(#g-ribbon)"/>
          <path d="M200 102 C188 89 174 97 184 107 C189 111 195 107 200 102 Z" fill="url(#g-ribbon)"/>
          <path d="M200 102 C212 89 226 97 216 107 C211 111 205 107 200 102 Z" fill="url(#g-ribbon)"/>
          <circle cx="200" cy="103" r="3.6" fill="#e7a0a8" stroke="#c97b87" stroke-width=".6"/>
        </g>`;
      // Dad's hand — from the left: navy suit sleeve, shirt cuff, cufflink, wedding ring
      let left = `<g class="hand-left">
          <path d="M-260 46 L116 46 Q124 46 124 54 L124 92 Q124 100 116 100 L-260 100 Z" fill="url(#g-sleeve-m)"/>
          <path d="M-60 60 Q30 56 112 58" fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="3"/>
          <rect x="118" y="50" width="26" height="46" rx="5" fill="#f7f2e8" stroke="#d9cfbd" stroke-width=".8"/>
          <circle cx="131" cy="73" r="3.4" fill="url(#g-gold)"/>
          <path d="M142 54 C156 48 172 48 186 52 L188 92 C172 96 156 96 142 92 C138 82 138 64 142 54 Z" fill="url(#g-skin-m)"/>
          <path d="M150 60 Q160 57 170 58" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="2" stroke-linecap="round"/>`;
      for (let k = 0; k < 4; k++) {
        left += `<rect x="178" y="${r1(52.5 + k * 9.6)}" width="36" height="9.4" rx="4.7" fill="url(#g-skin-m)" stroke="rgba(110,60,30,.45)" stroke-width=".8"/>`;
      }
      left += '<rect x="186" y="81.3" width="3.6" height="9.4" fill="url(#g-gold-h)"/></g>';

      // Mom's hand — from the right: burgundy sleeve with gold border, bangles, painted nails, ring
      let right = `<g class="hand-right">
          <path d="M276 10 L660 10 L660 56 L276 56 Q266 56 266 46 L266 20 Q266 10 276 10 Z" fill="url(#g-sleeve-f)"/>
          <rect x="264" y="10" width="8" height="46" rx="2" fill="url(#g-gold-h)"/>`;
      for (let k = 0; k < 6; k++) {
        right += `<circle cx="${284 + k * 13}" cy="17" r="1.3" fill="#e9c96a" opacity="${(0.9 - k * 0.13).toFixed(2)}"/>`;
        right += `<circle cx="${290 + k * 13}" cy="49" r="1.3" fill="#e9c96a" opacity="${(0.9 - k * 0.13).toFixed(2)}"/>`;
      }
      right += '<path d="M228 17 L268 14 L268 52 L228 50 Z" fill="url(#g-skin-f)"/>';
      for (const bx of [238, 245, 252, 259]) {
        right += `<rect x="${bx}" y="12" width="4.5" height="42" rx="2.2" fill="url(#g-gold-h)" stroke="#8a651d" stroke-width=".4"/>`;
      }
      right += '<path d="M234 18 C224 14 214 14 206 17 L205 49 C214 52 224 52 234 49 Z" fill="url(#g-skin-f)"/>';
      for (let k = 0; k < 4; k++) {
        const y = 17.5 + k * 8;
        right += `<rect x="184" y="${y}" width="32" height="7.8" rx="3.9" fill="url(#g-skin-f)" stroke="rgba(140,80,50,.4)" stroke-width=".7"/>`;
        right += `<rect x="184.6" y="${y + 1}" width="6" height="5.8" rx="2.9" fill="#c4485f"/>`;
      }
      right += '<rect x="208" y="41.5" width="3" height="7.8" fill="url(#g-gold-h)"/><circle cx="209.5" cy="41.5" r="1.8" fill="#ffffff"/></g>';

      return `
        <g clip-path="url(#clip-blade)"><g class="rig-move"><g transform="translate(0 -10)">${blade}</g></g></g>
        <g class="rig-move"><g transform="translate(0 -10)">${handle}${left}${right}</g></g>`;
    }

    function buildCandles() {
      const bottom = ((412 - CANDLE_BASE_Y) / 412) * 100;
      candlesEl.innerHTML = '';
      dotsEl.innerHTML = '';
      CANDLES.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'candle-btn' + (c.type === 'num' ? ' candle-num' : '');
        b.style.setProperty('--x', `${(c.x / 400) * 100}%`);
        b.style.setProperty('--w', c.type === 'num' ? '10%' : '7.5%');
        b.style.setProperty('--bottom', `${bottom.toFixed(2)}%`);
        const name = c.type === 'num' ? `the number ${c.label} candle` : `candle ${i + 1}`;
        b.dataset.name = name;
        b.setAttribute('aria-label', `Blow out ${name} (${i + 1} of ${CANDLES.length})`);
        b.innerHTML =
          '<span class="candle-flame-wrap"><span class="candle-halo"></span><span class="flame"></span><span class="candle-smoke"></span></span>' +
          '<span class="candle-wick"></span>' +
          `<span class="candle-body">${c.type === 'num' ? `<span class="candle-digit">${c.label}</span>` : ''}</span>`;
        b.addEventListener('click', () => blowOut(b, i));
        candlesEl.appendChild(b);
        dotsEl.appendChild(document.createElement('span'));
      });
      lit = CANDLES.length;
      updateStatus();
    }

    function updateStatus() {
      const total = CANDLES.length;
      if (lit === 0) statusEl.textContent = 'All the candles are out';
      else if (lit === total) statusEl.textContent = `${total} candles are glowing`;
      else statusEl.textContent = `${lit} ${lit === 1 ? 'candle is' : 'candles are'} still glowing`;
      scene.style.setProperty('--lit', String(0.15 + 0.85 * (lit / total)));
    }

    /* ---------- candles ---------- */
    function blowOut(btn, i) {
      if (scene.dataset.stage !== 'candles' || btn.classList.contains('is-out')) return;
      btn.classList.add('is-out');
      btn.setAttribute('aria-label', `${btn.dataset.name} — blown out`);
      btn.setAttribute('aria-disabled', 'true');
      const dot = dotsEl.children[i];
      if (dot) dot.classList.add('is-out');
      lit--;
      updateStatus();

      const flame = $('.flame', btn);
      const c = centerOf(flame);
      FX.sparkles({ x: c.x, y: c.y, count: 7, radius: 18 });

      // Keep keyboard focus on a candle that is still lit
      if (document.activeElement === btn && lit > 0) {
        const nextLit = $$('.candle-btn', candlesEl).find((b) => !b.classList.contains('is-out'));
        if (nextLit) nextLit.focus();
      }
      if (lit === 0) allOut();
    }

    async function allOut() {
      await wait(pace(1000));
      panelCandles.classList.add('is-done');
      const c = centerOf(stage, 0.4);
      FX.sparkles({ x: c.x, y: c.y, count: 44, radius: c.w * 0.65 });
      FX.confetti({ x: c.x, y: c.y - c.h * 0.1, count: 70, spread: Math.PI * 0.7, power: 0.8 });
      show(wishMsg);
      await wait(pace(1900));
      show(toCutting);
      toCutting.focus({ preventScroll: true });
    }

    /* ---------- cutting ---------- */
    async function cut() {
      if (cutStarted || !stage.classList.contains('hands-in')) return;
      cutStarted = true;
      cutBtn.disabled = true;
      stage.classList.remove('can-cut');
      panelCutting.classList.add('is-done');

      // 1–2. Hands guide the knife down into the cake
      stage.classList.add('is-cutting');
      await wait(pace(1150));
      // 3. A clean line appears
      stage.classList.add('is-sliced');
      const c = centerOf(stage, 0.45);
      FX.sparkles({ x: c.x, y: c.y - c.h * 0.05, count: 10, radius: 26 });
      await wait(pace(450));
      // The knife lifts away together
      stage.classList.remove('is-cutting');
      stage.classList.add('is-lifted');
      await wait(pace(650));
      // 4. The halves ease apart, revealing the inside
      stage.classList.add('is-parted');
      // 5. Celebrate!
      FX.confetti({ x: c.x, y: c.y, count: 150, spread: Math.PI * 0.9 });
      FX.sparkles({ x: c.x, y: c.y, count: 40, radius: c.w * 0.7 });
      FX.hearts({ x: c.x, y: c.y, count: 14 });
      await wait(pace(900));
      show(cutMsg);
      await wait(pace(2400));
      show(toFinale);
      toFinale.focus({ preventScroll: true });
    }

    function init() {
      $('#cake-stand').innerHTML = buildStand();
      $('#cake-interior').innerHTML = buildInterior();
      const tiers = buildTiers();
      $('#cake-half-left').innerHTML = tiers;
      $('#cake-half-right').innerHTML = tiers;
      $('#cake-topper').innerHTML = buildTopper();
      $('#knife-rig').innerHTML = buildRig();
      buildCandles();
      candlesEl.inert = true;

      onceClick($('#btn-make-wish'), () => Scenes.go('candles'));
      onceClick(toCutting, () => Scenes.go('cutting'));
      cutBtn.addEventListener('click', cut);
      stage.addEventListener('click', () => { if (scene.dataset.stage === 'cutting') cut(); });
      onceClick(toFinale, () => Scenes.go('finale'));
    }

    function enterIntro() {
      candlesEl.inert = true;
      const { W, H } = FX.size();
      setTimeout(() => FX.sparkles({ x: W / 2, y: H * 0.45, count: 20, radius: Math.min(W, 420) * 0.5 }), pace(1200));
    }

    function enterCandles() {
      candlesEl.inert = false;
    }

    async function enterCutting() {
      candlesEl.inert = true;
      await wait(pace(1000)); // topper & candles fade away first
      stage.classList.add('hands-in');
      await wait(pace(2300));
      show(cutBtn);
      show(cutHint);
      stage.classList.add('can-cut');
    }

    return { init, enterIntro, enterCandles, enterCutting };
  })();

  /* ===================================================================
     10. SCENE 8 — THE CELEBRATION, THE BLESSING & THE END
     =================================================================== */
  const Finale = (() => {
    const scene = $('#scene-finale');
    const theEnd = $('#the-end');

    function follow(el) {
      const r = el.getBoundingClientRect();
      const limit = window.innerHeight - 40;
      if (r.bottom > limit) {
        scene.scrollBy({ top: r.bottom - limit + 40, behavior: REDUCED ? 'auto' : 'smooth' });
      }
    }

    async function enter() {
      const { W, H } = FX.size();
      await wait(pace(700));
      FX.confetti({ x: W * 0.5, y: H * 0.3, count: 110, spread: Math.PI * 1.2, power: 0.9 });
      FX.hearts({ x: W * 0.5, y: H * 0.35, count: 10 });
      await wait(pace(1800));

      const lines = $$('.bless-line', scene);
      const t = CONFIG.timing;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        line.classList.add('is-shown');
        follow(line);
        if (line.classList.contains('bless-signature')) {
          const c = centerOf(line);
          FX.sparkles({ x: c.x, y: c.y, count: 18, radius: 90 });
        }
        const len = line.textContent.trim().length;
        await wait(pace(clamp(t.blessingMin + len * t.blessingPerChar, t.blessingMin, t.blessingMax)));
      }

      // The End — the lights dim gently and a few golden particles remain
      await wait(pace(2200));
      theEnd.classList.add('is-shown');
      follow(theEnd);
      document.body.classList.add('is-ending');
      FX.setAmbient({ dust: 12 });
    }

    return { enter };
  })();

  /* ===================================================================
     11. SCENE MANAGER — only one scene is ever active
     =================================================================== */
  const Scenes = (() => {
    const DEF = {
      countdown: { el: '#scene-countdown', mood: 'midnight', ambient: { stars: 130, dust: 10 }, focus: '#cd-title',
                   enter: () => Countdown.enter(), leave: () => Countdown.leave() },
      reveal:    { el: '#scene-reveal', mood: 'burgundy', ambient: { dust: 26, petals: 14 }, focus: '#reveal-title',
                   enter: () => Reveal.enter() },
      letter:    { el: '#scene-letter', mood: 'candle', ambient: { dust: 18, petals: 4 }, focus: '#letter-heading',
                   enter: () => Letter.enter() },
      gallery:   { el: '#scene-gallery', mood: 'velvet', ambient: { dust: 14, petals: 5 }, focus: '#gallery-heading',
                   enter: () => Gallery.enter() },
      cakeIntro: { el: '#scene-cake', stage: 'intro', mood: 'candle', ambient: { dust: 16, hearts: 5 }, focus: '#cake-heading-intro',
                   enter: () => Cake.enterIntro() },
      candles:   { el: '#scene-cake', stage: 'candles', mood: 'candle', ambient: { dust: 10, hearts: 3 }, focus: '#cake-heading-candles',
                   enter: () => Cake.enterCandles() },
      cutting:   { el: '#scene-cake', stage: 'cutting', mood: 'burgundy', ambient: { dust: 18, hearts: 6, petals: 4 }, focus: '#cake-heading-cutting',
                   enter: () => Cake.enterCutting() },
      finale:    { el: '#scene-finale', mood: 'gold', ambient: { dust: 30, petals: 12, hearts: 8 }, focus: '#finale-title',
                   enter: () => Finale.enter() }
    };
    let current = null;
    let busy = false;

    function init() {
      $$('.scene').forEach((s) => { s.inert = true; });
    }

    /** Moves to a scene. Returns false if a transition is already running. */
    async function go(name, opts = {}) {
      const next = DEF[name];
      if (!next || busy || name === current) return false;
      busy = true;
      try {
        const prev = current ? DEF[current] : null;
        const nextEl = $(next.el);
        const prevEl = prev ? $(prev.el) : null;
        if (prev && prev.leave) prev.leave();

        document.body.dataset.mood = next.mood;
        document.body.dataset.scene = name;
        FX.setAmbient(next.ambient);

        if (prevEl && prevEl === nextEl) {
          // Same section, new stage (the cake scenes)
          nextEl.dataset.stage = next.stage;
        } else {
          if (prevEl) {
            prevEl.classList.add('is-leaving');
            prevEl.classList.remove('is-active');
            prevEl.inert = true;
            if (!opts.instant) await wait(pace(950));
            prevEl.classList.remove('is-leaving');
          }
          if (next.stage) nextEl.dataset.stage = next.stage;
          nextEl.scrollTop = 0;
          nextEl.inert = false;
          nextEl.classList.add('is-active');
        }
        if (next.stage) nextEl.setAttribute('aria-labelledby', next.focus.slice(1));
        current = name;

        const focusEl = $(next.focus);
        if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 450);
        if (next.enter) next.enter();
        return true;
      } catch (err) {
        console.error('[Anniversary] Scene change failed:', err);
        return false;
      } finally {
        busy = false;
      }
    }

    return { init, go, current: () => current, has: (n) => Object.prototype.hasOwnProperty.call(DEF, n) };
  })();

  /* ===================================================================
     12. BOOT
     =================================================================== */
  function boot() {
    safely('Particles', () => FX.init());
    safely('Music', () => Music.init());
    safely('Countdown', () => Countdown.init());
    safely('Reveal', () => Reveal.init());
    safely('Letter', () => Letter.init());
    safely('Gallery', () => Gallery.init());
    safely('Cake', () => Cake.init());
    safely('Scenes', () => Scenes.init());

    // Testing helper: ?scene=gallery (etc.) jumps straight to a scene
    const params = new URLSearchParams(window.location.search);
    let jump = params.get('scene');
    if (jump === 'cake') jump = 'cakeIntro';
    if (jump && jump !== 'countdown' && Scenes.has(jump)) {
      console.info(`[Anniversary] Test mode: starting at "${jump}". Music begins on your first click or tap.`);
      document.addEventListener('pointerdown', () => Music.start(), { once: true });
      Scenes.go(jump, { instant: true });
    } else {
      Scenes.go('countdown', { instant: true });
    }
  }

  boot();
})();
