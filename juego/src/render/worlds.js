/**
 * Mundos: lo que hace que cada mundo se vea distinto del espacio y de los demás.
 *
 *   - cielo propio (una bóveda con degradado; aurora en el hielo, resplandor en el fuego)
 *   - cordilleras en el horizonte
 *   - terreno bajo la pista, que sigue sus curvas (nieve y hielo agrietado; basalto con ríos de lava)
 *   - paisaje a los lados (agujas de hielo y montículos de nieve; rocas y chorros de lava)
 *   - lo que flota en el aire (nieve; brasas)
 *   - obstáculos y enemigos con su propio modelo
 *
 * Todo se crea la primera vez que se entra a un mundo, y con vrand() (azar solo de adorno): así
 * no cambia nada de lo que pasa en la partida. Fuera de un mundo, todo esto queda oculto.
 */
import { W } from '../core/config.js';
import { G } from '../core/state.js';
import { vrand } from '../core/util.js';
import { spaceShown } from './backdrop.js';
import { camera, mood, scene } from './engine.js';
import { NOISE } from './glsl.js';
import { bgCol } from './environment.js';
import { BOX, SPH, bmat } from './kit.js';
import { TLEN, TSEG, bd, stars3 } from './track.js';
import { TRACK_Y, between, cone, crag, lump, planted } from './worldKit.js';
import { MORE } from './worldsMore.js';

/* el aspecto del mundo que se está jugando, o null (menú, Supervivencia, Viaje espacial) */
/* el mundo cuyo paisaje se ve: el de la partida o, en Supervivencia, el mapa que tocó */
export const worldSeen = () =>
  G.state === 'menu' || !G.run || G.run.mode === 'space'
    ? null
    : G.run.mode === 'endless'
      ? G.run.map || null
      : G.run.world || null;
export const worldLook = () => {
  const w = worldSeen();
  return w ? w.look : null;
};

const HW = W / 2 + 6; // medio ancho de la pista
const LAND_Y = -46; // el terreno queda un poco por debajo de la pista
const far = () => TSEG * TLEN; // hasta dónde llega lo que se dibuja

/* ---------- cómo es cada mundo ---------- */
const THEME = {
  ice: {
    kind: 1,
    top: 0x04122a, // cielo arriba
    hemi: [0xcfeaff, 0x3f6f96], // luz del cielo y luz que rebota del suelo
    rim: 0x9fe8ff,
    air: [0xffffff, 9], // lo que flota: color y tamaño
    ranges: [
      { r: 3400, n: 120, h: [260, 620], low: 0x5a9ccc, peak: 0xf2fbff },
      { r: 2500, n: 90, h: [120, 380], low: 0x3f7fb4, peak: 0xd6f0ff },
    ],
  },
  gas: {
    kind: 3,
    top: 0x0b1206,
    hemi: [0xe0d6b0, 0x4a3418],
    rim: 0xb6ff5a,
    air: [0xc8ff7a, 9],
    ranges: [
      { r: 3400, n: 90, h: [320, 980], low: 0x6a4e2c, peak: 0x2e2012 },
      { r: 2500, n: 70, h: [160, 560], low: 0x54401f, peak: 0x1e160a },
    ],
  },
  city: {
    kind: 4,
    top: 0x03040c,
    hemi: [0x8aa0ff, 0x3a1040],
    rim: 0xff4fc8,
    air: [0x8ae8ff, 4],
    ranges: [
      { r: 3400, n: 150, h: [140, 560], low: 0x1c2456, peak: 0x0a0e26, glow: 0xff4fc8, blocky: true },
      { r: 2500, n: 110, h: [80, 340], low: 0x161c46, peak: 0x05070f, glow: 0x5ee0ff, blocky: true },
    ],
  },
  hole: {
    kind: 5,
    top: 0x000000,
    hemi: [0xc792ff, 0x401a08],
    rim: 0xff8a3c,
    air: [0xffb070, 7],
    ranges: [], // sin horizonte: solo el remolino
  },
  fire: {
    kind: 2,
    top: 0x0a0202,
    hemi: [0xff9a5c, 0x3a0a04],
    rim: 0xff6a1a,
    air: [0xffa040, 6],
    ranges: [
      { r: 3400, n: 110, h: [220, 700], low: 0x4a0f06, peak: 0x1a0705, glow: 0xff5a14 },
      { r: 2500, n: 80, h: [100, 360], low: 0x2e0a05, peak: 0x0c0403, glow: 0xff7a1a },
    ],
  },
};

