/**
 * Taller: probar, comprar y equipar las piezas de la nave. Arriba se ve la nave (se gira con
 * el dedo); abajo, una pestaña por ranura y las piezas en tarjetas. Tocar una pieza la muestra
 * puesta al instante, aunque todavía no se tenga.
 */
import { emit } from '../core/events.js';
import { buy, canUse, equip, equippedId, owns, setPreview } from '../core/garage.js';
import { BY_SLOT, PARTS, RARITY, SLOTS, priceOf } from '../core/parts.js';
import { S } from '../core/profile.js';
import { G } from '../core/state.js';
import { showroomBoom, showroomClear } from '../game/showroom.js';
import { $ } from './dom.js';
import { renderMenu } from './menu.js';
import { openShop } from './shop.js';

let tab = 'hull'; // ranura que se está mirando
let sel = ''; // pieza elegida en esa ranura

/* ---------- miniaturas: se dibujan con los mismos números de la pieza ---------- */
const poly = (pts, fill) =>
  '<polygon points="' + pts.map((p) => p[0] + ',' + p[1]).join(' ') + '" fill="' + fill + '"/>';
const both = (side) => side.concat(side.map((p) => [-p[0], p[1]]).reverse());
const RAINBOW = '#ff5a4a,#ffd54a,#6ef2a5,#5ee0ff,#c792ff,#ff5a4a';
/* cómo se muestra en la tarjeta cada figura de los caminos */
const STAMP = { heart: '♥', star: '★', note: '♪', snow: '✻', bubble: '○', spark: '✦', bolt: 'ϟ', paw: '•', pixel: '■' };
/* muestra de una pintura: mitad fuselaje, mitad alas; las especiales, con algo que recuerde su efecto */
function paintSwatch(p) {
  const A = p.a || p.c,
    B = p.b || p.c;
  let bg = 'linear-gradient(135deg,' + p.body + ' 50%,' + p.c + ' 50%)',
    extra = '';
  if (p.chrome) bg = 'linear-gradient(160deg,#ffffff,' + p.body + ' 35%,#1a1440 55%,' + p.c + ' 75%,#ffffff)';
  else if (p.fx === 'shift') bg = 'linear-gradient(135deg,' + A + ',' + B + ')';
  else if (p.fx === 'spectrum') bg = 'conic-gradient(' + RAINBOW + ')';
  else if (p.fx === 'rainbow') bg = 'linear-gradient(90deg,' + RAINBOW + ')';
  else if (p.fx === 'ghost') {
    bg = 'radial-gradient(circle,transparent 35%,' + A + ' 100%)';
    extra = ';border-style:dashed';
  } else if (p.fx === 'pulse') bg = 'radial-gradient(circle,' + A + ' 0 30%,' + p.body + ' 75%)';
  else if (p.fx === 'holo') bg = 'repeating-linear-gradient(0deg,' + A + ' 0 3px,transparent 3px 6px)';
  else if (p.fx === 'glitter')
    bg =
      'radial-gradient(circle at 30% 30%,' +
      B +
      ' 0 7%,transparent 9%),radial-gradient(circle at 70% 45%,' +
      B +
      ' 0 6%,transparent 8%),radial-gradient(circle at 42% 74%,' +
      B +
      ' 0 7%,transparent 9%),' +
      'linear-gradient(135deg,' +
      p.body +
      ',' +
      p.c +
      ')';
  else if (p.fx === 'lava') bg = 'repeating-linear-gradient(115deg,' + A + ' 0 7px,' + B + ' 7px 11px)';
  return '<i class="sw" style="background:' + bg + extra + '"></i>';
}
/* muestra de un disparo */
function boltShape(p, x, c) {
  const at = (inner) => '<g transform="translate(' + x + ',0)">' + inner + '</g>';
  switch (p.bolt) {
    case 'orb':
      return at('<circle r="4" fill="' + c + '"/>');
    case 'dart':
      return at(
        poly(
          [
            [0, -7],
            [3.5, 6],
            [-3.5, 6],
          ],
          c,
        ),
      );
    case 'laser':
      return at(
        '<rect x="-1" y="-9" width="2" height="18" fill="#fff"/><rect x="-2.2" y="-9" width="4.4" height="18" fill="' +
          c +
          '" opacity=".55"/>',
      );
    case 'arrow':
      return at(
        '<rect x="-.6" y="-4" width="1.2" height="12" fill="#c9a36a"/>' +
          poly(
            [
              [0, -9],
              [3, -3],
              [-3, -3],
            ],
            c,
          ),
      );
    case 'bomb':
      return at(
        '<circle cy="1.5" r="4.2" fill="#2a2c38" stroke="#8a8fa8" stroke-width=".6"/><circle cy="-4.5" r="1.6" fill="' +
          c +
          '"/>',
      );
    case 'heart':
      return at('<path d="M0 6C-9 -1 -5 -8 0 -3C5 -8 9 -1 0 6Z" fill="' + c + '"/>');
    case 'star':
      return at(
        poly(
          Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2,
              r = i % 2 ? 2.3 : 5.5;
            return [+(Math.sin(a) * r).toFixed(1), +(-Math.cos(a) * r).toFixed(1)];
          }),
          c,
        ),
      );
    case 'ring':
      return at('<circle r="3.6" fill="none" stroke="' + c + '" stroke-width="1.6"/>');
    default:
      return at('<rect x="-2" y="-7" width="4" height="14" rx="1" fill="' + c + '"/>');
  }
}
function thumb(p) {
  if (p.slot === 'hull') {
    /* vista desde arriba del fuselaje (el perfil va de la cola a la nariz); el catamarán son dos */
    const fus = (dx) =>
      poly(
        both(p.prof.map((q) => [q[0], -q[1]])).map((q) => [q[0] + dx, q[1]]),
        '#d8e0f0',
      );
    return '<svg viewBox="-22 -28 44 46">' + (p.twin ? fus(-p.twin) + fus(p.twin) : fus(0)) + '</svg>';
  }
  if (p.slot === 'nose') {
    /* las de revolución se dibujan de lado con su perfil; las armadas, con su dibujo */
    if (p.icon) return '<i style="font-style:normal;font-size:26px;line-height:1">' + p.icon + '</i>';
    const pr = p.prof || [
      [1, 0],
      [0.9, 1],
      [0.5, 2.2],
      [0, 3],
    ];
    const side = pr.map((q) => [q[1] * 6, -q[0] * 7]);
    return (
      '<svg viewBox="-12 -11 46 22"><rect x="-12" y="-7" width="12" height="14" fill="#d8e0f0" opacity=".55"/>' +
      poly(side.concat(side.map((q) => [q[0], -q[1]]).reverse()), '#5ee0ff') +
      '</svg>'
    );
  }
  if (p.slot === 'wing')
    return (
      '<svg viewBox="-28 -29 56 58">' +
      poly(both(p.wing), '#5ee0ff') +
      (p.canard ? poly(both(p.canard), '#5ee0ff') : '') +
      (p.wing2 && p.wing2.struts ? poly(both(p.wing2.pts), '#a8f0ff') : '') +
      '<ellipse rx="4.4" ry="15" cy="-2" fill="#d8e0f0" opacity=".55"/></svg>'
    );
  if (p.slot === 'fin') {
    /* vista desde atrás: el fuselaje y cada alerón como una línea */
    const line = (x1, y1, x2, y2) =>
      '<path d="M' +
      x1 +
      ' ' +
      -y1 +
      'L' +
      x2 +
      ' ' +
      -y2 +
      '" stroke="#5ee0ff" stroke-width="1.5" stroke-linecap="round"/>';
    let out = '';
    for (const f of p.fins) {
      const y = f.y == null ? 0.4 : f.y;
      if (f.plank) out += line(-f.plank[0] / 2, f.y, f.plank[0] / 2, f.y);
      else if (!f.x) out += line(0, y, 0, y + f.h);
      else
        for (const sx of [-1, 1])
          out += line(sx * f.x, y, sx * (f.x + Math.sin(f.tilt) * f.h), y + Math.cos(f.tilt) * f.h);
    }
    return '<svg viewBox="-13 -13 26 20"><ellipse rx="5" ry="3.4" fill="#d8e0f0" opacity=".7"/>' + out + '</svg>';
  }
  if (p.slot === 'paint') return paintSwatch(p);
  if (p.slot === 'glass') {
    const w = p.s[0] * 2.6,
      h = p.s[2] * 1.9,
      st = ' fill="' + p.c + '" stroke="#ffffff88"';
    const one = (cx, cy, k) =>
      p.kind === 'gem'
        ? poly(
            [
              [cx, cy - h * k],
              [cx + w * k, cy],
              [cx, cy + h * k],
              [cx - w * k, cy],
            ],
            p.c,
          )
        : p.kind === 'wedge'
          ? poly(
              [
                [cx, cy - h * k],
                [cx + w * k, cy + h * k],
                [cx - w * k, cy + h * k],
              ],
              p.c,
            )
          : p.kind === 'box'
            ? '<rect x="' +
              (cx - w * 0.5) +
              '" y="' +
              (cy - h * 0.5) +
              '" width="' +
              w +
              '" height="' +
              h +
              '" rx="1.5"' +
              st +
              '/>'
            : '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + w * k + '" ry="' + h * k + '"' + st + '/>';
    let inner = one(0, 0, 1);
    if (p.kind === 'twin') inner = one(0, -8, 1) + one(0, 8, 1);
    else if (p.kind === 'triple') inner = one(0, -6, 1) + one(-7, 6, 1) + one(7, 6, 1);
    else if (p.kind === 'eye')
      inner += '<circle cy="-3" r="4.5" fill="#2a9aff"/><circle cy="-4" r="2" fill="#0a0a14"/>';
    else if (p.kind === 'cage')
      inner += '<path d="M-8 -6H8M-8 0H8M-8 6H8M-3 -12V12M3 -12V12" stroke="#dfe6f2" stroke-width=".7" fill="none"/>';
    else if (p.kind === 'antenna')
      inner +=
        '<path d="M-3 -9L-8 -17M3 -9L8 -17" stroke="#8fa0cc" stroke-width="1"/><circle cx="-8" cy="-17" r="1.8" fill="' +
        p.c +
        '"/><circle cx="8" cy="-17" r="1.8" fill="' +
        p.c +
        '"/>';
    else if (p.kind === 'crown')
      inner += poly(
        [
          [-7, -8],
          [-7, -16],
          [-3.5, -11],
          [0, -17],
          [3.5, -11],
          [7, -16],
          [7, -8],
        ],
        '#ffd54a',
      );
    return '<svg viewBox="-13 -19 26 38">' + inner + '</svg>';
  }
  if (p.slot === 'engine') {
    /* vista desde atrás: una tobera por motor, y encima lo que tenga de especial */
    const fill = p.col || '#1a2142';
    const prop = (x, y, r) =>
      [0, 60, 120]
        .map(
          (d) =>
            '<path d="M' +
            (x - r) +
            ' ' +
            y +
            'H' +
            (x + r) +
            '" stroke="#d8e0f0" stroke-width="1.3" transform="rotate(' +
            d +
            ' ' +
            x +
            ' ' +
            y +
            ')"/>',
        )
        .join('');
    const extra =
      p.extra === 'props' || p.extra === 'fans'
        ? p.pods.map((q) => prop(q[0], -q[1], 5.5 * q[2])).join('')
        : p.extra === 'nose'
          ? prop(0, -2, 7)
          : p.extra === 'rotor'
            ? '<path d="M-15 -7H15" stroke="#d8e0f0" stroke-width="1.4"/><path d="M0 -7V-1" stroke="#8fa0cc"/>'
            : p.extra === 'v8'
              ? '<rect x="-4.5" y="-7.5" width="9" height="7" rx="1" fill="#2a2f3d" stroke="#5ee0ff" stroke-width=".8"/>'
              : p.extra === 'halo'
                ? '<circle r="7.5" fill="none" stroke="#ffb454" stroke-width="1.4"/>'
                : '';
    return (
      '<svg viewBox="-17 -10 34 18">' +
      extra +
      p.pods
        .map((q) => {
          const r = (p.bell ? 3.7 : 2.9) * q[2],
            st = ' fill="' + fill + '" stroke="#ffb454" stroke-width="' + (p.rings ? 1.6 : 0.8) + '"';
          return (
            (p.sides === 4
              ? '<rect x="' +
                (q[0] - r) +
                '" y="' +
                (-q[1] - r) +
                '" width="' +
                2 * r +
                '" height="' +
                2 * r +
                '"' +
                st +
                '/>'
              : '<circle cx="' +
                q[0] +
                '" cy="' +
                -q[1] +
                '" r="' +
                r +
                '"' +
                st +
                (p.sides === 6 ? ' stroke-dasharray="2.2 0.8"' : '') +
                '/>') +
            (p.spike ? '<circle cx="' + q[0] + '" cy="' + -q[1] + '" r="' + r * 0.35 + '" fill="#ffb454"/>' : '')
          );
        })
        .join('') +
      '</svg>'
    );
  }
  if (p.slot === 'flame') {
    const bg =
        p.style === 'rainbow'
          ? 'linear-gradient(#fff,#ff5a4a,#ffd54a,#6ef2a5,#5ee0ff,#c792ff)'
          : 'linear-gradient(' + p.in + ',' + p.out + ' 55%,transparent)',
      width = { long: 14, needle: 8, wide: 28 }[p.style] || 20,
      shape = p.shape === 'crystal' ? ';border-radius:0;clip-path:polygon(50% 100%,0 0,100% 0)' : '';
    /* el camino: una cinta de color, o la figura que va dejando (o las dos) */
    const T = p.trail,
      grad = T ? (T.cols === 'rainbow' ? RAINBOW : T.cols.join(',')) : '',
      mark = T && T.stamp ? STAMP[T.stamp] : '';
    const trail =
      (T && (!T.stamp || T.ribbon)
        ? '<i style="position:absolute;left:50%;top:0;bottom:0;width:6px;margin-left:-3px;border-radius:3px;background:linear-gradient(' +
          grad +
          ',transparent)"></i>'
        : '') +
      (mark
        ? '<i style="position:absolute;left:0;right:0;bottom:-2px;font-style:normal;font-size:13px;line-height:1;letter-spacing:1px;background:linear-gradient(90deg,' +
          grad +
          ');-webkit-background-clip:text;background-clip:text;color:transparent">' +
          mark +
          mark +
          mark +
          '</i>'
        : '');
    return (
      '<i style="position:relative;display:flex;justify-content:center;width:44px;height:38px">' +
      trail +
      '<i class="sw fl" style="position:relative;height:' +
      (p.trail ? 20 : 36) +
      'px;width:' +
      width +
      'px;background:' +
      bg +
      shape +
      '"></i></i>'
    );
  }
  if (p.slot === 'gun') {
    if (p.bolt === 'emoji')
      return (
        '<i style="font-style:normal;font-size:' +
        (p.icons.length > 2 ? 15 : 24) +
        'px;line-height:1">' +
        p.icons.slice(0, 3).join('') +
        '</i>'
      );
    const cols = p.rainbow
      ? ['#ff6b8a', '#ffd54a', '#5ee0ff']
      : p.shots
        ? [p.shots.twin, p.shots.spread, p.shots.heavy]
        : ['#ffb454', '#b4ff5e', '#ff8a3c'];
    return (
      '<svg viewBox="-16 -10 32 20">' +
      boltShape(p, -10, cols[0]) +
      boltShape(p, 0, cols[1]) +
      boltShape(p, 10, cols[2]) +
      '</svg>'
    );
  }
  /* explosión: destello con sus colores */
  const c = p.cols;
  return (
    '<i class="sw" style="border:0;background:radial-gradient(circle,' +
    c[0] +
    ' 0 18%,' +
    (c[1] || c[0]) +
    ' 18% 40%,' +
    (c[2] || c[0]) +
    ' 40% 58%,transparent 62%)"></i>'
  );
}

