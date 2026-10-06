import gsap from 'gsap';
import { ASSETS, CONTENT, VIDEO } from './config.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * DOM overlays for every district. One modal open at a time; ESC, backdrop
 * and close buttons dismiss; focus is trapped and restored.
 *  - video:    YouTube embed, autoplays muted; mute + stop + unload on close
 *  - highsman: athlete bio, highlights, soundbite players
 *  - primitiv: formulation tabs with animated terpene bars
 *  - dodi:     slide-out commerce drawer with external checkout links
 *  - vault:    CSS-3D holographic collectible cards (tilt, flip, auto-rotate)
 */
export class ModalManager {
  constructor(root, { reducedMotion = false } = {}) {
    this.root = root;
    this.reducedMotion = reducedMotion;
    this.active = null;
    this.onClose = null;
    this.lastFocus = null;
    this.audio = null;
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
    const setFields = (el, data) => {
      el.querySelectorAll('[data-jgd-field]').forEach((f) => {
        const v = data[f.dataset.jgdField];
        if (v != null) f.textContent = v;
      });
      const cta = el.querySelector('[data-jgd-cta]');
      if (cta && data.cta) {
        cta.textContent = data.cta.label;
        cta.href = data.cta.href;
      }
    };
    this.root.querySelectorAll('[data-jgd-logo]').forEach((img) => {
      const src = ASSETS.logos[img.dataset.jgdLogo];
      img.src = src;
      img.addEventListener('error', () => img.remove(), { once: true });
    });

    // Highsman
    const hs = this.modals.highsman;
    setFields(hs, CONTENT.highsman);
    hs.querySelector('[data-jgd-highlights]').innerHTML = CONTENT.highsman.highlights
      .map((h) => `<div class="jgd-stat"><b>${esc(h.stat)}</b><span>${esc(h.label)}</span></div>`)
      .join('');
    const sb = hs.querySelector('[data-jgd-soundbites]');
    sb.innerHTML = CONTENT.highsman.soundbites
      .map(
        (s, i) => `<li><button type="button" class="jgd-sound__btn" data-i="${i}" ${s.src ? '' : 'disabled'} aria-label="Play ${esc(s.title)}">
          <span class="jgd-sound__icon" aria-hidden="true"></span></button>
          <div class="jgd-sound__meta"><b>${esc(s.title)}</b><span>${s.src ? 'Tap to play' : 'Dropping on game day'}</span></div>
          <div class="jgd-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div></li>`,
      )
      .join('');
    sb.querySelectorAll('.jgd-sound__btn').forEach((b) => b.addEventListener('click', () => this._toggleSound(b)));

    // PRIMITIV
    const pr = this.modals.primitiv;
    setFields(pr, CONTENT.primitiv);
    const tabs = pr.querySelector('[data-jgd-tabs]');
    tabs.innerHTML = CONTENT.primitiv.formulations
      .map((f, i) => `<button type="button" role="tab" class="jgd-tab" data-i="${i}" aria-selected="${i === 0}">${esc(f.name)}</button>`)
      .join('');
    tabs.querySelectorAll('.jgd-tab').forEach((t) => t.addEventListener('click', () => this._formulation(+t.dataset.i)));

    // Dodi
    const dd = this.modals.dodi;
    setFields(dd, CONTENT.dodi);
    dd.querySelector('[data-jgd-products]').innerHTML = CONTENT.dodi.products
      .map(
        (p) => `<article class="jgd-product" style="--h:${p.hue}">
          <div class="jgd-product__art"><img src="${esc(ASSETS.logos.dodi)}" alt="" loading="lazy" onerror="this.remove()"><span>${esc(p.meta)}</span></div>
          <div class="jgd-product__info"><h4>${esc(p.name)}</h4><div class="jgd-product__row"><b>${esc(p.price)}</b>
          <a class="jgd-btn jgd-btn--neon" href="${esc(p.href)}" target="_blank" rel="noopener">Shop now</a></div></div>
        </article>`,
      )
      .join('');

    // Vault
    const vt = this.modals.vault;
    setFields(vt, CONTENT.vault);
    const cards = vt.querySelector('[data-jgd-cards]');
    cards.innerHTML = CONTENT.vault.cards
      .map(
        (c, i) => `<div class="jgd-card-wrap" style="--i:${i}"><button type="button" class="jgd-card" style="--h:${c.hue}" aria-label="${esc(c.name)} collectible card, tap to flip">
          <div class="jgd-card__face jgd-card__front">
            <span class="jgd-card__brand">${esc(c.brand)}</span>
            <span class="jgd-card__num">${esc(c.number)}</span>
            <span class="jgd-card__name">${esc(c.name)}</span>
            <span class="jgd-card__rarity">${esc(c.rarity)}</span>
            <span class="jgd-card__holo"></span><span class="jgd-card__glare"></span>
          </div>
          <div class="jgd-card__face jgd-card__back"><span class="jgd-wordmark">Jeeter</span><span>THE VAULT · ${String(i + 1).padStart(2, '0')}/${CONTENT.vault.cards.length}</span><span class="jgd-card__holo"></span></div>
        </button></div>`,
      )
      .join('');
    cards.querySelectorAll('.jgd-card').forEach((card) => this._bindCard(card));
  }

  _formulation(i) {
    const pr = this.modals.primitiv;
    const f = CONTENT.primitiv.formulations[i];
    pr.querySelectorAll('.jgd-tab').forEach((t) => t.setAttribute('aria-selected', String(+t.dataset.i === i)));
    pr.querySelector('[data-jgd-mood]').innerHTML = `<b>${esc(f.name)}</b><span>${esc(f.mood)}</span>`;
    const bars = pr.querySelector('[data-jgd-bars]');
    bars.innerHTML = Object.entries(f.terpenes)
      .map(([k, v]) => `<div class="jgd-bar"><span>${esc(k)}</span><div class="jgd-bar__track"><i data-v="${v}"></i></div><em>${v}</em></div>`)
      .join('');
    bars.querySelectorAll('i').forEach((el, n) => {
      gsap.fromTo(el, { width: '0%' }, { width: `${el.dataset.v}%`, duration: this.reducedMotion ? 0 : 0.9, delay: n * 0.08, ease: 'power3.out' });
    });
  }

  _toggleSound(btn) {
    const s = CONTENT.highsman.soundbites[+btn.dataset.i];
    const li = btn.closest('li');
    const wasPlaying = li.classList.contains('is-playing');
    this._stopSound();
    if (wasPlaying || !s.src) return;
    this.audio = new Audio(s.src);
    this.audio.addEventListener('ended', () => this._stopSound());
    this.audio.play().catch(() => this._stopSound());
    li.classList.add('is-playing');
  }

  _stopSound() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.modals.highsman.querySelectorAll('li.is-playing').forEach((l) => l.classList.remove('is-playing'));
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
    if (type === 'primitiv') this._formulation(0);

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
    if (type === 'highsman') this._stopSound();

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
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
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