/* ---------- cielo ---------- */
let dome, domeMat;
function mkDome() {
  domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uLow: { value: new THREE.Color() },
      uKind: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader:
      'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: [
      'uniform vec3 uTop;uniform vec3 uLow;uniform float uKind;uniform float uTime;varying vec3 vDir;',
      NOISE,
      'void main(){',
      '  vec3 d=normalize(vDir);float h=d.y;',
      '  vec3 c=mix(uLow,uTop,smoothstep(0.,.55,h));',
      '  if(uKind<1.5){', // hielo: una aurora que ondea
      '    float a=atan(d.x,-d.z);',
      '    float band=smoothstep(.1,.28,h)*(1.-smoothstep(.4,.72,h));',
      '    float w=.5+.5*sin(a*5.+uTime*.35+sin(a*2.-uTime*.2)*2.);',
      '    c+=vec3(.2,.95,.7)*band*w*.55+vec3(.5,.4,1.)*band*(1.-w)*.25;',
      '  }else if(uKind<2.5){', // fuego: el horizonte arde
      '    float g=exp(-max(h,0.)*7.);',
      '    c+=vec3(1.,.36,.05)*g*(.6+.15*sin(uTime*1.3+d.x*9.));',
      '    float a=atan(d.x,-d.z);',
      '    float s=fbm(vec2(a*2.5+uTime*.02,h*6.-uTime*.04));',
      '    c=mix(c,vec3(.10,.05,.045),smoothstep(.45,.75,s)*smoothstep(.03,.3,h)*.75);', // humo
      '    c+=vec3(1.,.3,.04)*smoothstep(.55,.9,s)*exp(-max(h,0.)*4.)*.4;', // encendido por debajo
      '  }else if(uKind<3.5){', // gases: nubes de gas verdoso que se arrastran por un cielo turbio
      '    float a=atan(d.x,-d.z);',
      '    float n=fbm(vec2(a*2.2+uTime*.03,h*5.-uTime*.05)*1.6);',
      '    c=mix(c,vec3(.55,.85,.22),smoothstep(.42,.8,n)*smoothstep(-.05,.45,h)*.55);',
      '    c=mix(c,vec3(.20,.14,.06),smoothstep(.5,.2,n)*smoothstep(0.,.4,h)*.4);',
      '    c+=vec3(.5,.9,.22)*exp(-max(h,0.)*7.)*.3;',
      '  }else if(uKind<4.5){', // ciudad: el resplandor de neón sobre el horizonte
      '    c+=vec3(1.,.2,.65)*exp(-max(h,0.)*9.)*.55+vec3(.1,.6,1.)*exp(-max(h,0.)*3.5)*.18;',
      '  }else{', // agujero negro: un remolino de luz alrededor del centro oscuro, al frente
      '    float r=acos(clamp(-d.z,-1.,1.));float t=atan(d.y,d.x);',
      '    float sw=sin(t*3.+r*9.-uTime*1.5);',
      '    float ring=exp(-pow((r-.34)*6.5,2.));',
      '    c=vec3(.015,0.,.04)+vec3(1.,.5,.14)*ring*(.75+.25*sw)+vec3(.5,.2,1.)*smoothstep(.1,1.,sw)*smoothstep(.55,1.7,r)*.32;',
      '    c*=smoothstep(.11,.23,r);',
      '  }',
      '  gl_FragColor=vec4(c,1.);',
      '}',
    ].join('\n'),
  });
  dome = new THREE.Mesh(new THREE.SphereGeometry(4300, 32, 16), domeMat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);
}

/* ---------- cordilleras del horizonte: un anillo de picos alrededor ---------- */
const RANGES = {}; // por mundo: las dos cordilleras
function mkRange(spec, hazeHex) {
  const n = spec.n,
    pos = [],
    col = [],
    idx = [],
    haze = new THREE.Color(hazeHex),
    low = new THREE.Color(spec.low),
    peak = new THREE.Color(spec.peak),
    glow = spec.glow ? new THREE.Color(spec.glow) : null;
  let h = spec.h[0],
    flat = spec.h[0];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2,
      x = Math.cos(a) * spec.r,
      z = Math.sin(a) * spec.r;
    /* la altura va subiendo y bajando, con algún pico de vez en cuando */
    h =
      i === n
        ? spec.h[0]
        : Math.max(spec.h[0], Math.min(spec.h[1], h + (vrand() - 0.5) * (spec.h[1] - spec.h[0]) * 0.9));
    let top = vrand() < 0.2 ? spec.h[1] * (0.85 + vrand() * 0.3) : h;
    /* en la ciudad el horizonte son edificios: techos planos, cada uno de dos tramos */
    if (spec.blocky) {
      if (i % 2) top = flat;
      else flat = top = spec.h[0] + vrand() * vrand() * (spec.h[1] - spec.h[0]);
    }
    pos.push(x, -160, z, x, top, z);
    const tip = glow && vrand() < 0.3 ? glow : peak; // en el fuego algunos picos son volcanes encendidos
    col.push(haze.r, haze.g, haze.b);
    const k = 0.35 + 0.65 * (top / spec.h[1]);
    col.push(low.r + (tip.r - low.r) * k, low.g + (tip.g - low.g) * k, low.b + (tip.b - low.b) * k);
    if (i < n) {
      const v = i * 2;
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = -9;
  m.visible = false;
  scene.add(m);
  return m;
}

/* ---------- terreno: una franja ancha que sigue las curvas de la pista ---------- */
const LAND_W = 1900;
let land, landGeo, landPos, landMat;
function mkLand() {
  landPos = new Float32Array((TSEG + 1) * 6);
  const aux = new Float32Array((TSEG + 1) * 4),
    idx = [];
  for (let i = 0; i <= TSEG; i++) {
    const z = 260 - i * TLEN;
    aux[i * 4] = -LAND_W;
    aux[i * 4 + 1] = z;
    aux[i * 4 + 2] = LAND_W;
    aux[i * 4 + 3] = z;
    if (i < TSEG) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute('position', new THREE.BufferAttribute(landPos, 3));
  landGeo.setAttribute('aux', new THREE.BufferAttribute(aux, 2));
  landGeo.setIndex(idx);
  landMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uKind: { value: 0 },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uFog: { value: new THREE.Color() },
    },
    vertexShader: [
      'attribute vec2 aux;uniform float uScroll;varying vec2 vP;varying float vDepth;',
      'void main(){vP=vec2(aux.x,aux.y-uScroll);vec4 mv=modelViewMatrix*vec4(position,1.0);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}',
    ].join('\n'),
    fragmentShader: [
      'uniform float uKind;uniform float uTime;uniform vec3 uFog;varying vec2 vP;varying float vDepth;',
      NOISE,
      'void main(){',
      '  vec3 c;',
      '  if(uKind<1.5){', // hielo: nieve, placas azuladas, grietas y algún destello
      '    float n=fbm(vP*.004);',
      '    c=mix(vec3(.50,.72,.90),vec3(.93,.98,1.),smoothstep(.3,.7,n));',
      '    float crack=smoothstep(.035,0.,abs(noise(vP*.012+20.)-.5));',
      '    c=mix(c,vec3(.24,.50,.76),crack*.75);',
      '    c+=vec3(1.)*step(.988,hash(floor(vP*.22)))*.45;',
      '  }else if(uKind<2.5){', // fuego: basalto negro con ríos y charcos de lava que laten
      '    float n=fbm(vP*.0035);',
      '    c=mix(vec3(.06,.03,.025),vec3(.17,.085,.06),noise(vP*.03));',
      '    float vein=smoothstep(.05,0.,abs(n-.5));',
      '    float pool=smoothstep(.64,.72,n);',
      '    float heat=max(vein,pool)*(.75+.25*sin(uTime*2.+n*30.));',
      '    c=mix(c,vec3(1.,.40,.05),heat);',
      '    c+=vec3(1.,.8,.3)*pool*.3;',
      '  }else if(uKind<3.5){', // gases: roca café, manchas de musgo y charcos de gas que hierven
      '    float n=fbm(vP*.004);',
      '    c=mix(vec3(.15,.095,.045),vec3(.36,.25,.13),noise(vP*.03));',
      '    c=mix(c,vec3(.19,.33,.09),smoothstep(.45,.62,noise(vP*.011+7.))*.75);',
      '    float pool=smoothstep(.6,.7,n);',
      '    c=mix(c,vec3(.62,1.,.25),pool*(.55+.25*sin(uTime*1.5+n*20.)));',
      '  }else if(uKind<4.5){', // ciudad: manzanas oscuras, calles de neón y ventanas encendidas
      '    vec2 g=abs(fract(vP/220.)-.5);',
      '    float line=smoothstep(.465,.5,max(g.x,g.y));',
      '    c=mix(vec3(.03,.035,.08),vec3(.07,.08,.17),step(.5,hash(floor(vP/220.))));',
      '    c+=vec3(1.,.8,.45)*step(.93,hash(floor(vP/22.)))*.5*(1.-line);',
      '    c=mix(c,vec3(.15,.9,1.),line*.8);',
      '  }else{', // agujero negro: la rejilla del espacio, que se ondula
      '    vec2 w=vP+vec2(sin(vP.y*.004+uTime)*40.,0.);',
      '    vec2 g=abs(fract(w/160.)-.5);',
      '    float line=smoothstep(.455,.5,max(g.x,g.y));',
      '    c=vec3(.01,0.,.03)+vec3(.55,.2,1.)*line*.75;',
      '  }',
      '  gl_FragColor=vec4(mix(c,uFog,smoothstep(700.,1650.,vDepth)),1.);',
      '}',
    ].join('\n'),
  });
  land = new THREE.Mesh(landGeo, landMat);
  land.frustumCulled = false;
  land.renderOrder = -8;
  scene.add(land);
}

