import * as THREE from 'three';

// Canvas-drawn textures: immediate, zero-network fallbacks for every surface.

export const FONT_SCRIPT = "'Yellowtail', 'Brush Script MT', cursive";
export const FONT_BLOCK = "'Anton', 'Impact', 'Arial Black', sans-serif";
export const FONT_SERIF = "'Cinzel', 'Times New Roman', serif";

let maxAniso = 4;
export function setMaxAnisotropy(v) {
  maxAniso = Math.min(8, v);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function canvasTexture(canvas, { repeat, srgb = true, wrap = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (wrap || repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

// --- Brand marks ------------------------------------------------------------

export function jeeterWordmark({ w = 1024, h = 384, bg = null, color = '#ffffff', stroke = null, size = 0.62 } = {}) {
  const [c, g] = makeCanvas(w, h);
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  }
  g.font = `${Math.floor(h * size)}px ${FONT_SCRIPT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (stroke) {
    g.lineWidth = h * 0.05;
    g.strokeStyle = stroke;
    g.strokeText('Jeeter', w / 2, h / 2);
  }
  g.fillStyle = color;
  g.fillText('Jeeter', w / 2, h / 2);
  return canvasTexture(c);
}

export function textPanel(lines, {
  w = 512, h = 256, bg = '#1f3fa8', color = '#fff', font = FONT_BLOCK, border = null, gradient = null,
} = {}) {
  const [c, g] = makeCanvas(w, h);
  if (gradient) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gradient.forEach((col, i) => gr.addColorStop(i / (gradient.length - 1), col));
    g.fillStyle = gr;
  } else g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = Math.max(4, w * 0.02);
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  const total = lines.reduce((s, l) => s + l.size, 0);
  let y = (h - total * h) / 2;
  for (const l of lines) {
    const px = l.size * h;
    g.font = `${l.weight || ''} ${Math.floor(px * 0.86)}px ${l.font || font}`;
    g.fillStyle = l.color || color;
    g.fillText(l.text, w / 2, y + px / 2, w * 0.92);
    y += px;
  }
  return canvasTexture(c);
}

// Fallback logo when a remote logo fails to load (CORS, offline, 404).
export function brandFallbackLogo(name, color = '#ffffff', bg = '#111') {
  const isScript = name === 'Highsman' || name === 'Dodi' || name === 'Jeeter';
  const [c, g] = makeCanvas(512, 512);
  g.fillStyle = bg;
  g.beginPath();
  g.arc(256, 256, 250, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = isScript ? `150px ${FONT_SCRIPT}` : `110px ${FONT_BLOCK}`;
  g.fillText(name, 256, 266, 440);
  return canvasTexture(c);
}

// Coin face: logo image composited on a metallic disc.
export function coinFace(image, { rim = '#c9a25a', bg = '#0e0b1c', label = null } = {}) {
  const [c, g] = makeCanvas(512, 512);
  const gr = g.createRadialGradient(200, 180, 40, 256, 256, 256);
  gr.addColorStop(0, '#fff6d8');
  gr.addColorStop(0.5, rim);
  gr.addColorStop(1, '#5a4120');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(256, 256, 256, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = bg;
  g.beginPath();
  g.arc(256, 256, 222, 0, Math.PI * 2);
  g.fill();
  if (image) {
    const s = Math.min(340 / image.width, 340 / image.height);
    const iw = image.width * s;
    const ih = image.height * s;
    g.drawImage(image, 256 - iw / 2, 256 - ih / 2, iw, ih);
  } else if (label) {
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `150px ${FONT_SCRIPT}`;
    g.fillText(label, 256, 266, 400);
  }
  return canvasTexture(c);
}

// --- Architecture -------------------------------------------------------------

export function brickTexture({ w = 512, h = 512, base = '#8a3b26', mortar = '#c9b8a6', windows = true, arch = true, glow = '#ffcf7a' } = {}) {
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = mortar;
  g.fillRect(0, 0, w, h);
  const bw = 32;
  const bh = 12;
  for (let y = 0, row = 0; y < h; y += bh, row++) {
    for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
      const l = rand(-12, 12);
      g.fillStyle = shade(base, l);
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  if (windows) {
    const cols = 4;
    const ww = w / cols;
    for (let i = 0; i < cols; i++) {
      for (let r = 0; r < 2; r++) {
        const x = i * ww + ww * 0.2;
        const y = r * (h / 2) + h * 0.08;
        const wwid = ww * 0.6;
        const whei = h * 0.32;
        g.fillStyle = '#2b1e17';
        g.beginPath();
        if (arch) {
          g.moveTo(x, y + whei);
          g.lineTo(x, y + wwid / 2);
          g.arc(x + wwid / 2, y + wwid / 2, wwid / 2, Math.PI, 0);
          g.lineTo(x + wwid, y + whei);
        } else g.rect(x, y, wwid, whei);
        g.closePath();
        g.fill();
        const lit = Math.random() > 0.25;
        g.fillStyle = lit ? glow : '#3a4a5c';
        g.globalAlpha = lit ? 0.85 : 0.9;
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = '#1a1310';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x + wwid / 2, y);
        g.lineTo(x + wwid / 2, y + whei);
        g.moveTo(x, y + whei * 0.55);
        g.lineTo(x + wwid, y + whei * 0.55);
        g.stroke();
      }
    }
  }
  return canvasTexture(c, { wrap: true });
}

export function windowGridTexture({ w = 256, h = 512, frame = '#9fb4d6', glass = '#2a3a5a', lit = '#ffd89a', cols = 6, rows = 12, litChance = 0.55 } = {}) {
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = frame;
  g.fillRect(0, 0, w, h);
  const cw = w / cols;
  const rh = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      g.fillStyle = Math.random() < litChance ? lit : glass;
      g.fillRect(i * cw + 3, j * rh + 3, cw - 6, rh - 6);
    }
  }
  return canvasTexture(c, { wrap: true });
}

// Emissive map paired with windowGridTexture (only lit panes glow).
export function windowEmissiveTexture({ w = 256, h = 512, cols = 6, rows = 12, litChance = 0.55, lit = '#ffcf80' } = {}) {
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const cw = w / cols;
  const rh = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (Math.random() < litChance) {
        g.fillStyle = lit;
        g.globalAlpha = rand(0.35, 1);
        g.fillRect(i * cw + 3, j * rh + 3, cw - 6, rh - 6);
      }
    }
  }
  g.globalAlpha = 1;
  return canvasTexture(c, { wrap: true });
}

export function glassRoofTexture() {
  const [c, g] = makeCanvas(1024, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#dbe7ff');
  gr.addColorStop(1, '#8fa9de');
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 3;
  for (let x = 0; x <= 1024; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  g.strokeStyle = 'rgba(80,110,170,0.6)';
  for (let y = 0; y <= 256; y += 42) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(1024, y);
    g.stroke();
  }
  return canvasTexture(c, { wrap: true });
}

export function crowdTexture() {
  const [c, g] = makeCanvas(1024, 256);
  g.fillStyle = '#2b2350';
  g.fillRect(0, 0, 1024, 256);
  const palette = ['#5d3fb3', '#3b5bd6', '#ffffff', '#7e62d9', '#2a2a2a', '#c8c8ff', '#4b2a8c'];
  for (let y = 4; y < 256; y += 9) {
    for (let x = 2; x < 1024; x += 6) {
      g.fillStyle = palette[(Math.random() * palette.length) | 0];
      g.fillRect(x + rand(-1, 1), y + rand(-1, 1), 4, 5);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, y + 6, 1024, 2);
  }
  return canvasTexture(c, { wrap: true });
}

export function fieldTexture() {
  const [c, g] = makeCanvas(1024, 512);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = i % 2 ? '#3f8a35' : '#4a9a3e';
    g.fillRect((i * 1024) / 12, 0, 1024 / 12 + 1, 512);
  }
  // end zones
  g.fillStyle = '#4b2a8c';
  g.fillRect(0, 0, 90, 512);
  g.fillStyle = '#1f3fa8';
  g.fillRect(934, 0, 90, 512);
  g.strokeStyle = '#fff';
  g.lineWidth = 4;
  g.strokeRect(4, 24, 1016, 464);
  for (let i = 0; i <= 10; i++) {
    const x = 90 + (i * 844) / 10;
    g.beginPath();
    g.moveTo(x, 24);
    g.lineTo(x, 488);
    g.stroke();
  }
  g.fillStyle = '#fff';
  g.font = `bold 34px ${FONT_BLOCK}`;
  g.textAlign = 'center';
  ['10', '20', '30', '40', '50', '40', '30', '20', '10'].forEach((n, i) => {
    const x = 90 + ((i + 1) * 844) / 10;
    g.fillText(n, x, 90);
    g.fillText(n, x, 450);
  });
  g.save();
  g.translate(45, 256);
  g.rotate(-Math.PI / 2);
  g.font = `56px ${FONT_SCRIPT}`;
  g.fillText('Jeeter', 0, 18);
  g.restore();
  g.save();
  g.translate(979, 256);
  g.rotate(Math.PI / 2);
  g.font = `48px ${FONT_BLOCK}`;
  g.fillText('GAME DAY', 0, 16);
  g.restore();
  g.font = `110px ${FONT_SCRIPT}`;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillText('Jeeter', 512, 290);
  return canvasTexture(c);
}

export function ledRibbonTexture(text = 'JEETER  •  GAME DAY KICKOFF  •  HIGHER TOGETHER  •  ') {
  const [c, g] = makeCanvas(2048, 64);
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#2c1a6b');
  gr.addColorStop(1, '#141046');
  g.fillStyle = gr;
  g.fillRect(0, 0, 2048, 64);
  g.font = `40px ${FONT_BLOCK}`;
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  let x = 10;
  let i = 0;
  while (x < 2048) {
    g.fillStyle = i++ % 2 ? '#9fb8ff' : '#ffffff';
    g.fillText(text, x, 34);
    x += g.measureText(text).width;
  }
  return canvasTexture(c, { wrap: true });
}

export function screenTexture() {
  const [c, g] = makeCanvas(512, 288);
  const gr = g.createLinearGradient(0, 0, 512, 288);
  gr.addColorStop(0, '#1b1150');
  gr.addColorStop(1, '#3b1f8f');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 288);
  // stylised player silhouette
  g.fillStyle = 'rgba(160,140,255,0.55)';
  g.beginPath();
  g.ellipse(120, 120, 46, 54, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(60, 165, 120, 123);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = `52px ${FONT_SCRIPT}`;
  g.fillText('Jeeter', 350, 80);
  g.font = `70px ${FONT_BLOCK}`;
  g.fillText('GAME DAY', 350, 165);
  g.fillStyle = '#ffd34d';
  g.font = `44px ${FONT_BLOCK}`;
  g.fillText('KICK OFF', 350, 225);
  return canvasTexture(c);
}

export function bannerTexture({ top = 'Jeeter', lines = ['GAME', 'DAY', 'KICK OFF'], bg = ['#2a1a74', '#14105a'], number = null } = {}) {
  const [c, g] = makeCanvas(256, 640);
  const gr = g.createLinearGradient(0, 0, 0, 640);
  gr.addColorStop(0, bg[0]);
  gr.addColorStop(1, bg[1]);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 640);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  if (top) {
    g.font = `70px ${FONT_SCRIPT}`;
    g.fillText(top, 128, 100, 230);
  }
  if (number) {
    g.font = `220px ${FONT_BLOCK}`;
    g.fillText(number, 128, 420);
  }
  g.font = `76px ${FONT_BLOCK}`;
  lines.forEach((l, i) => {
    g.fillStyle = i === lines.length - 1 && lines.length > 1 ? '#ffd34d' : '#fff';
    g.fillText(l, 128, (number ? 520 : 260) + i * 90, 236);
  });
  return canvasTexture(c);
}

export function muralTexture() {
  const [c, g] = makeCanvas(1024, 512);
  g.fillStyle = '#e9e1d2';
  g.fillRect(0, 0, 1024, 512);
  // brushed paint texture
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 1024, Math.random() * 512, rand(10, 80), rand(2, 6));
  }
  // running back silhouette
  g.fillStyle = '#141414';
  g.save();
  g.translate(300, 270);
  g.rotate(-0.25);
  g.beginPath();
  g.ellipse(0, -140, 48, 56, 0, 0, Math.PI * 2); // helmet
  g.fill();
  g.beginPath();
  g.moveTo(-60, -90);
  g.lineTo(80, -90);
  g.lineTo(60, 60);
  g.lineTo(-40, 60);
  g.closePath();
  g.fill(); // torso
  g.lineWidth = 42;
  g.lineCap = 'round';
  g.strokeStyle = '#141414';
  g.beginPath();
  g.moveTo(-10, 50);
  g.lineTo(-120, 140);
  g.lineTo(-200, 120);
  g.moveTo(30, 50);
  g.lineTo(110, 150);
  g.lineTo(90, 240);
  g.moveTo(70, -60);
  g.lineTo(170, -20);
  g.moveTo(-50, -60);
  g.lineTo(-130, 0);
  g.stroke();
  g.fillStyle = '#6b3b1d';
  g.beginPath();
  g.ellipse(190, -20, 34, 20, 0.5, 0, Math.PI * 2); // ball
  g.fill();
  g.restore();
  g.fillStyle = '#141414';
  g.font = `260px ${FONT_BLOCK}`;
  g.textAlign = 'center';
  g.fillText('24', 760, 250);
  g.font = `120px ${FONT_BLOCK}`;
  g.fillText('BEAST', 760, 370);
  g.fillText('MODE', 760, 480);
  return canvasTexture(c);
}

export function neonSignTexture(text = 'BEAST QUAKE', color = '#7dff4f') {
  const [c, g] = makeCanvas(1024, 256);
  g.fillStyle = '#05140a';
  g.fillRect(0, 0, 1024, 256);
  g.font = `150px ${FONT_BLOCK}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 30;
  g.fillStyle = color;
  g.fillText(text, 512, 132, 980);
  g.shadowBlur = 0;
  g.fillStyle = '#eaffdf';
  g.fillText(text, 512, 132, 980);
  return canvasTexture(c);
}

export function stoneTexture(base = '#d8ccb6') {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = (y / 32) % 2 ? -32 : 0; x < 256; x += 64) {
      g.fillStyle = shade(base, rand(-10, 10));
      g.fillRect(x + 1, y + 1, 62, 30);
    }
  }
  return canvasTexture(c, { wrap: true });
}

export function woodTexture(base = '#7a4f2c') {
  const [c, g] = makeCanvas(256, 256);
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = shade(base, rand(-14, 14));
    g.fillRect(0, y, 256, 15);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, y + 15, 256, 1);
  }
  return canvasTexture(c, { wrap: true });
}

