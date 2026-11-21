// ============================================================
//  Cena-conceito "Cidade do Saber" — diorama de cidade com pista
//  sinuosa em "8", viaduto, prédios, parque, lago, peões (carrinhos)
//  e arco de largada. Gera as imagens-modelo do jogo de percurso.
//  Tudo procedural (sem arquivos externos).
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') || 'aerea';
if (params.has('hud')) document.body.classList.add('com-hud');

// ── Aleatório determinístico ─────────────────────────────────
let semente = 1234567;
const rnd = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
const entre = (a, b) => a + rnd() * (b - a);
const escolher = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── Renderer, cena, câmera ───────────────────────────────────
const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1F4E9A');
scene.fog = new THREE.Fog('#1F4E9A', 140, 320);
{ // Fundo em gradiente (azul da caixa do jogo, mais claro no alto)
  const geo = new THREE.SphereGeometry(300, 24, 12);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color('#163F85') }, b: { value: new THREE.Color('#5E9BE6') } },
    vertexShader: 'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying float vy; void main(){ gl_FragColor = vec4(mix(a, b, smoothstep(-0.2, 0.9, vy)), 1.0); }' });
  const d = new THREE.Mesh(geo, m); d.renderOrder = -1; d.frustumCulled = false; scene.add(d);
}
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.5, 400);

// ── Materiais compartilhados ─────────────────────────────────
const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0, ...extra });
const PALETA = ['#E9607A', '#D9433B', '#F2C14E', '#58A55C', '#3E7CB1', '#F5EAD3', '#EE8B3A', '#3BA9A0', '#9B59B6', '#C9A66B'];
const CORES_JOGADORES = ['#E0A537', '#3E7CB1', '#D9433B', '#58A55C', '#9B59B6', '#E9607A'];
const GRUPOS_CASAS = ['#8FD3F4', '#F7B267', '#F4845F', '#E9607A', '#9B59B6', '#58A55C', '#F2C14E', '#3E7CB1'];