/* ---------- paisaje a los lados: figuras repetidas que pasan junto a la pista ---------- */
const N_PROP = 46;
const PROPS = {}; // por mundo: [{ mesh, slots, flicker }]
const _d = new THREE.Object3D();
function slots(near, spread, sMin, sGrow) {
  const out = [];
  for (let i = 0; i < N_PROP; i++) {
    const u = vrand(),
      dist = near + u * u * spread; // la mayoría cerca de la pista, algunas lejos
    out.push({
      x: (i % 2 ? 1 : -1) * (HW + dist),
      z: (i / N_PROP) * (far() + 300) + vrand() * 30,
      s: (sMin + dist * sGrow) * (0.6 + vrand() * 0.9), // las lejanas, más grandes
      rot: vrand() * 6.28,
      tilt: (vrand() - 0.5) * 0.5,
      ph: vrand() * 6.28,
    });
  }
  return out;
}
function prop(geo, mat, sl, shape, flicker) {
  const mesh = new THREE.InstancedMesh(geo, mat, N_PROP);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, slots: sl, shape, flicker };
}
function mkProps(look) {
  if (MORE[look])
    return MORE[look]
      .props()
      .map(([geo, mat, near, spread, sMin, sGrow, shape, flicker]) =>
        prop(geo, mat, slots(near, spread, sMin, sGrow), shape, flicker),
      );
  if (look === 'ice') {
    const spike = new THREE.ConeGeometry(0.42, 2.4, 5);
    spike.translate(0, 1.2, 0);
    const mound = new THREE.IcosahedronGeometry(1, 1);
    mound.scale(1.5, 0.5, 1.2);
    return [
      prop(
        spike,
        new THREE.MeshStandardMaterial({
          color: 0xc4ecff,
          emissive: 0x1c5f8a,
          emissiveIntensity: 0.6,
          roughness: 0.22,
          metalness: 0.1,
          flatShading: true,
        }),
        slots(34, 780, 9, 0.13),
        [0.55, 1, 0.55],
      ),
      prop(
        mound,
        new THREE.MeshStandardMaterial({ color: 0xf2faff, roughness: 1, flatShading: true }),
        slots(26, 900, 10, 0.1),
        [1, 1, 1],
      ),
    ];
  }
  const rock = new THREE.ConeGeometry(0.8, 1.8, 5);
  rock.translate(0, 0.9, 0);
  const jet = new THREE.ConeGeometry(0.34, 2.8, 7);
  jet.translate(0, 1.4, 0);
  return [
    prop(
      rock,
      new THREE.MeshStandardMaterial({ color: 0x1d100d, roughness: 1, flatShading: true, emissive: 0x2a0600 }),
      slots(30, 860, 11, 0.13),
      [1, 1, 1],
    ),
    prop(jet, new THREE.MeshBasicMaterial({ color: 0xff7a1a }), slots(44, 620, 7, 0.07), [0.7, 1, 0.7], true),
    prop(kit('fire').volc[0], kit('fire').volcMat, slots(120, 900, 30, 0.1), [1, 1.2, 1]),
    prop(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x2a1512, transparent: true, opacity: 0.5, depthWrite: false }),
      slots(120, 900, 30, 0.1),
      [0.9, 0.6, 0.9],
      true,
    ),
  ];
}

