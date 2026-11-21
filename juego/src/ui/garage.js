/**
 * Taller: probar, comprar y equipar las piezas de la nave. Arriba se ve la nave (se gira con
 * el dedo); abajo, una pestaña por ranura y las piezas en tarjetas. Tocar una pieza la muestra
 * puesta al instante, aunque todavía no se tenga.
 */
import { emit } from '../core/events.js';
import { buy, canUse, equip, equippedId, owns, setPreview, uniqueOn } from '../core/garage.js';
import { isGoal, toggleGoal } from '../core/goal.js';
import { BODY, BY_SLOT, PARTS, RARITY, SLOTS } from '../core/parts.js';
import { OFFER_OFF, locked, offer, priceNow, seasonOf } from '../core/season.js';
import { S } from '../core/profile.js';
import { G } from '../core/state.js';
import { vrand } from '../core/util.js';
import { showroomBoom, showroomClear } from '../game/showroom.js';
import { $, tok } from './dom.js';
import { T, ic } from './icons.js';
import { renderMenu } from './menu.js';
import { openShop } from './shop.js';

let tab = 'ship'; // ranura que se está mirando
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
    case 'gift':
      return at(
        '<rect x="-4" y="-3" width="8" height="8" rx="1" fill="' +
          c +
          '"/><path d="M0 -3V5M-4 1H4" stroke="#ffd54a" stroke-width="1.3"/><path d="M-2.4 -5.4L0 -3L2.4 -5.4" stroke="#ffd54a" stroke-width="1.3" fill="none"/>',
      );
    case 'beam':
      return at(
        '<rect x="-1" y="-9" width="2" height="18" fill="#fff"/><ellipse cy="-3" rx="4" ry="1.6" fill="none" stroke="' +
          c +
          '" stroke-width="1.2"/><ellipse cy="4" rx="3" ry="1.3" fill="none" stroke="' +
          c +
          '" stroke-width="1.2"/>',
      );
    case 'ring':
      return at('<circle r="3.6" fill="none" stroke="' + c + '" stroke-width="1.6"/>');
    default:
      return at('<rect x="-2" y="-7" width="4" height="14" rx="1" fill="' + c + '"/>');
  }
}
function thumb(p) {
  if (p.slot === 'ship') return '<i style="font-style:normal;font-size:28px;line-height:1">' + p.icon + '</i>';
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
  if (p.slot === 'flame' && p.trail && p.trail.flag) {
    /* bandera: sus franjas, de arriba abajo */
    const total = p.trail.flag.reduce((n, f) => n + f[1], 0);
    let at = 0;
    const stops = p.trail.flag
      .map(([c, w]) => {
        const a = (at / total) * 100;
        at += w;
        return c + ' ' + a + '% ' + (at / total) * 100 + '%';
      })
      .join(',');
    return (
      '<i style="display:block;width:40px;height:27px;border-radius:4px;border:1px solid #ffffff55;background:linear-gradient(' +
      stops +
      ')"></i>'
    );
  }
  if (p.slot === 'flame' && p.trail && p.trail.icon === 'elf')
    return '<svg viewBox="18 0 60 92" style="height:38px"><path d="M34 25H62L66 8L72 4L58 6Z" fill="#1f9a4a"/><rect x="31" y="22" width="34" height="6" fill="#e02a34"/><circle cx="72" cy="5" r="4" fill="#ffd54a"/><path d="M35 30L21 23L34 40ZM61 30L75 23L62 40Z" fill="#ffcf9f"/><circle cx="48" cy="34" r="14" fill="#ffcf9f"/><circle cx="43" cy="32" r="2"/><circle cx="53" cy="32" r="2"/><path d="M36 46H60L66 72H30Z" fill="#27b257"/><rect x="31" y="61" width="34" height="6" fill="#e02a34"/><rect x="44" y="60" width="8" height="8" fill="#ffd54a"/><path d="M37 72h8v14h-8zM51 72h8v14h-8z" fill="#fff"/><path d="M30 90L33 84H46V90ZM50 84H63L66 90H50Z" fill="#1f9a4a"/></svg>';
  if (p.slot === 'flame' && p.trail && p.trail.icon)
    return '<i style="font-style:normal;font-size:26px;line-height:1">' + p.trail.icon + '</i>';
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
/* Las 11 ranuras se reparten en 4 grupos: primero se elige el grupo y después la ranura. */
const GROUPS = [
  { id: 'ship', name: 'Nave', icon: 'ufo', slots: ['ship'] },
  { id: 'body', name: 'Cuerpo', icon: 'rocket', slots: ['hull', 'nose', 'wing', 'fin', 'glass', 'engine'] },
  { id: 'style', name: 'Estilo', icon: 'paint', slots: ['paint', 'flame'] },
  { id: 'fight', name: 'Combate', icon: 'target', slots: ['gun', 'boom'] },
];
const groupOf = (slot) => GROUPS.find((g) => g.slots.includes(slot));
const slotName = (id) => SLOTS.find((s) => s.id === id).name;
let mine = false; // filtro: mostrar solo las piezas que ya se tienen
const lastTab = {}; // la última ranura que se miró en cada grupo
let painted = ''; // qué lista está pintada (para no perder el desplazamiento al repintar la misma)
/* las piezas que se ven en la lista (la elegida siempre se ve, aunque el filtro la escondería) */
const listed = () => BY_SLOT[tab].filter((p) => !mine || owns(p.id) || p.id === sel);

function render(reveal) {
  const key = tab + '|' + mine,
    top = key === painted ? $('gItems').scrollTop : 0;
  painted = key;
  const grp = groupOf(tab),
    on = equippedId(tab),
    all = BY_SLOT[tab],
    have = all.filter((p) => owns(p.id)).length;
  $('gCoins').innerHTML = T('{coin} ' + S.coins);
  $('gGroups').innerHTML = GROUPS.map(
    (g) =>
      '<button class="ggrp' +
      (g === grp ? ' sel' : '') +
      '" data-group="' +
      g.id +
      '">' +
      ic(g.icon) +
      ' ' +
      g.name +
      '</button>',
  ).join('');
  $('gTabs').innerHTML = grp.slots
    .map((id) => {
      const off = BODY.includes(id) && uniqueOn();
      return (
        '<button class="gchip' +
        (id === tab ? ' sel' : '') +
        (off ? ' off' : '') +
        '" data-tab="' +
        id +
        '">' +
        slotName(id) +
        '<small>' +
        BY_SLOT[id].filter((p) => owns(p.id)).length +
        '/' +
        BY_SLOT[id].length +
        '</small></button>'
      );
    })
    .join('');
  $('gFilters').innerHTML =
    '<button class="gfil' +
    (mine ? '' : ' sel') +
    '" data-mine="0">Todas</button>' +
    '<button class="gfil' +
    (mine ? ' sel' : '') +
    '" data-mine="1">Mías</button>';
  $('gCount').textContent = 'Tienes ' + have + ' de ' + all.length;
  const sale = offer();
  $('gItems').innerHTML = listed()
    .map((p) => {
      const cls =
        (p.id === sel ? ' sel' : '') +
        (p.id === on ? ' on' : '') +
        (owns(p.id) ? '' : ' lock') +
        (isGoal(p.id) ? ' goal' : '') +
        (!owns(p.id) && sale && sale.id === p.id ? ' sale' : '');
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
        (owns(p.id) ? '' : locked(p) ? '{calendar} ' + seasonOf(p).name : '{coin} ' + priceNow(p)) +
        '</em></button>'
      );
    })
    .join('');
  tok('gItems');
  $('gItems').scrollTop = top;
  if (reveal) {
    const card = $('gItems').querySelector('.gcard.sel');
    if (card) card.scrollIntoView({ block: 'nearest' });
  }
  /* la placa sobre la nave: dónde estoy, qué pieza es y en qué estado está */
  const p = PARTS[sel],
    rar = RARITY[p.rar],
    price = priceNow(p),
    season = seasonOf(p),
    shut = !owns(sel) && locked(p), // de temporada y fuera de fecha
    act = $('gAct');
  $('gSlot').textContent = grp.slots.length > 1 ? grp.name + ' · ' + slotName(tab) : slotName(tab);
  $('gName').textContent = p.name;
  $('gRar').innerHTML = T(
    rar.name +
      ' · ' +
      (sel === on
        ? 'puesta'
        : owns(sel)
          ? 'es tuya'
          : shut
            ? 'solo en ' + season.name
            : '{coin} ' + price + (sale && sale.id === sel ? ' (−' + OFFER_OFF + ' %)' : '')),
  );
  $('gRar').style.color = rar.col;
  act.className = 'btn';
  act.disabled = false;
  if (sel === on) {
    act.innerHTML = T('{check} Puesta');
    act.disabled = true;
  } else if (owns(sel)) act.textContent = 'Equipar';
  else if (canUse(sel)) act.textContent = 'Equipar (demo)';
  else if (shut) {
    act.textContent = 'Se consigue ' + season.dates;
    act.className = 'btn alt';
    act.disabled = true;
  } else if (S.coins >= price) {
    act.innerHTML = T('Comprar · {coin} ' + price);
    act.className = 'btn ad';
  } else {
    /* no alcanza: el botón lleva a la tienda */
    act.innerHTML = T('Te faltan {coin} ' + (price - S.coins) + ' · Tienda');
    act.className = 'btn alt';
  }
  /* marcar como meta: solo lo que aún no se tiene (en modo demo no hay metas) */
  const goalBtn = $('gGoal');
  goalBtn.style.display = owns(sel) || G.demo ? 'none' : '';
  goalBtn.classList.toggle('on', isGoal(sel));
  goalBtn.innerHTML = T('{target}<span>' + (isGoal(sel) ? 'Tu meta' : 'Meta') + '</span>');
}
function pickTab(id) {
  tab = id;
  lastTab[groupOf(id).id] = id;
  sel = equippedId(tab);
  setPreview(null);
  G.showGuns = tab === 'gun';
  /* la nave se acomoda para que se vea lo que se está eligiendo: la cabina de frente, los motores de atrás */
  G.yaw = Math.atan2(Math.sin(G.yaw), Math.cos(G.yaw));
  G.yawTo =
    tab === 'glass' || tab === 'nose' ? 2.45 : tab === 'engine' || tab === 'flame' || tab === 'fin' ? 0.45 : null;
  hint();
  showroomClear();
  render(true);
}
/* al tocar un grupo se vuelve a la ranura que se estaba mirando en él */
function pickGroup(id) {
  const g = GROUPS.find((x) => x.id === id);
  pickTab(lastTab[id] || g.slots[0]);
}
/* la línea de ayuda bajo la nave: depende de la pestaña y de lo que se esté mirando */
function hint() {
  const pack = tab === 'ship' && sel && PARTS[sel].pack,
    sale = offer(),
    season = sel && !owns(sel) && seasonOf(PARTS[sel]);
  $('gHint').textContent = isGoal(sel)
    ? 'Es tu meta: el lobby te dirá cuánto te falta'
    : season && season.active
      ? 'De ' + season.name + ': se consigue ' + season.dates
      : sale && sale.id === sel && !owns(sel)
        ? 'Oferta de la semana: −' + OFFER_OFF + ' % hasta el domingo'
        : pack
          ? 'Su paquete (aparte): ' + pack.map((id) => PARTS[id].name).join(' y ')
          : BODY.includes(tab) && uniqueOn()
            ? 'Llevas una nave única: equipar algo de aquí te devuelve a la armable'
            : tab === 'gun'
              ? 'Disparos de muestra: así se ven las tres armas'
              : tab === 'boom'
                ? 'Toca una explosión para verla'
                : 'Desliza para girar · flechas para cambiar de pieza';
}
function pickPart(id, reveal) {
  sel = id;
  setPreview(id === equippedId(tab) ? null : id);
  hint();
  if (tab === 'boom') showroomBoom();
  render(reveal);
}
/* flechas: a la pieza anterior o siguiente de la lista, dando la vuelta al final */
function step(dir) {
  const list = listed(),
    i = list.findIndex((p) => p.id === sel);
  pickPart(list[(i + dir + list.length) % list.length].id, true);
}
/* dado: arma una nave al azar con las piezas que se pueden usar */
function randomize() {
  for (const slot of BODY.concat(['flame', 'gun', 'boom'])) {
    const pool = BY_SLOT[slot].filter((p) => canUse(p.id));
    equip(pool[Math.floor(vrand() * pool.length)].id);
  }
  sel = equippedId(tab);
  setPreview(null);
  hint();
  emit('power');
  render(true);
}
function setBig(on) {
  G.garageBig = on;
  $('gPanel').classList.toggle('big', on);
  $('garage').classList.toggle('big', on);
}
function act() {
  if (!owns(sel) && !canUse(sel) && locked(PARTS[sel])) return; // fuera de temporada
  if (!owns(sel) && !canUse(sel) && S.coins < priceNow(PARTS[sel])) {
    openShop(render); // al volver de la tienda se repinta: quizá ya alcanza
    return;
  }
  if (owns(sel) || canUse(sel)) equip(sel);
  else if (buy(sel)) emit('reward');
  hint();
  render();
}