/* ---------- pantalla ---------- */
function render() {
  /* al volver a pintar, las listas no deben saltar al principio */
  const top = $('gItems').scrollTop,
    left = $('gTabs').scrollLeft;
  $('gCoins').textContent = '🪙 ' + S.coins;
  $('gTabs').innerHTML = SLOTS.map(
    (s) =>
      '<button class="gtab' +
      (s.id === tab ? ' sel' : '') +
      '" data-tab="' +
      s.id +
      '"><i>' +
      s.icon +
      '</i>' +
      s.name +
      '</button>',
  ).join('');
  const on = equippedId(tab);
  $('gItems').innerHTML = BY_SLOT[tab]
    .map((p) => {
      const cls = (p.id === sel ? ' sel' : '') + (p.id === on ? ' on' : '') + (owns(p.id) ? '' : ' lock');
      return (
        '<button class="gcard' +
        cls +
        '" data-part="' +
        p.id +
        '" style="--rar:' +
        RARITY[p.rar].col +
        '">' +
        '<div class="th">' +
        thumb(p) +
        '</div><span>' +
        p.name +
        '</span>' +
        '<em>' +
        (owns(p.id) ? '' : '🪙 ' + priceOf(p)) +
        '</em></button>'
      );
    })
    .join('');
  $('gItems').scrollTop = top;
  $('gTabs').scrollLeft = left;
  const p = PARTS[sel],
    rar = RARITY[p.rar],
    price = priceOf(p),
    act = $('gAct');
  $('gName').textContent = p.name;
  $('gRar').textContent = rar.name;
  $('gRar').style.color = rar.col;
  act.className = 'btn';
  act.disabled = false;
  if (sel === on) {
    act.textContent = '✓ Puesta';
    act.disabled = true;
  } else if (owns(sel)) act.textContent = 'Equipar';
  else if (canUse(sel)) act.textContent = 'Equipar (demo)';
  else if (S.coins >= price) {
    act.textContent = 'Comprar · 🪙 ' + price;
    act.className = 'btn ad';
  } else {
    /* no alcanza: el botón lleva a la tienda */
    act.textContent = 'Te faltan 🪙 ' + (price - S.coins) + ' · Tienda';
    act.className = 'btn alt';
  }
}
function pickTab(id) {
  tab = id;
  sel = equippedId(tab);
  setPreview(null);
  G.showGuns = tab === 'gun';
  /* la nave se acomoda para que se vea lo que se está eligiendo: la cabina de frente, los motores de atrás */
  G.yaw = Math.atan2(Math.sin(G.yaw), Math.cos(G.yaw));
  G.yawTo =
    tab === 'glass' || tab === 'nose' ? 2.45 : tab === 'engine' || tab === 'flame' || tab === 'fin' ? 0.45 : null;
  $('gHint').textContent =
    tab === 'gun'
      ? 'Disparos de muestra: así se ven las tres armas'
      : tab === 'boom'
        ? 'Toca una explosión para verla'
        : 'Desliza para girar la nave';
  showroomClear();
  render();
}
function pickPart(id) {
  sel = id;
  setPreview(id === equippedId(tab) ? null : id);
  if (tab === 'boom') showroomBoom();
  render();
}
function act() {
  if (!owns(sel) && !canUse(sel) && S.coins < priceOf(PARTS[sel])) {
    openShop(render); // al volver de la tienda se repinta: quizá ya alcanza
    return;
  }
  if (owns(sel) || canUse(sel)) equip(sel);
  else if (buy(sel)) emit('reward');
  render();
}