/* ---------- cambiar de mundo (o salir de él) ---------- */
let cur = null;
function apply(look) {
  /* lo del mundo anterior se oculta */
  if (cur) {
    for (const m of RANGES[cur]) m.visible = false;
    for (const p of PROPS[cur]) p.mesh.visible = false;
  }
  cur = look;
  const on = !!look;
  spaceShown(!on); // dentro de un mundo no se ven los planetas ni las galaxias
  if (!dome) {
    if (!on) return;
    mkDome();
    mkLand();
  }
  dome.visible = land.visible = on;
  if (!on) {
    mood(null);
    stars3.material.color.setHex(0xc8d6ff);
    stars3.material.size = 5;
    return;
  }
  const T = THEME[look],
    haze = worldSeen().sky;
  if (!RANGES[look]) {
    RANGES[look] = T.ranges.map((spec) => mkRange(spec, haze));
    PROPS[look] = mkProps(look);
  }
  for (const m of RANGES[look]) m.visible = true;
  for (const p of PROPS[look]) p.mesh.visible = true;
  domeMat.uniforms.uTop.value.setHex(T.top);
  domeMat.uniforms.uLow.value.setHex(haze);
  domeMat.uniforms.uKind.value = landMat.uniforms.uKind.value = T.kind;
  mood(T);
  stars3.material.color.setHex(T.air[0]);
  stars3.material.size = T.air[1];
}
/* qué mundo usa la pista para pintarse (0 = el vidrio del espacio) */
export const worldKind = () => (cur ? THEME[cur].kind : 0);