export function openGarage() {
  G.view = 'garage';
  G.yawTo = null;
  G.yaw = G.lobbyYaw; // la nave sigue como estaba en el lobby; de ahí en adelante solo la mueve el dedo
  $('menu').classList.remove('show');
  $('garage').classList.add('show');
  setBig(false);
  painted = '';
  pickTab('ship');
}
/* abre el taller mostrando una pieza (desde la meta o un aviso del lobby) */
export function openGarageAt(id) {
  openGarage();
  const p = id && PARTS[id];
  if (!p) return;
  pickTab(p.slot);
  pickPart(id, true);
}
/* devuelve true si estaba abierto (para el botón "atrás" del sistema) */
export function closeGarage() {
  if (!$('garage').classList.contains('show')) return false;
  if (G.garageBig) {
    setBig(false); // el primer "atrás" solo achica la lista
    return true;
  }
  setPreview(null);
  showroomClear();
  G.showGuns = false;
  G.lobbyYaw = Math.atan2(Math.sin(G.yaw), Math.cos(G.yaw)); // y vuelve al lobby como quedó en el taller
  G.view = 'lobby';
  $('garage').classList.remove('show');
  $('menu').classList.add('show');
  renderMenu();
  return true;
}
export function bootGarage() {
  const pick = (box, attr, fn) =>
    $(box).addEventListener('click', (e) => {
      const b = e.target.closest('[' + attr + ']');
      if (b) fn(b.getAttribute(attr));
    });
  $('garageBtn').addEventListener('click', openGarage);
  /* En el lobby: arrastrar gira la nave; un toque sin arrastrar abre el taller. */
  const ship = $('shipTap');
  let dragX = null,
    dragged = false;
  ship.addEventListener('pointerdown', (e) => {
    dragX = e.clientX;
    dragged = false;
    try {
      ship.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  ship.addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    if (!dragged && Math.abs(dx) < 8) return; // un dedo que tiembla un poco sigue siendo un toque
    dragged = true;
    G.lobbyYaw += dx * 0.012;
    dragX = e.clientX;
  });
  const drop = () => {
    dragX = null;
  };
  ship.addEventListener('pointerup', drop);
  ship.addEventListener('pointercancel', drop);
  ship.addEventListener('click', () => {
    if (!dragged) openGarage();
  });
  $('garageBack').addEventListener('click', () => {
    setBig(false);
    closeGarage();
  });
  $('gCoins').addEventListener('click', () => openShop(render));
  pick('gGroups', 'data-group', pickGroup);
  pick('gTabs', 'data-tab', pickTab);
  pick('gItems', 'data-part', (id) => pickPart(id));
  pick('gFilters', 'data-mine', (v) => {
    mine = v === '1';
    render(true);
  });
  $('gAct').addEventListener('click', act);
  $('gPrev').addEventListener('click', () => step(-1));
  $('gNext').addEventListener('click', () => step(1));
  $('gDice').addEventListener('click', randomize);
  $('gGoal').addEventListener('click', () => {
    toggleGoal(sel);
    emit('power');
    hint();
    render();
  });
  $('gGrip').addEventListener('click', () => setBig(!G.garageBig));
  /* girar la nave con el dedo (los botones que flotan sobre ella no cuentan) */
  const view = $('gView');
  let lastX = 0;
  view.addEventListener('pointerdown', (e) => {
    if (G.showGuns || e.target.closest('button')) return;
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