export function openGarage() {
  G.view = 'garage';
  G.yawTo = null;
  G.yaw = 0.6; // la misma vista de tres cuartos del lobby; de ahí en adelante solo la mueve el dedo
  $('menu').classList.remove('show');
  $('garage').classList.add('show');
  pickTab('hull');
}
/* devuelve true si estaba abierto (para el botón "atrás" del sistema) */
export function closeGarage() {
  if (!$('garage').classList.contains('show')) return false;
  setPreview(null);
  showroomClear();
  G.showGuns = false;
  G.view = 'lobby';
  $('garage').classList.remove('show');
  $('menu').classList.add('show');
  renderMenu();
  return true;
}
export function bootGarage() {
  $('garageBtn').addEventListener('click', openGarage);
  $('shipTap').addEventListener('click', openGarage);
  $('garageBack').addEventListener('click', closeGarage);
  $('gTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) pickTab(b.dataset.tab);
  });
  $('gItems').addEventListener('click', (e) => {
    const b = e.target.closest('[data-part]');
    if (b) pickPart(b.dataset.part);
  });
  $('gAct').addEventListener('click', act);
  /* girar la nave con el dedo */
  const view = $('gView');
  let lastX = 0;
  view.addEventListener('pointerdown', (e) => {
    if (G.showGuns) return;
    G.yawHold = true;
    G.yawTo = null;
    lastX = e.clientX;
    try {
      view.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  view.addEventListener('pointermove', (e) => {
    if (!G.yawHold) return;
    G.yaw += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  const release = () => {
    G.yawHold = false;
  };
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);
}