/* Cada cuadro: acomoda el cielo, el terreno y el paisaje del mundo que se esté jugando. */
export function worldTick(now) {
  const look = worldLook();
  if (look !== cur) apply(look);
  if (!look) return;
  dome.position.copy(camera.position);
  domeMat.uniforms.uTime.value = now;
  for (const m of RANGES[look]) m.position.set(camera.position.x, 0, camera.position.z);
  /* terreno: igual que la pista, pero más ancho y un poco más abajo */
  for (let i = 0; i <= TSEG; i++) {
    const z = 260 - i * TLEN,
      b = bd(z),
      cx = G.bendX * b,
      cy = LAND_Y + G.bendY * b,
      k = i * 6;
    landPos[k] = cx - LAND_W;
    landPos[k + 1] = cy;
    landPos[k + 2] = z;
    landPos[k + 3] = cx + LAND_W;
    landPos[k + 4] = cy;
    landPos[k + 5] = z;
  }
  landGeo.attributes.position.needsUpdate = true;
  landMat.uniforms.uScroll.value = G.scroll;
  landMat.uniforms.uTime.value = now;
  landMat.uniforms.uFog.value.copy(bgCol);
  /* paisaje: cada figura avanza con la pista y vuelve a empezar al fondo */
  const span = far() + 300;
  for (const p of PROPS[look]) {
    for (let i = 0; i < N_PROP; i++) {
      const s = p.slots[i],
        z = 300 - ((((s.z - G.scroll) % span) + span) % span),
        b = bd(z),
        up = p.flicker ? 0.75 + 0.35 * Math.sin(now * 7 + s.ph) : 1;
      _d.position.set(s.x + G.bendX * b, LAND_Y + G.bendY * b, z);
      _d.rotation.set(s.tilt, s.rot, s.tilt * 0.6);
      _d.scale.set(s.s * p.shape[0], s.s * p.shape[1] * up, s.s * p.shape[2]);
      _d.updateMatrix();
      p.mesh.setMatrixAt(i, _d.matrix);
    }
    p.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* =====================================================================================
   OBSTÁCULOS Y ENEMIGOS DE CADA MUNDO
   ===================================================================================== */
const KIT = {};
/* grietas encendidas de la lava, para que las rocas de fuego brillen por dentro */
function lavaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 128, 128);
  x.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let px = vrand() * 128,
      py = vrand() * 128;
    x.beginPath();
    x.moveTo(px, py);
    for (let s = 0; s < 5; s++) {
      px += (vrand() - 0.5) * 46;
      py += (vrand() - 0.5) * 46;
      x.lineTo(px, py);
    }
    x.strokeStyle = i % 3 ? '#ff7a1a' : '#ffd24a';
    x.lineWidth = 1.5 + vrand() * 3.5;
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function kit(look) {
  if (KIT[look]) return KIT[look];
  if (look === 'ice') {
    const shard = new THREE.OctahedronGeometry(1);
    shard.scale(0.42, 1.15, 0.42);
    return (KIT.ice = {
      shard,
      block: [0, 1, 2].map(() => lump(0, 0.9)),
      ice: new THREE.MeshStandardMaterial({
        color: 0xeefaff,
        emissive: 0x4fb8f0,
        emissiveIntensity: 0.85,
        roughness: 0.18,
        metalness: 0.15,
        flatShading: true,
        transparent: true,
        opacity: 0.93,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0xeaf8ff,
        emissive: 0x3d8fc0,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        flatShading: true,
      }),
      crystal: new THREE.OctahedronGeometry(1),
      spike: new THREE.ConeGeometry(0.16, 1, 5),
      /* montaña: la roca de abajo y la nieve de la cumbre */
      peak: cone(1, 2.1, 7),
      cap: cone(0.5, 1.05, 7),
      stone: new THREE.MeshStandardMaterial({ color: 0x3f78ac, roughness: 0.85, flatShading: true }),
      snow: new THREE.MeshStandardMaterial({
        color: 0xf6fcff,
        roughness: 0.6,
        flatShading: true,
        emissive: 0x7fb4d8,
        emissiveIntensity: 0.3,
      }),
    });
  }
  const lava = lavaTexture();
  return (KIT.fire = {
    rocks: [0, 1, 2, 3].map(() => lump(1, 0.88)),
    rock: new THREE.MeshStandardMaterial({
      color: 0x24130f,
      roughness: 1,
      flatShading: true,
      emissive: 0xffffff,
      emissiveMap: lava,
      emissiveIntensity: 1.25,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x3a120a,
      roughness: 1,
      flatShading: true,
      emissive: 0xffffff,
      emissiveMap: lava,
      emissiveIntensity: 2.1,
    }),
    body: new THREE.ConeGeometry(0.46, 1.5, 4),
    /* volcán: un cono cortado arriba, con el cráter encendido y lava bajando */
    volcano: (() => {
      const g = new THREE.CylinderGeometry(0.3, 1, 1.75, 8);
      g.translate(0, 0.875, 0);
      return g;
    })(),
    bump: cone(1, 1, 6),
    /* el volcán con relieve: basalto oscuro, ceniza, y el borde del cráter al rojo */
    volc: [0, 1, 2].map(() =>
      crag(
        0.36,
        1.75,
        11,
        5,
        0.07,
        (t, n, c) =>
          c.setHex(
            t > 0.95
              ? 0xe2500c
              : t > 0.84
                ? 0x7a1e06
                : n > 0.8
                  ? 0x3a2c28
                  : t < 0.15
                    ? 0x140a08
                    : n > 0.4
                      ? 0x24120d
                      : 0x1b0e0a,
          ),
        0.06,
      ),
    ),
    volcMat: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    tube: new THREE.CylinderGeometry(1, 1, 1, 5),
    puff: new THREE.IcosahedronGeometry(1, 1),
    smoke: new THREE.MeshBasicMaterial({ color: 0x2a1d1a, transparent: true, opacity: 0.6, depthWrite: false }),
    basalt: new THREE.MeshStandardMaterial({
      color: 0x1f100c,
      roughness: 1,
      flatShading: true,
      emissive: 0xffffff,
      emissiveMap: lava,
      emissiveIntensity: 0.75,
    }),
    wing: (() => {
      const s = new THREE.Shape();
      s.moveTo(0, 0.25);
      s.lineTo(1.25, 0.7);
      s.lineTo(0.95, 0.1);
      s.lineTo(1.4, -0.35);
      s.lineTo(0.7, -0.25);
      s.lineTo(0.5, -0.7);
      s.lineTo(0, -0.35);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
      g.rotateX(-Math.PI / 2); // acostada: el ala se abre hacia los lados
      return g;
    })(),
  });
}

/* ---------- obstáculos ---------- */
/* Montaña plantada en la pista. Mide 1 de radio en la base (quien la usa la agranda); la base va
   al nivel de la pista, que queda por debajo de donde flotan los demás obstáculos. */
function worldPeak(o, look) {
  if (MORE[look]) return MORE[look].peak(o);
  const K = kit(look),
    g = new THREE.Group(),
    m = new THREE.Group(); // la montaña en sí, bajada hasta el suelo
  const add = (geo, mat, s, x, y, z, ry) => {
    const p = new THREE.Mesh(geo, mat);
    p.scale.set(s[0], s[1], s[2]);
    p.position.set(x, y, z);
    p.rotation.y = ry || 0;
    m.add(p);
    return p;
  };
  if (look === 'ice') {
    /* un pico principal y dos o tres más bajos a su alrededor, todos con la cumbre nevada */
    const tops = [[0, 0, 1, 1]];
    const n = 2 + Math.floor(vrand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + vrand() * 0.8;
      tops.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.5 + vrand() * 0.14, 0.55 + vrand() * 0.25]);
    }
    for (const [x, z, w, h] of tops) {
      const ry = vrand() * 6.28;
      const tall = h * 1.35; // altas, para que se vean venir
      add(K.peak, K.stone, [w, tall, w], x, 0, z, ry);
      add(K.cap, K.snow, [w * 1.04, tall, w * 1.04], x, 1.05 * tall, z, ry);
    }
  } else {
    const F = flat(),
      smoke = [],
      embers = [];
    add(K.volc[Math.floor(vrand() * K.volc.length)], K.volcMat, [1, 1, 1], 0, 0, 0, vrand() * 6.28);
    /* el cráter: lava al rojo, un resplandor y un chorro que sube */
    add(F.disc, bmat('#ff9a1e'), [0.4, 1, 0.4], 0, 1.6, 0);
    add(F.disc, bmat('#fff0a0'), [0.2, 1, 0.2], 0, 1.62, 0);
    add(SPH, bmat('#ff7a1a', true, 0.4), [0.62, 0.5, 0.62], 0, 1.85, 0);
    const jet = add(K.bump, bmat('#ffb02a', true, 0.75), [0.14, 0.8, 0.14], 0, 1.65, 0);
    /* ríos de lava que bajan por la ladera, cada uno hasta su charco al pie */
    const flows = 3 + Math.floor(vrand() * 2);
    for (let i = 0; i < flows; i++) {
      const a0 = (i / flows) * 6.28 + vrand() * 0.9;
      let px, py, pz;
      for (let j = 0; j <= 5; j++) {
        const t = j / 5,
          rr = (0.36 + 0.64 * t) * 1.07,
          a = a0 + Math.sin(j * 1.3 + i * 2) * 0.12,
          x = Math.cos(a) * rr,
          y = 1.75 * (1 - t) + 0.01,
          z = Math.sin(a) * rr;
        if (j) {
          m.add(between(new THREE.Mesh(K.tube, bmat('#ff8a14')), px, py, pz, x, y, z, 0.03 * (1 + t)));
          m.add(between(new THREE.Mesh(K.tube, bmat('#ff5a14', true, 0.3)), px, py, pz, x, y, z, 0.085 * (1 + t)));
        }
        px = x;
        py = y;
        pz = z;
      }
      add(F.disc, bmat('#ff8a1a'), [0.17, 1, 0.13], px * 1.04, 0.02, pz * 1.04, -a0);
      add(F.disc, bmat('#ffd24a'), [0.08, 1, 0.06], px * 1.04, 0.03, pz * 1.04, -a0);
    }
    /* conos más bajos pegados al volcán, también encendidos, y rocas con vetas de lava al pie */
    for (let i = 0; i < 2; i++) {
      const a = vrand() * 6.28,
        w = 0.34 + vrand() * 0.1,
        h = 0.3 + vrand() * 0.12,
        x = Math.cos(a) * 0.86,
        z = Math.sin(a) * 0.86;
      add(K.volc[i], K.volcMat, [w, h, w], x, 0, z, vrand() * 6);
      add(F.disc, bmat('#ff9a1e'), [w * 0.36, 1, w * 0.36], x, 1.6 * h, z);
      add(SPH, bmat('#ff7a1a', true, 0.4), [w * 0.5, w * 0.4, w * 0.5], x, 1.8 * h, z);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.28 + vrand(),
        w = 0.16 + vrand() * 0.1;
      add(K.rocks[i], K.basalt, [w, w * 0.8, w], Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05, vrand() * 6);
    }
    add(SPH, bmat('#ff5a14', true, 0.12), [1.5, 1.2, 1.5], 0, 0.9, 0);
    /* humo que sube y chispas que saltan del cráter */
    for (let i = 0; i < 5; i++) smoke.push(add(K.puff, K.smoke, [0.2, 0.2, 0.2], 0, 1.8, 0));
    for (let i = 0; i < 6; i++) {
      const a = vrand() * 6.28,
        d = 0.35 + vrand() * 0.6;
      embers.push({
        m: add(SPH, bmat('#ffd24a'), [0.035, 0.035, 0.035], 0, 1.7, 0),
        dx: Math.cos(a) * d,
        dz: Math.sin(a) * d,
        up: 0.5 + vrand() * 0.7,
        ph: vrand(),
      });
    }
    m.scale.y = 1.12; // algo más alto, para que se vea venir
    g.userData.tick = (now) => {
      smoke.forEach((sm, i) => {
        const k = (now * 0.2 + i / smoke.length) % 1;
        sm.position.set(Math.sin(k * 4 + i) * 0.14 + k * 0.3, 1.75 + k * 1.7, 0);
        sm.scale.setScalar((0.16 + k * 0.5) * (k > 0.85 ? (1 - k) * 6.6 : 1));
      });
      for (const e of embers) {
        const k = (now * 0.7 + e.ph) % 1;
        e.m.position.set(e.dx * k, 1.68 + e.up * 4 * k * (1 - k), e.dz * k);
      }
      jet.scale.y = 0.6 + 0.35 * Math.sin(now * 9);
    };
  }
  m.position.y = TRACK_Y / o.r;
  g.add(m);
  g.scale.setScalar(o.r);
  g.userData.tilt = 0; // no da vueltas: está plantada
  return g;
}
export function worldRock(o, look) {
  /* un arco: lo dibuja su pilar izquierdo; el derecho solo choca */
  if (o.archEnd) return new THREE.Group();
  if (o.arch && MORE[look]) return MORE[look].arch(o);
  if (o.pool) return worldPool(o);
  if (o.peak) return worldPeak(o, look);
  if (MORE[look]) {
    const inner = MORE[look].rock(o),
      g = new THREE.Group();
    g.add(inner);
    g.scale.setScalar(o.r);
    g.userData.steady = !!inner.userData.steady; // lo que viene derecho no da vueltas
    g.userData.tilt = g.userData.steady ? 0 : vrand() * 6;
    return g;
  }
  const K = kit(look),
    g = new THREE.Group();
  if (look === 'ice') {
    if (o.wall) {
      /* témpano: un bloque de hielo con agujas encima */
      const blk = new THREE.Mesh(K.block[Math.floor(vrand() * K.block.length)], K.wall);
      g.add(blk);
      for (let i = 0; i < 2; i++) {
        const s = new THREE.Mesh(K.shard, K.ice);
        s.scale.setScalar(0.55 + vrand() * 0.25);
        s.position.set((vrand() - 0.5) * 0.9, 0.5, (vrand() - 0.5) * 0.9);
        s.rotation.set(vrand() - 0.5, 0, vrand() - 0.5);
        g.add(s);
      }
    } else {
      /* un racimo de agujas de hielo */
      const n = 3 + Math.floor(vrand() * 2);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Mesh(K.shard, K.ice),
          a = (i / n) * 6.28 + vrand();
        s.scale.setScalar(i ? 0.5 + vrand() * 0.3 : 0.95);
        s.position.set(i ? Math.cos(a) * 0.42 : 0, 0, i ? Math.sin(a) * 0.42 : 0);
        s.rotation.set(i ? Math.sin(a) * 0.7 : 0, vrand() * 3, i ? -Math.cos(a) * 0.7 : 0);
        g.add(s);
      }
    }
  } else {
    /* roca de lava: negra por fuera, encendida en las grietas, con un resplandor */
    g.add(new THREE.Mesh(K.rocks[Math.floor(vrand() * K.rocks.length)], o.wall ? K.wall : K.rock));
    const halo = new THREE.Mesh(SPH, bmat(o.wall ? '#ff7a1a' : '#ff5a14', true, o.wall ? 0.22 : 0.14));
    halo.scale.setScalar(1.35);
    g.add(halo);
  }
  g.scale.setScalar(o.r);
  g.userData.tilt = vrand() * 6;
  return g;
}