export function holoCardTexture(title, number, hue) {
  const [c, g] = makeCanvas(256, 356);
  const gr = g.createLinearGradient(0, 0, 256, 356);
  gr.addColorStop(0, `hsl(${hue},80%,60%)`);
  gr.addColorStop(1, `hsl(${hue + 60},70%,30%)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 356);
  g.strokeStyle = '#ffe9b0';
  g.lineWidth = 10;
  g.strokeRect(8, 8, 240, 340);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.textAlign = 'center';
  g.font = `120px ${FONT_BLOCK}`;
  g.fillText(number, 128, 210);
  g.font = `34px ${FONT_SCRIPT}`;
  g.fillText(title, 128, 300);
  return canvasTexture(c);
}

// Facade tile for the city filler: light wall, inset windows, sparse warm lights.
// Paired emissive map shares the same layout (seeded per pane).
export function facadeTextures({ cols = 6, rows = 8, size = 256, litChance = 0.28 } = {}) {
  const [c, g] = makeCanvas(size, size);
  const [ce, ge] = makeCanvas(size, size);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, size, size);
  const cw = size / cols;
  const rh = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw + cw * 0.18;
      const y = j * rh + rh * 0.22;
      const w = cw * 0.64;
      const h = rh * 0.56;
      const lit = Math.random() < litChance;
      g.fillStyle = lit ? '#f6dcae' : `rgb(${110 + rand(-12, 12)},${128 + rand(-12, 12)},${150 + rand(-12, 12)})`;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, y + h, w, rh * 0.06);
      if (lit) {
        ge.fillStyle = `rgba(255,205,140,${rand(0.4, 0.9)})`;
        ge.fillRect(x, y, w, h);
      }
    }
  }
  return [canvasTexture(c, { wrap: true }), canvasTexture(ce, { wrap: true })];
}

// --- Ground / terrain painting --------------------------------------------------

export const GROUND_BOUNDS = { minX: -170, maxX: 170, minZ: -170, maxZ: 110 };

export function groundTexture(paint) {
  const W = 2048;
  const H = Math.round((W * (GROUND_BOUNDS.maxZ - GROUND_BOUNDS.minZ)) / (GROUND_BOUNDS.maxX - GROUND_BOUNDS.minX));
  const [c, g] = makeCanvas(W, H);
  const sx = W / (GROUND_BOUNDS.maxX - GROUND_BOUNDS.minX);
  const sz = H / (GROUND_BOUNDS.maxZ - GROUND_BOUNDS.minZ);
  const P = (x, z) => [(x - GROUND_BOUNDS.minX) * sx, (z - GROUND_BOUNDS.minZ) * sz];
  paint(g, P, sx, W, H);
  // fine noise for material breakup
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return canvasTexture(c);
}

export function skyTexture() {
  const [c, g] = makeCanvas(16, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#6f9fd8');
  gr.addColorStop(0.42, '#a9c8ea');
  gr.addColorStop(0.5, '#f4d9b4');
  gr.addColorStop(0.56, '#f7c79a');
  gr.addColorStop(1, '#f7c79a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 16, 512);
  return canvasTexture(c);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}