// ── Texturas em canvas ───────────────────────────────────────
function tex(fn, w = 256, h = 256, repete = [1, 1]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repete);
  return t;
}
const texGrama = tex((c, w, h) => {
  c.fillStyle = '#6FBF4A'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { c.fillStyle = `hsl(${100 + rnd() * 20}, ${45 + rnd() * 25}%, ${38 + rnd() * 22}%)`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
}, 512, 512, [14, 14]);
const texAsfalto = tex((c, w, h) => {
  c.fillStyle = '#4A4F58'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { c.fillStyle = `rgba(${rnd() < 0.5 ? 30 : 110},${rnd() < 0.5 ? 32 : 115},${rnd() < 0.5 ? 38 : 125},${rnd() * 0.5})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  // v = largura da pista (0 esquerda, 1 direita); u = comprimento (1 textura = 8 m)
  c.fillStyle = '#F5F0DC'; c.fillRect(0, 6, w, 5); c.fillRect(0, h - 11, w, 5);           // faixas das bordas
  c.fillStyle = '#F2C14E'; c.fillRect(0, h / 2 - 3, w * 0.45, 6); c.fillRect(w * 0.55, h / 2 - 3, w * 0.3, 6); // tracejado central
}, 512, 256, [1, 1]);
function texJanelas(corBase, lit = 0.12, cols = 6, rows = 8) {
  return tex((c, w, h) => {
    c.fillStyle = corBase; c.fillRect(0, 0, w, h);
    const jw = w / cols, jh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const aceso = rnd() < lit;
      c.fillStyle = aceso ? `hsl(${40 + rnd() * 15}, 90%, ${72 + rnd() * 15}%)` : 'rgba(30,45,70,.85)';
      c.fillRect(x * jw + jw * 0.22, y * jh + jh * 0.22, jw * 0.56, jh * 0.5);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x * jw + jw * 0.22, y * jh + jh * 0.22, jw * 0.56, jh * 0.08);
    }
  }, 256, 384, [1, 1]);
}
function texNumero(n, corFundo) {
  return tex((c, w, h) => {
    c.fillStyle = corFundo; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#161F38'; c.font = '700 120px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), w / 2, h / 2 + 6);
  });
}
const texXadrez = tex((c, w, h) => { const n = 8; for (let y = 0; y < n; y++) for (let x = 0; x < n * 4; x++) { c.fillStyle = (x + y) % 2 ? '#161F38' : '#FBF7EF'; c.fillRect(x * w / (n * 4), y * h / n, w / (n * 4) + 1, h / n + 1); } }, 512, 128);
const texFaixa = tex((c, w, h) => {
  c.fillStyle = '#E0A537'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#161F38'; c.font = '700 150px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('LARGADA · CHEGADA', w / 2, h / 2 + 8);
}, 2048, 256);

// ── Luzes ────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight('#DCEBFF', '#2E4A7A', 1.1));
const sol = new THREE.DirectionalLight('#FFF0D6', 3.0);
sol.position.set(38, 52, 26); sol.target.position.set(0, 0, 0);
sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 160 });
sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.04; sol.shadow.radius = 2;
scene.add(sol, sol.target);
const contorno = new THREE.DirectionalLight('#9CC4FF', 1.1); contorno.position.set(-30, 18, -40); scene.add(contorno);
const luzQuente = new THREE.PointLight('#FFC27A', 25, 60, 1.6); luzQuente.position.set(0, 14, 0); scene.add(luzQuente);

// Ambiente (reflexos) a partir de um estúdio simples
{
  const pm = new THREE.PMREMGenerator(renderer);
  const est = new THREE.Scene();
  est.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#2A4A86', side: THREE.BackSide })));
  const luz = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ color: '#FFF2DD' })); luz.position.set(0, 30, -20); luz.lookAt(0, 0, 0); est.add(luz);
  scene.environment = pm.fromScene(est, 0.05).texture; scene.environmentIntensity = 0.5; pm.dispose();
}

// ── Mesa e base do diorama ───────────────────────────────────
{
  const mesa = new THREE.Mesh(new THREE.CircleGeometry(260, 48), mat('#173C7E', { roughness: 0.95 }));
  mesa.rotation.x = -Math.PI / 2; mesa.position.y = -3.2; mesa.receiveShadow = true; scene.add(mesa);
  const base = new THREE.Mesh(new RoundedBoxGeometry(66, 3, 66, 4, 0.9), mat('#1F4E9A', { roughness: 0.55 }));
  base.position.y = -1.6; base.castShadow = base.receiveShadow = true; scene.add(base);
  const grama = new THREE.Mesh(new RoundedBoxGeometry(63, 0.6, 63, 3, 0.3), mat('#FFFFFF', { map: texGrama, roughness: 0.95 }));
  grama.position.y = -0.3; grama.receiveShadow = true; scene.add(grama);
}

// ── Pista em "8" com viaduto ─────────────────────────────────
const pontos = [[4, -3], [16, -15], [26, -2], [18, 12], [6, 7], [-8, -5], [-20, -15], [-27, 0], [-16, 13], [-6, 9]].map(([x, z]) => new THREE.Vector3(x, 0, z));
const curva = new THREE.CatmullRomCurve3(pontos, true, 'catmullrom', 0.6);
const N = 640;
const amostras = curva.getSpacedPoints(N); amostras.pop(); // fechada: último = primeiro
const comprimento = curva.getLength();
// Altura do viaduto: trecho 4→5 (u ≈ 0.4..0.5) passa por cima do cruzamento
const cruz = new THREE.Vector3(0, 0, 1.8);
let iCruzA = 0, iCruzB = 0, dA = 1e9, dB = 1e9;
amostras.forEach((p, i) => { const d = p.distanceTo(cruz); const u = i / N; if (u > 0.35 && u < 0.55 && d < dA) { dA = d; iCruzA = i; } if ((u > 0.85 || u < 0.08) && d < dB) { dB = d; iCruzB = i; } });
const ALT = 6.0, RAMPA = 0.075;
const altura = (i) => { let du = Math.abs(i - iCruzA) / N; du = Math.min(du, 1 - du); const t = THREE.MathUtils.clamp((du - 0.02) / RAMPA, 0, 1); return ALT * (1 - (t * t * (3 - 2 * t))); };
const centro = amostras.map((p, i) => new THREE.Vector3(p.x, altura(i), p.z));
const tangente = (i) => { const a = centro[(i + 1) % N], b = centro[(i - 1 + N) % N]; return new THREE.Vector3().subVectors(a, b).normalize(); };
const lateral = (i) => { const t = tangente(i); return new THREE.Vector3(-t.z, 0, t.x).normalize(); };
const LARG = 4.2;

function fita(largura, deslocY, matFita, uvEscala = 1, deslocLateral = 0) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, c = centro[k], l = lateral(k);
    const e = c.clone().addScaledVector(l, -largura / 2 + deslocLateral), d = c.clone().addScaledVector(l, largura / 2 + deslocLateral);
    pos.push(e.x, e.y + deslocY, e.z, d.x, d.y + deslocY, d.z);
    const u = (i / N) * comprimento / 8 * uvEscala;
    uv.push(u, 0, u, 1);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, matFita); m.receiveShadow = true; m.castShadow = true; return m;
}
scene.add(fita(LARG, 0.12, mat('#FFFFFF', { map: texAsfalto, roughness: 0.85 })));
scene.add(fita(0.35, 0.2, mat('#D9D2C2', { roughness: 0.8 }), 1, -LARG / 2 - 0.15)); // guias
scene.add(fita(0.35, 0.2, mat('#D9D2C2', { roughness: 0.8 }), 1, LARG / 2 + 0.15));
scene.add(fita(LARG + 0.6, -0.3, mat('#8A90A0', { roughness: 0.9 })));                  // tabuleiro do viaduto (visível só onde sobe)

// Pilares, guarda-corpo e postes do viaduto
{
  const matConcreto = mat('#C9CCD3', { roughness: 0.85 }), matGrade = mat('#F4F1E8', { roughness: 0.5, metalness: 0.2 });
  const pil = [], rails = [];
  for (let i = 0; i < N; i += 4) {
    const h = centro[i].y;
    if (h > 0.8 && i % 20 === 0 && centro[i].distanceTo(cruz) > 4.5) {
      const l = lateral(i), t = tangente(i), ang = Math.atan2(t.x, t.z);
      for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.26, 0.34, h - 0.5, 12); const p = centro[i].clone().addScaledVector(l, s * (LARG / 2 - 0.3)); g.translate(p.x, (h - 0.5) / 2, p.z); pil.push(g); }
      const viga = new THREE.BoxGeometry(LARG + 0.2, 0.4, 0.7); viga.rotateY(ang); viga.translate(centro[i].x, h - 0.7, centro[i].z); pil.push(viga);
    }
    if (h > 0.3) {
      const l = lateral(i), t = tangente(i), ang = Math.atan2(t.x, t.z);
      for (const s of [-1, 1]) {
        const p = centro[i].clone().addScaledVector(l, s * (LARG / 2 + 0.4));
        const g = new THREE.BoxGeometry(0.08, 0.9, 0.08); g.translate(p.x, h + 0.55, p.z); rails.push(g);
        const seg = centro[(i + 4) % N].distanceTo(centro[i]) + 0.1;
        const m = new THREE.BoxGeometry(0.07, 0.07, seg); m.rotateY(ang); m.translate(p.x + t.x * seg / 2, h + 1.0, p.z + t.z * seg / 2); rails.push(m);
      }
    }
  }
  const mp = new THREE.Mesh(mergeGeometries(pil, false), matConcreto); mp.castShadow = mp.receiveShadow = true; scene.add(mp);
  const mr = new THREE.Mesh(mergeGeometries(rails, false), matGrade); mr.castShadow = true; scene.add(mr);
}

// Casas do percurso: 40 placas coloridas com número
const CASAS = 40;
const posCasa = (k) => { const i = Math.round((k / CASAS) * N) % N; return { i, c: centro[i], t: tangente(i), l: lateral(i) }; };
const iLargada = Math.round(0.2 * N); // largada no lado direito da cidade
for (let k = 0; k < CASAS; k++) {
  const i = (iLargada + Math.round((k / CASAS) * N)) % N;
  const c = centro[i], t = tangente(i);
  const cor = GRUPOS_CASAS[Math.floor(k / 5) % GRUPOS_CASAS.length];
  const placa = new THREE.Mesh(new RoundedBoxGeometry(LARG - 0.9, 0.08, 2.6, 2, 0.08), new THREE.MeshStandardMaterial({ map: texNumero(k + 1, cor), roughness: 0.6 }));
  placa.position.set(c.x, c.y + 0.17, c.z);
  placa.rotation.y = Math.atan2(t.x, t.z);
  placa.receiveShadow = true;
  scene.add(placa);
}

// Arco de largada
{
  const i = iLargada, c = centro[i], t = tangente(i), l = lateral(i);
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 12), mat('#161F38', { roughness: 0.5 })); p.position.set(s * (LARG / 2 + 1.1), 3.5, 0); p.castShadow = true; g.add(p); }
  const viga = new THREE.Mesh(new THREE.BoxGeometry(LARG + 3.2, 1.4, 0.6), mat('#FFFFFF', { map: texFaixa, roughness: 0.5 })); viga.position.y = 7.2; viga.castShadow = true; g.add(viga);
  const xadrez = new THREE.Mesh(new THREE.PlaneGeometry(LARG - 0.6, 1.6), mat('#FFFFFF', { map: texXadrez })); xadrez.rotation.x = -Math.PI / 2; xadrez.position.y = 0.21; xadrez.position.z = -2.2; g.add(xadrez);
  for (const s of [-1, 1]) { const band = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 3), mat(s < 0 ? '#E0A537' : '#286456')); band.position.set(s * (LARG / 2 + 1.1), 8.3, 0); g.add(band); }
  g.position.copy(c); g.position.y += 0.1; g.rotation.y = Math.atan2(l.x, l.z);
  scene.add(g);
}

// ── Função: distância do ponto à pista ───────────────────────
function distPista(x, z) { let m = 1e9; for (let i = 0; i < N; i += 2) { const p = amostras[i]; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); }

// ── Lago e parque (dentro do laço esquerdo) ──────────────────
{
  const lago = new THREE.Mesh(new THREE.CircleGeometry(4.8, 40), new THREE.MeshStandardMaterial({ color: '#3DA6D9', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.95 }));
  lago.rotation.x = -Math.PI / 2; lago.position.set(-16, 0.02, -1); lago.scale.set(1.3, 1, 0.9); scene.add(lago);
  const borda = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.4, 40), mat('#E8D9B0', { roughness: 0.95 })); borda.rotation.x = -Math.PI / 2; borda.position.set(-16, 0.015, -1); borda.scale.set(1.3, 1, 0.9); scene.add(borda);
  const fonte = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 12), mat('#E8D9B0')); fonte.position.set(-16, 0.4, -1); scene.add(fonte);
  const jato = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 10), new THREE.MeshStandardMaterial({ color: '#BFE9FF', transparent: true, opacity: 0.8, emissive: '#7FD4FF', emissiveIntensity: 0.3 })); jato.position.set(-16, 1.6, -1); scene.add(jato);
}

// ── Prédios ──────────────────────────────────────────────────
const predios = new THREE.Group(); scene.add(predios);
function predio(x, z, w, d, h, cor) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), mat('#FFFFFF', { map: texJanelas(cor, 0.12, Math.max(2, Math.round(w / 1.0)), Math.max(2, Math.round(h / 1.1))), roughness: 0.7 }));
  corpo.position.y = h / 2; corpo.castShadow = corpo.receiveShadow = true; g.add(corpo);
  const topo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), mat(new THREE.Color(cor).multiplyScalar(0.75))); topo.position.y = h + 0.1; topo.castShadow = true; g.add(topo);
  if (rnd() < 0.6) { const caixa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 10), mat('#D9D2C2')); caixa.position.set(entre(-w / 3, w / 3), h + 0.75, entre(-d / 3, d / 3)); caixa.castShadow = true; g.add(caixa); }
  if (rnd() < 0.5) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 6), mat('#9AA0A6')); ant.position.set(entre(-w / 3, w / 3), h + 1.3, entre(-d / 3, d / 3)); g.add(ant); }
  for (let k = 0; k < 2 && rnd() < 0.7; k++) { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), mat('#CFCFCF')); ac.position.set(entre(-w / 3, w / 3), h + 0.45, entre(-d / 3, d / 3)); g.add(ac); }
  g.position.set(x, 0, z);
  predios.add(g);
  return g;
}
const ocupado = [];
const livre = (x, z, r) => { if (Math.abs(x) > 29 || Math.abs(z) > 29) return false; if (distPista(x, z) < LARG / 2 + 3.2 + r * 0.6) return false; if (Math.hypot(x + 16, z + 1) < 7.5 + r) return false; for (const o of ocupado) if (Math.hypot(o.x - x, o.z - z) < o.r + r + 0.9) return false; return true; };
// Marcos
{
  // Torre com andares escalonados (sede do banco)
  const tx = 9, tz = -8;
  ocupado.push({ x: tx, z: tz, r: 4 });
  const g = new THREE.Group();
  const andares = [[7, 7, 7, '#F5EAD3'], [5.6, 5.6, 6, '#F2C14E'], [4.2, 4.2, 5, '#F5EAD3'], [2.8, 2.8, 4, '#EE8B3A']];
  let y = 0;
  for (const [w, d, h, cor] of andares) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), mat('#FFFFFF', { map: texJanelas(cor, 0.3, Math.round(w / 1.0), Math.round(h / 1.1)), roughness: 0.65 })); m.position.y = y + h / 2; m.castShadow = m.receiveShadow = true; g.add(m); y += h; }
  const espira = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5, 8), new THREE.MeshStandardMaterial({ color: '#E0A537', emissive: '#E0A537', emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6 })); espira.position.y = y + 2.5; g.add(espira);
  g.position.set(tx, 0, tz); scene.add(g);
  // Cúpula (museu) no laço direito
  const cx = 18, cz = 2; ocupado.push({ x: cx, z: cz, r: 3.5 });
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(6.5, 4, 6.5, 2, 0.15), mat('#FFFFFF', { map: texJanelas('#F5EAD3', 0.2, 6, 4) })); corpo.position.set(cx, 2, cz); corpo.castShadow = corpo.receiveShadow = true; scene.add(corpo);
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(2.9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3BA9A0', { roughness: 0.35, metalness: 0.25 })); cupula.position.set(cx, 4, cz); cupula.castShadow = true; scene.add(cupula);
  const colunas = []; for (let k = 0; k < 6; k++) { const c = new THREE.CylinderGeometry(0.25, 0.25, 3.6, 10); c.translate(cx - 3.0 + k * 1.2, 1.8, cz + 3.5); colunas.push(c); }
  const mc = new THREE.Mesh(mergeGeometries(colunas, false), mat('#F5EAD3')); mc.castShadow = true; scene.add(mc);
}
for (let tent = 0, feitos = 0; tent < 1400 && feitos < 30; tent++) {
  const x = entre(-29, 29), z = entre(-29, 29);
  const w = entre(2.6, 5.0), d = entre(2.6, 5.0), r = Math.max(w, d) / 2;
  if (!livre(x, z, r)) continue;
  const dc = Math.hypot(x, z);
  const h = dc < 12 ? entre(5, 11) : entre(2.5, 6);
  predio(x, z, w, d, h, escolher(PALETA));
  ocupado.push({ x, z, r });
  feitos++;
}

// ── Árvores, postes e carrinhos ──────────────────────────────
{
  const copas = [], troncos = [];
  for (let tent = 0, feitas = 0; tent < 2000 && feitas < 70; tent++) {
    const x = entre(-30, 30), z = entre(-30, 30);
    if (!livre(x, z, 0.9)) continue;
    const s = entre(0.7, 1.3);
    const copa = new THREE.SphereGeometry(1.0 * s, 10, 8); copa.scale(1, 1.15, 1); copa.translate(x, 1.9 * s, z); copas.push(copa);
    const tr = new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 7); tr.translate(x, 0.7 * s, z); troncos.push(tr);
    ocupado.push({ x, z, r: 0.9 * s }); feitas++;
  }
  const mcopa = new THREE.Mesh(mergeGeometries(copas, false), mat('#3E8E41', { roughness: 0.9 })); mcopa.castShadow = mcopa.receiveShadow = true; scene.add(mcopa);
  const mtr = new THREE.Mesh(mergeGeometries(troncos, false), mat('#7A4E2A')); mtr.castShadow = true; scene.add(mtr);
  // Postes de luz ao longo da pista
  const postes = [], lampadas = [];
  for (let i = 0; i < N; i += 32) {
    const c = centro[i], l = lateral(i), s = (i / 32) % 2 ? 1 : -1;
    const p = c.clone().addScaledVector(l, s * (LARG / 2 + 1.0));
    const g = new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8); g.translate(p.x, c.y + 1.6, p.z); postes.push(g);
    const b = new THREE.BoxGeometry(0.9, 0.08, 0.08); b.translate(p.x - l.x * s * 0.4, c.y + 3.2, p.z - l.z * s * 0.4); postes.push(b);
    const la = new THREE.SphereGeometry(0.22, 10, 8); la.translate(p.x - l.x * s * 0.8, c.y + 3.1, p.z - l.z * s * 0.8); lampadas.push(la);
  }
  const mp = new THREE.Mesh(mergeGeometries(postes, false), mat('#2E3340', { roughness: 0.5, metalness: 0.3 })); mp.castShadow = true; scene.add(mp);
  scene.add(new THREE.Mesh(mergeGeometries(lampadas, false), new THREE.MeshStandardMaterial({ color: '#FFF1CC', emissive: '#FFD27A', emissiveIntensity: 0.7 })));
}
function carrinho(cor, letra) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.5, 2.0, 3, 0.18), mat(cor, { roughness: 0.35, metalness: 0.15 })); corpo.position.y = 0.45; corpo.castShadow = true; g.add(corpo);
  const cabine = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.5, 1.0, 3, 0.2), new THREE.MeshStandardMaterial({ color: '#BFE3FF', roughness: 0.1, metalness: 0.1 })); cabine.position.set(0, 0.85, -0.1); cabine.castShadow = true; g.add(cabine);
  const roda = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12); roda.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.55, 0.6], [0.55, 0.6], [-0.55, -0.6], [0.55, -0.6]]) { const r = new THREE.Mesh(roda, mat('#222')); r.position.set(x, 0.22, z); g.add(r); }
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), mat('#F5EAD3')); mastro.position.set(0.35, 1.5, 0.7); g.add(mastro);
  const bandeira = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ map: tex((c, w, h) => { c.fillStyle = cor; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 90px Inter, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letra, w / 2, h / 2 + 4); }, 160, 100), side: THREE.DoubleSide }));
  bandeira.position.set(0.75, 2.05, 0.7); g.add(bandeira);
  const farol = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: '#FFF6CC', emissive: '#FFE9A0', emissiveIntensity: 1.5 })); farol.position.set(0, 0.5, 1.0); g.add(farol);
  return g;
}
const jogadores = [['Ana', 12], ['Bruno', 10], ['Carla', 9], ['Davi', 9], ['PC', 7], ['Eva', 6]];
jogadores.forEach(([nome, casa], k) => {
  const i = (iLargada + Math.round((casa / CASAS) * N)) % N;
  const c = centro[i], t = tangente(i), l = lateral(i);
  const car = carrinho(CORES_JOGADORES[k], nome[0]);
  const desl = (k % 2 ? 1 : -1) * 0.95 + (k === 3 ? 0.0 : 0);
  car.position.copy(c).addScaledVector(l, desl); car.position.y += 0.2 + (k === 3 ? 0 : 0);
  if (k === 3) car.position.addScaledVector(t, 1.6);
  car.rotation.y = Math.atan2(t.x, t.z);
  scene.add(car);
});
// Dados perto da largada
{
  const face = (n) => tex((c, w, h) => { c.fillStyle = '#FBF7EF'; c.fillRect(0, 0, w, h); c.fillStyle = '#161F38'; const P = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]] }[n]; for (const [x, y] of P) { c.beginPath(); c.arc(x * w, y * h, w * 0.09, 0, 6.28); c.fill(); } }, 128, 128);
  const mats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: face(n), roughness: 0.35 }));
  const c = centro[iLargada], l = lateral(iLargada);
  for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 3, 0.18), mats); d.position.copy(c).addScaledVector(l, -LARG / 2 - 2.6 - k * 1.4); d.position.y = 0.55; d.rotation.set(k ? 0.3 : 0, k * 0.8 + 0.4, k ? 0 : 0.2); d.castShadow = true; scene.add(d); }
}

// ── Pós-processamento ────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.5, 0.95));
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 q = c.rgb * vec3(1.04, 1.0, 0.95);
      float g = dot(q, vec3(0.299, 0.587, 0.114));
      vec3 s = mix(vec3(g), q, 1.1);
      float d = distance(vUv, vec2(0.5));
      float vin = smoothstep(0.4, 1.0, d) * 0.45;
      float grao = (hash(gl_FragCoord.xy) - 0.5) * 0.02;
      gl_FragColor = vec4(s * (1.0 - vin) + grao, c.a);
    }`,
}));
composer.addPass(new OutputPass());

// ── Vistas ───────────────────────────────────────────────────
const atras = centro[(iLargada - 110 + N) % N], frente = centro[(iLargada + 25) % N];
const vistas = {
  aerea:   { pos: [44, 50, 56], alvo: [0, -1, -1], fov: 32 },
  viaduto: { pos: [13, 6, 16], alvo: [-1, 3.5, 1.5], fov: 44 },
  largada: { pos: [44, 9, -16], alvo: [20, 1.5, 1], fov: 40 },
  cidade:  { pos: [-4, 10, 36], alvo: [1, 3, 0], fov: 38 },
};
const v = vistas[vista] || vistas.aerea;
camera.position.set(...v.pos); camera.lookAt(...v.alvo); camera.fov = v.fov; camera.updateProjectionMatrix();

let quadros = 0;
function quadro() {
  composer.render();
  if (++quadros === 3) window.pronto = true;
  if (quadros < 6) requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); composer.setSize(window.innerWidth, window.innerHeight); quadros = 0; requestAnimationFrame(quadro); });