/* ---------- enemigos ---------- */
export function worldEnemy(e, look) {
  if (MORE[look]) {
    const made = MORE[look].enemy(e);
    made.group.scale.setScalar(e.r * 1.3);
    made.group.userData = {
      mat: made.mat,
      dispose() {
        made.mat.dispose();
      },
    };
    return made.group;
  }
  const K = kit(look),
    g = new THREE.Group();
  let mat;
  if (look === 'ice') {
    /* dron de escarcha: un cristal plano con tres púas al frente y un corazón de luz */
    const hex = e.heavy ? '#ffffff' : '#9fe8ff';
    mat = new THREE.MeshStandardMaterial({
      color: e.heavy ? 0xf2fbff : 0x86cdf2,
      metalness: 0.35,
      roughness: 0.2,
      flatShading: true,
    });
    const body = new THREE.Mesh(K.crystal, mat);
    body.scale.set(1.05, 0.42, 0.85);
    g.add(body);
    for (const sx of [-1, 0, 1]) {
      const sp = new THREE.Mesh(K.spike, mat);
      sp.rotation.x = Math.PI / 2; // la punta hacia el jugador
      sp.scale.set(1, sx ? 0.8 : 1.25, 1);
      sp.position.set(sx * 0.55, 0, 0.75 + (sx ? 0 : 0.2));
      g.add(sp);
    }
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(K.crystal, mat);
      fin.scale.set(0.28, 0.2, 0.6);
      fin.position.set(sx * 1.15, 0.05, -0.2);
      fin.rotation.y = sx * 0.5;
      g.add(fin);
    }
    const core = new THREE.Mesh(SPH, bmat(hex));
    core.scale.setScalar(0.22);
    core.position.y = 0.32;
    g.add(core);
    const glow = new THREE.Mesh(SPH, bmat(hex, true, 0.32));
    glow.scale.setScalar(0.5);
    glow.position.y = 0.32;
    g.add(glow);
  } else {
    /* murciélago de magma: cuerpo oscuro, alas de fuego y ojos encendidos */
    mat = new THREE.MeshStandardMaterial({
      color: e.heavy ? 0x5a1a0c : 0x34120c,
      metalness: 0.3,
      roughness: 0.6,
      flatShading: true,
    });
    const body = new THREE.Mesh(K.body, mat);
    body.rotation.x = Math.PI / 2; // la punta hacia el jugador
    body.rotation.z = Math.PI / 4;
    g.add(body);
    const fire = bmat(e.heavy ? '#ffd24a' : '#ff7a1a');
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(K.wing, fire);
      w.scale.set(sx, 1, 1);
      w.position.set(sx * 0.25, 0.1, -0.1);
      w.rotation.z = sx * 0.28; // las alas, algo levantadas
      g.add(w);
      const eye = new THREE.Mesh(SPH, bmat('#fff3bf'));
      eye.scale.setScalar(0.09);
      eye.position.set(sx * 0.17, 0.2, 0.42);
      g.add(eye);
    }
    const glow = new THREE.Mesh(SPH, bmat(e.heavy ? '#ffd24a' : '#ff5a14', true, 0.28));
    glow.scale.set(1.2, 0.45, 0.9);
    g.add(glow);
  }
  g.scale.setScalar(e.r * 1.3);
  g.userData = {
    mat,
    dispose() {
      mat.dispose();
    },
  };
  return g;
}
/* colores de lo que cruza la pista en cada mundo (bolas de fuego en el de fuego) */
export const worldComet = (look) =>
  look === 'fire'
    ? { shell: 0xff8a2a, tail: 0xff4a0a, trail: 0xffd24a, glow: 0xffb454 }
    : (MORE[look] && MORE[look].comet) || null;

