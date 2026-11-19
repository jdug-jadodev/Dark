/** Texturas generadas por código: planetas, anillos, nebulosas, galaxias, agujero negro, cuásar, portal. */
import { pick, rand } from '../core/util.js';
export function nebTex(h) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = rand(70, 186),
      y = rand(70, 186),
      r = rand(40, 110),
      hh = h + rand(-35, 35);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'hsla(' + hh + ',80%,60%,.35)');
    gr.addColorStop(1, 'hsla(' + hh + ',80%,40%,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
/* -- planetas generados al azar -- */
function blob(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * 6.283,
      rr = r * rand(0.6, 1.2),
      px = x + Math.cos(a) * rr * 1.6,
      py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.fill();
}
export function planetTex(kind) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d'),
    h = rand(0, 360);
  if (kind === 'gas') {
    for (let y = 0; y < 256; y++) {
      const l = 45 + Math.sin(y * 0.09) * 10 + Math.sin(y * 0.31) * 5 + rand(-3, 3);
      g.fillStyle = 'hsl(' + (h + Math.sin(y * 0.05) * 20) + ',50%,' + l + '%)';
      g.fillRect(0, y, 512, 1);
    }
    g.fillStyle = 'hsla(' + (h + 25) + ',70%,70%,.75)';
    g.beginPath();
    g.ellipse(rand(120, 400), rand(90, 170), 34, 15, 0, 0, 7);
    g.fill();
  } else if (kind === 'earth') {
    g.fillStyle = '#1d4f9a';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = pick(['#3f8f4a', '#5a9a3c', '#8a7a4a', '#2f7a3f']);
      blob(g, rand(0, 512), rand(30, 226), rand(15, 55));
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.ellipse(rand(0, 512), rand(0, 256), rand(20, 60), rand(3, 8), rand(-0.3, 0.3), 0, 7);
      g.fill();
    }
    g.fillStyle = '#eef6ff';
    g.fillRect(0, 0, 512, 12);
    g.fillRect(0, 244, 512, 12);
  } else if (kind === 'ice') {
    g.fillStyle = 'hsl(' + (195 + rand(-15, 15)) + ',45%,72%)';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = 'rgba(255,255,255,' + rand(0.2, 0.6) + ')';
      g.lineWidth = rand(1, 4);
      g.beginPath();
      const y = rand(0, 256);
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + rand(-30, 30), 340, y + rand(-30, 30), 512, y + rand(-10, 10));
      g.stroke();
    }
  } else if (kind === 'lava') {
    g.fillStyle = '#2a1410';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = 'rgba(255,' + Math.floor(rand(80, 170)) + ',40,' + rand(0.4, 0.9) + ')';
      g.lineWidth = rand(1, 3);
      g.beginPath();
      let x = rand(0, 512),
        y = rand(0, 256);
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += rand(-40, 40);
        y += rand(-25, 25);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else {
    g.fillStyle = 'hsl(' + h + ',18%,42%)';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = 'hsla(' + h + ',15%,' + rand(22, 60) + '%,.55)';
      g.beginPath();
      g.arc(rand(0, 512), rand(0, 256), rand(2, 16), 0, 7);
      g.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}
export function ringTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'),
    h = rand(20, 50);
  for (let r = 75; r < 128; r++) {
    g.strokeStyle = 'hsla(' + h + ',40%,' + rand(55, 80) + '%,' + rand(0.1, 0.7) + ')';
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(128, 128, r, 0, 6.283);
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}
/* =====================================================================
   FONDO ESPACIAL de Aventura y Supervivencia + AGUJEROS NEGROS + NITRO
   ===================================================================== */
/* -- texturas del agujero negro -- */
export function bhDiskTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.33, 'rgba(0,0,0,0)');
  gr.addColorStop(0.36, 'rgba(255,250,230,1)');
  gr.addColorStop(0.5, 'rgba(255,190,90,.9)');
  gr.addColorStop(0.72, 'rgba(255,90,40,.45)');
  gr.addColorStop(1, 'rgba(120,20,60,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 140; i++) {
    const r = rand(48, 120),
      a = rand(0, 6.28);
    g.strokeStyle = 'rgba(255,' + Math.floor(rand(150, 230)) + ',120,' + rand(0.05, 0.25) + ')';
    g.lineWidth = rand(1, 3);
    g.beginPath();
    g.arc(128, 128, r, a, a + rand(0.3, 1.2));
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}
export function bhRingTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.47, 'rgba(255,255,255,0)');
  gr.addColorStop(0.55, 'rgba(255,245,225,1)');
  gr.addColorStop(0.63, 'rgba(255,170,90,.55)');
  gr.addColorStop(0.85, 'rgba(160,80,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
export function galaxyTex(h) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'),
    arms = pick([2, 2, 3]);
  g.globalCompositeOperation = 'lighter';
  for (let a = 0; a < arms; a++)
    for (let i = 0; i < 700; i++) {
      const q = i / 700,
        ang = (a * 6.283) / arms + q * 4.6 + rand(-0.25, 0.25),
        rad = q * 112 + rand(-6, 6);
      g.fillStyle = 'hsla(' + (h + q * 70) + ',70%,' + (78 - q * 30) + '%,' + (0.55 * (1 - q) + 0.08) + ')';
      const s = rand(0.8, 2.4);
      g.fillRect(128 + Math.cos(ang) * rad, 128 + Math.sin(ang) * rad, s, s);
    }
  const core = g.createRadialGradient(128, 128, 0, 128, 128, 40);
  core.addColorStop(0, 'rgba(255,245,220,.95)');
  core.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
/* cuásares: núcleo brillante con dos chorros de luz opuestos */
export function jetTex() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 256, 0, 0);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(0.25, 'rgba(150,200,255,.75)');
  v.addColorStop(1, 'rgba(90,120,255,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.5, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
export function portalTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  for (let a = 0; a < 5; a++) {
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i <= 80; i++) {
      const q = i / 80,
        ang = (a * 6.283) / 5 + q * 5,
        r = q * 122,
        x = 128 + Math.cos(ang) * r,
        y = 128 + Math.sin(ang) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,.9)');
  gr.addColorStop(0.35, 'rgba(255,255,255,.25)');
  gr.addColorStop(1, 'rgba(255,255,255,.05)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(128, 128, 126, 0, 6.283);
  g.fill();
  return new THREE.CanvasTexture(c);
}
