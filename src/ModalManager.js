import gsap from 'gsap';
import { ASSETS, CONTENT, DROP, VIDEO } from './config.js';

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
    const vt = this.root.querySelector('[data-jgd-video-title]');
    if (vt) vt.textContent = VIDEO.title;

    this.root.querySelectorAll('[data-jgd-athlete]').forEach((el) => {
      el.innerHTML = this._athleteHTML(CONTENT[el.dataset.jgdAthlete], el.classList.contains('jgd-athlete--drawer'));
      el.querySelectorAll('[data-jgd-open]').forEach((b) => b.addEventListener('click', () => this.open(b.dataset.jgdOpen)));
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
        <button type="button" class="jgd-btn jgd-btn--ghost" data-jgd-open="video">▶ Watch the Game Day short</button>
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
  open(type, { onClose } = {}) {
    if (this.active) this.close({ silent: true });
    const el = this.modals[type];
    if (!el) return;
    this.active = type;
    this.onClose = onClose || null;
    this.lastFocus = document.activeElement;
    el.hidden = false;
    this.root.classList.add('jgd-has-modal');

    if (type === 'video') this._startVideo();

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
  _startVideo() {
    const el = this.modals.video;
    const iframe = el.querySelector('[data-jgd-video]');
    const fallback = el.querySelector('[data-jgd-video-fallback]');
    const id = VIDEO.youtubeId;
    const valid = /^[\w-]{11}$/.test(id);
    fallback.hidden = valid;
    iframe.hidden = !valid;
    if (!valid) return;
    const origin = encodeURIComponent(window.location.origin);
    // Muted autoplay is the only autoplay mobile browsers allow; viewers unmute in the player.
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&start=${VIDEO.start || 0}&origin=${origin}`;
    iframe.title = VIDEO.title;
  }

  _stopVideo() {
    const iframe = this.modals.video.querySelector('[data-jgd-video]');
    const cmd = (func) => iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
    try {
      cmd('mute');
      cmd('stopVideo');
    } catch {
      /* cross-origin player not ready */
    }
    // Unloading the iframe guarantees audio stops on every browser.
    setTimeout(() => iframe.removeAttribute('src'), 320);
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