/* =====================================================================================
   CHARCOS DE LAVA Y COSAS QUE EXPLOTAN
   ===================================================================================== */
let FLAT;
function flat() {
  if (FLAT) return FLAT;
  const lay = (g) => {
    g.rotateX(-Math.PI / 2);
    return g;
  };
  return (FLAT = {
    disc: lay(new THREE.CircleGeometry(1, 36)),
    ring: lay(new THREE.RingGeometry(0.9, 1, 48)),
    edge: lay(new THREE.RingGeometry(0.9, 1.16, 28)),
    rim: lay(new THREE.TorusGeometry(0.6, 0.17, 6, 18)),
    rock: lump(1, 0.9),
    tail: cone(0.42, 1, 8),
  });
}
/* Charco de lava: plano, al nivel de la pista. Hierve: unas burbujas suben y bajan. */
function worldPool(o) {
  const F = flat(),
    bubbles = [];
  const g = planted(o, (add) => {
    const turn = vrand() * 6.28;
    add(F.disc, bmat('#ff5a14', true, 0.2), [1.45, 1, 1.3], 0, 0.01, 0, turn); // el resplandor alrededor
    add(F.edge, kit('fire').basalt, [1, 1, 0.86], 0, 0.03, 0, turn); // el borde de piedra
    add(F.disc, bmat('#ff7a1a'), [0.93, 1, 0.8], 0, 0.04, 0, turn);
    add(F.disc, bmat('#ffd24a'), [0.55, 1, 0.42], 0.1, 0.05, 0.05, turn);
    for (let i = 0; i < 4; i++) {
      const a = vrand() * 6.28,
        d = vrand() * 0.5;
      bubbles.push(add(SPH, bmat('#ffe9a8'), [0.09, 0.09, 0.09], Math.cos(a) * d, 0.06, Math.sin(a) * d * 0.8));
    }
  });
  g.userData.tick = (now) =>
    bubbles.forEach((b, i) => {
      const k = (now * 0.9 + i * 0.37) % 1;
      b.scale.setScalar(0.05 + 0.1 * Math.sin(k * Math.PI));
      b.position.y = 0.06 + k * 0.14;
    });
  return g;
}

const BLAST = {
  fire: [0xff8a2a, 0xffd24a],
  gas: [0x9dff5a, 0xe8ffb0],
  ice: [0x7fd8ff, 0xffffff],
  city: [0xff4fc8, 0x8ae8ff],
  hole: [0xc792ff, 0xff8a3c],
};
const UP = new THREE.Vector3(0, 1, 0);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/* piezas de los avisos que no cambian de un aviso a otro */
function blastKit() {
  const F = flat();
  if (F.mound) return F;
  const strip = new THREE.PlaneGeometry(1, 1);
  strip.rotateX(-Math.PI / 2);
  F.strip = strip;
  F.mound = crag(0.5, 0.4, 10, 2, 0.1, (t, n, c) => c.setHex(t > 0.8 ? 0x8a6a40 : n > 0.5 ? 0x4a3018 : 0x2a1a0c));
  F.stone = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  F.icicle = cone(0.55, 2.8, 6);
  F.ice = new THREE.MeshStandardMaterial({
    color: 0xeefaff,
    emissive: 0x4fb8f0,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    flatShading: true,
  });
  F.flesh = new THREE.MeshStandardMaterial({ color: 0x1c0a30, emissive: 0x3a0f66, roughness: 0.5 });
  F.hide = new THREE.MeshStandardMaterial({ color: 0x0c0418, emissive: 0x1c0638, roughness: 0.7 });
  return F;
}
/**
 * Una zona que va a golpear (game/blasts.js). En el suelo, el aviso: un aro (o una franja) y un
 * relleno que crece; cuando se llena, golpea. Encima, lo que golpea: el meteorito bajando del
 * cielo, el cráter hirviendo, la púa de hielo, el rayo o el tentáculo.
 */
