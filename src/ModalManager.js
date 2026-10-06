import gsap from 'gsap';
import { ASSETS, CONTENT, DROP, VIDEOS } from './config.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BASE = import.meta.env.BASE_URL;

/**
 * DOM overlays for every district. One modal open at a time; ESC, backdrop
 * and close buttons dismiss; focus is trapped and restored.
 *  - video:    Game Day 2026 Official Short (YouTube); stop + unload on close
 *  - highsman / primitiv: athlete feature (strain, 2G XL vape, collectible card)
 *  - dodi:     the same feature as a slide-out drawer
 *  - vault:    the three real collectible cards with holo tilt + flip
 * All copy comes from config.js (sourced from the live drop page).
 */
export class ModalManager {
  constructor(root, { reducedMotion = false } = {}) {
    this.root = root;
    this.reducedMotion = reducedMotion;
    this.active = null;
    this.onClose = null;
    this.lastFocus = null;
    this.modals = {};
    root.querySelectorAll('[data-jgd-modal]').forEach((el) => {
      this.modals[el.dataset.jgdModal] = el;
      el.querySelectorAll('[data-jgd-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    });
    this._key = (e) => {
      if (!this.active) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'Tab') this._trap(e);
    };
    document.addEventListener('keydown', this._key);
    this._fill();
  }

  get isOpen() {
    return !!this.active;
  }

  // --- content -------------------------------------------------------------
  _fill() {
    this.root.querySelectorAll('[data-jgd-logo]').forEach((img) => {
      img.src = BASE + ASSETS.logos[img.dataset.jgdLogo];
      img.addEventListener('error', () => img.remove(), { once: true });
    });

    this.root.querySelectorAll('[data-jgd-athlete]').forEach((el) => {
      el.innerHTML = this._athleteHTML(CONTENT[el.dataset.jgdAthlete], el.classList.contains('jgd-athlete--drawer'));
      el.querySelectorAll('[data-jgd-open]').forEach((b) => b.addEventListener('click', () => this.open(b.dataset.jgdOpen, { clip: b.dataset.jgdClip })));
      el.querySelectorAll('.jgd-card').forEach((card) => this._bindCard(card));
    });

    // Vault: the real collectible cards
    const v = CONTENT.vault;
    const vault = this.modals.vault;
    vault.querySelector('[data-jgd-field="kicker"]').textContent = v.kicker;
    vault.querySelector('[data-jgd-field="title"]').textContent = v.title;
    vault.querySelector('[data-jgd-field="subtitle"]').textContent = v.subtitle;
    const cards = vault.querySelector('[data-jgd-cards]');
    cards.innerHTML =
      v.cards.map((id, i) => `<div class="jgd-card-wrap" style="--i:${i}">${this._cardHTML(CONTENT[id])}<span class="jgd-card-wrap__name">${esc(CONTENT[id].athlete)}</span></div>`).join('') +
      `<p class="jgd-locker__foot">${esc(v.footer)} <span>${esc(v.hint)}</span></p>`;
    cards.querySelectorAll('.jgd-card').forEach((card) => this._bindCard(card));
  }

  _cardHTML(a) {
    return `<button type="button" class="jgd-card" aria-label="${esc(a.athlete)} collectible card, tap to flip">
      <div class="jgd-card__face jgd-card__front"><img src="${BASE + a.card}" alt="${esc(a.athlete)} Game Day Kick Off collectible card" loading="lazy" draggable="false" /><span class="jgd-card__holo"></span><span class="jgd-card__glare"></span></div>
      <div class="jgd-card__face jgd-card__back"><img src="${BASE}brand/jeeter-logo.svg" alt="" /><span>JEETER COLLECTOR SERIES</span><small>${esc(a.athlete)} · ${esc(a.strain)}</small><span class="jgd-card__holo"></span></div>
    </button>`;
  }

  _athleteHTML(a, drawer) {
    const tags = [a.type, a.format, '1G All-in-One · CA exclusive'].map((t) => `<li>${esc(t)}</li>`).join('');
    const flavor = a.flavor.map((f) => `<li>${esc(f)}</li>`).join('');
    const ctas = `<div class="jgd-ctas">
        <a class="jgd-btn jgd-btn--solid" href="${DROP.storesUrl}" target="_blank" rel="noopener">Find a store near you</a>
        <button type="button" class="jgd-btn jgd-btn--ghost" data-jgd-open="video" data-jgd-clip="${a.brand}">▶ Watch ${esc(a.athlete.split(' ')[0])}’s short</button>
      </div>`;
    const card = `<div class="jgd-pair">
        <div class="jgd-pair__card">${this._cardHTML(a)}</div>
        <div class="jgd-pair__text"><span class="jgd-kicker">Collectible card</span><b>Pairs with the ${esc(a.athlete)} Collectible Card</b>
        <p>Scan to unlock it in the Jeeter Collector Series.</p>
        <button type="button" class="jgd-link" data-jgd-open="vault">See all three cards →</button></div>
      </div>`;
    const head = `<img class="jgd-feature__logo" src="${BASE + ASSETS.logos[a.brand]}" alt="" />
        <span class="jgd-kicker">${esc(a.athlete)} · ${esc(a.badge)}</span>
        <h2>${esc(a.strain)} <small>(${esc(a.type[0])})</small></h2>
        <ul class="jgd-tags">${tags}</ul>`;
    if (drawer) {
      return `<div class="jgd-drawer__head">${head}</div>
        <div class="jgd-drawer__product"><img src="${BASE + a.product}" alt="${esc(a.strain)} ${esc(a.format)}" /></div>
        <p class="jgd-copy">${esc(a.copy)}</p>
        <ul class="jgd-flavor">${flavor}</ul>
        ${card}${ctas}`;
    }
    return `<div class="jgd-feature__hero"><img class="jgd-feature__product" src="${BASE + a.product}" alt="${esc(a.strain)} ${esc(a.format)}" /></div>
      <div class="jgd-feature__body">
        ${head}
        <p class="jgd-copy">${esc(a.copy)}</p>
        <ul class="jgd-flavor">${flavor}</ul>
        ${card}${ctas}
      </div>`;
  }

  // Pointer tilt + holographic sheen driven by CSS variables.
  _bindCard(card) {
    const wrap = card.parentElement;
    const set = (x, y) => {
      card.style.setProperty('--rx', `${(0.5 - y) * 26}deg`);
      card.style.setProperty('--ry', `${(x - 0.5) * 32}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    };
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      wrap.classList.add('is-tilting');
      set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    wrap.addEventListener('pointerleave', () => {
      wrap.classList.remove('is-tilting');
      set(0.5, 0.5);
    });
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  }

  // --- open / close ----------------------------------------------------------
  /** clip: key into VIDEOS for the video modal (default: stadium film). */
  open(type, { onClose, clip = 'stadium' } = {}) {
    if (this.active) this.close({ silent: true });
    const el = this.modals[type];
    if (!el) return;
    this.active = type;
    this.onClose = onClose || null;
    this.lastFocus = document.activeElement;
    el.hidden = false;
    this.root.classList.add('jgd-has-modal');

    if (type === 'video') this._startVideo(VIDEOS[clip] || VIDEOS.stadium);

    const panel = el.querySelector('.jgd-modal__panel');
    const backdrop = el.querySelector('.jgd-modal__backdrop');
    const d = this.reducedMotion ? 0 : 1;
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.35 * d });
    if (type === 'dodi') {
      const fromBottom = window.matchMedia('(max-width: 640px)').matches;
      gsap.fromTo(panel, fromBottom ? { yPercent: 100, xPercent: 0 } : { xPercent: 100, yPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.55 * d, ease: 'power3.out' });
    } else {
      gsap.fromTo(panel, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5 * d, ease: 'power3.out' });
    }
    if (type === 'vault') {
      gsap.fromTo(el.querySelectorAll('.jgd-card-wrap'), { opacity: 0, y: 60, rotateY: -90 }, { opacity: 1, y: 0, rotateY: 0, duration: 0.8 * d, stagger: 0.12, ease: 'back.out(1.4)', clearProps: 'transform' });
    }
    requestAnimationFrame(() => el.querySelector('.jgd-close')?.focus({ preventScroll: true }));
  }

  close({ silent = false } = {}) {
    const type = this.active;
    if (!type) return;
    const el = this.modals[type];
    this.active = null;
    if (type === 'video') this._stopVideo();

    const panel = el.querySelector('.jgd-modal__panel');
    const backdrop = el.querySelector('.jgd-modal__backdrop');
    const done = () => {
      el.hidden = true;
      gsap.set([panel, backdrop], { clearProps: 'all' });
      if (!this.active) this.root.classList.remove('jgd-has-modal');
    };
    if (silent || this.reducedMotion) done();
    else {
      gsap.to(backdrop, { opacity: 0, duration: 0.3 });
      if (type === 'dodi') {
        const toBottom = window.matchMedia('(max-width: 640px)').matches;
        gsap.to(panel, { ...(toBottom ? { yPercent: 100 } : { xPercent: 100 }), duration: 0.4, ease: 'power2.in', onComplete: done });
      } else gsap.to(panel, { opacity: 0, y: 20, scale: 0.97, duration: 0.3, ease: 'power2.in', onComplete: done });
    }
    const cb = this.onClose;
    this.onClose = null;
    cb?.(type);
    if (!silent) this.lastFocus?.focus?.({ preventScroll: true });
  }

  // --- video -------------------------------------------------------------------
  _startVideo(video) {
    const el = this.modals.video;
    el.classList.toggle('is-vertical', !!video.vertical);
    el.querySelector('[data-jgd-video-title]').textContent = video.title;
    const iframe = el.querySelector('[data-jgd-video]');
    const fallback = el.querySelector('[data-jgd-video-fallback]');
    const unmute = el.querySelector('[data-jgd-unmute]');
    const id = video.id;
    const valid = /^[\w-]{11}$/.test(id);
    fallback.hidden = valid;
    iframe.hidden = !valid;
    el.querySelector('[data-jgd-yt]').href = video.vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}${video.start ? `&t=${video.start}s` : ''}`;
    if (!valid) return;
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1', // muted autoplay is the only autoplay every browser allows
      playsinline: '1',
      rel: '0',
      enablejsapi: '1',
      start: String(video.start || 0),
    });
    if (video.vertical) {
      // shorts loop like they do on YouTube
      params.set('loop', '1');
      params.set('playlist', id);
    }
    // sandboxed / file hosts report origin "null"; YouTube rejects that value
    if (/^https?:/.test(window.location.origin)) params.set('origin', window.location.origin);
    iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
    // Unmute on request (user gesture inside our page drives the player via the IFrame API)
    unmute.hidden = false;
    unmute.onclick = () => {
      this._ytCommand('unMute');
      this._ytCommand('setVolume', [100]);
      this._ytCommand('playVideo');
      unmute.hidden = true;
    };
    // handshake so the player starts emitting events and accepts commands
    iframe.onload = () => iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'jgd' }), '*');
  }

  _ytCommand(func, args = []) {
    const iframe = this.modals.video.querySelector('[data-jgd-video]');
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }

  _stopVideo() {
    const el = this.modals.video;
    el.querySelector('[data-jgd-unmute]').hidden = true;
    // Unloading the player is the only stop that is instant and reliable everywhere.
    el.querySelector('[data-jgd-video]').removeAttribute('src');
  }

  _trap(e) {
    const el = this.modals[this.active];
    const f = [...el.querySelectorAll('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.hidden && n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