export function mkBlast(z) {
  const F = blastKit(),
    C = BLAST[worldLook()] || BLAST.fire,
    g = new THREE.Group(),
    see = (color, opacity, add) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    ringM = see(C[0], 0.9),
    fillM = see(C[0], 0.3),
    hotM = see(C[1], 0.8, true),
    part = (geo, mat, parent) => {
      const m = new THREE.Mesh(geo, mat);
      (parent || g).add(m);
      return m;
    };
  let fill, fall, jet, glow, spike, sheet;
  const segs = [];
  if (z.col) {
    /* una franja a lo largo de la pista: el fondo, y el relleno que se ensancha hasta cubrirla */
    const back = part(F.strip, ringM);
    back.scale.set(z.w * 2, 1, z.len);
    fill = part(F.strip, fillM);
    fill.position.y = 0.4;
    if (z.kind === 'beam') {
      sheet = part(BOX, hotM); // el rayo: una pared de luz sobre el carril
      sheet.position.y = 23;
    } else for (let i = 0; i < 13; i++) segs.push(part(SPH, i === 12 ? see(C[1], 1) : i % 2 ? F.flesh : F.hide));
  } else {
    const ring = part(F.ring, ringM);
    fill = part(F.disc, fillM);
    fill.position.y = 0.02;
    if (z.kind === 'meteor') {
      /* el meteorito: una roca encendida con su cola, que baja en diagonal */
      fall = new THREE.Group();
      part(F.rock, kit('fire').rock, fall).scale.setScalar(0.42);
      part(SPH, hotM, fall).scale.setScalar(0.62);
      part(F.tail, see(C[0], 0.55, true), fall).scale.set(1, 4.2, 1);
      const from = new THREE.Vector3(z.side * 5, 13, -8); // de dónde viene (en radios)
      fall.userData.from = from;
      fall.quaternion.setFromUnitVectors(UP, from.clone().normalize()); // la cola, hacia atrás
      g.add(fall);
    } else if (z.kind === 'crater') {
      /* el cráter: un cono bajo de piedra, el fondo que brilla y un chorro que crece hasta estallar */
      part(F.mound, F.stone).scale.set(0.8, 1, 0.8);
      glow = part(F.disc, hotM);
      glow.position.y = 0.3;
      jet = part(F.tail, see(C[0], 0.5, true));
      jet.position.y = 0.3;
    } else if (z.kind === 'spike') {
      spike = part(F.icicle, F.ice); // la púa: sale del suelo de golpe
      ring.scale.setScalar(0.96);
    }
    g.scale.setScalar(z.r);
  }
  g.userData = {
    tick(z, now) {
      const k = clamp01(1 - z.t / z.t0), // 0 recién salió … 1 golpea
        beat = 0.5 + 0.5 * Math.sin(now * (7 + k * 22)), // late más rápido cuanto menos falta
        gone = z.hit ? clamp01(1 - z.after / z.linger) : 0; // 0 acaba de golpear … 1 se va
      ringM.opacity = z.hit ? 0.3 * (1 - gone) : z.col ? 0.16 + 0.2 * beat : 0.45 + 0.5 * beat;
      fillM.opacity = z.hit ? 0 : 0.2 + 0.32 * k;
      if (z.col) fill.scale.set(z.w * 2 * Math.max(0.05, k), 1, z.len);
      else fill.scale.setScalar(Math.max(0.05, k)); // el círculo se llena: cuando llega al aro, golpea
      if (fall) {
        fall.position.copy(fall.userData.from).multiplyScalar(1 - k);
        fall.rotation.y += 0.2;
      } else if (jet) {
        const boil = z.t < 1.6 ? 1 - z.t / 1.6 : 0; // el último segundo y medio
        hotM.opacity = 0.35 + 0.6 * Math.max(boil, 0.25 * beat);
        glow.scale.setScalar(0.38 + 0.08 * beat);
        jet.scale.set(0.6 + boil * 0.5, 0.3 + boil * 3.2 + 0.25 * beat, 0.6 + boil * 0.5);
      } else if (spike) {
        spike.scale.setScalar(z.hit ? Math.min(1, (z.linger - z.after) / 0.07) * (1 - gone * gone) + 0.001 : 0.001);
      } else if (sheet) {
        hotM.opacity = z.hit ? 0.6 * (1 - gone) : 0;
        sheet.scale.set(z.w * 1.5, 46, z.len);
      } else if (segs.length) {
        /* el tentáculo sale desde el jefe, se levanta sobre la franja y al final cae de golpe */
        const out = z.hit ? 1 - gone * gone : Math.min(1, k * 2.5),
          up = z.hit ? 0 : k < 0.78 ? 1 : Math.pow(1 - (k - 0.78) / 0.22, 2);
        segs.forEach((s, i) => {
          const t = i / (segs.length - 1);
          s.position.set(
            Math.sin(now * 3 + i * 0.7) * 7 * up * t,
            9 + up * (30 + 150 * t * (1 - t * 0.35)),
            -z.len / 2 + t * z.len * out,
          );
          s.scale.setScalar(out > 0.03 ? 17 - 10 * t : 0.001);
        });
      }
    },
    dispose() {
      ringM.dispose();
      fillM.dispose();
      hotM.dispose();
    },
  };
  return g;
}
