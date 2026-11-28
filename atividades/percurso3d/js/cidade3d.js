// ============================================================
//  js/cidade3d.js — Monta a cidade em miniatura: base, pista com
//  viaduto maciço, placas das casas (escondidas até alguém cair),
//  prédios, parque, arco de largada, obras dos jogadores e confete.
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BAIRROS, CORES_JOGADORES } from './config.js';
import { criarAleatorio } from './util.js';
import { Texturas, tex, desenharPlaca } from './texturas.js';
import { TIPOS } from './cartas.js';

const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0, ...extra });
const PALETA = ['#E9607A', '#D9433B', '#F2C14E', '#58A55C', '#3E7CB1', '#F5EAD3', '#EE8B3A', '#3BA9A0', '#9B59B6', '#C9A66B'];
const unir = (lista) => { const g = mergeGeometries(lista.map((x) => (x.index ? x.toNonIndexed() : x)), false); lista.forEach((x) => x.dispose()); return g; };

export class Cidade3D {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./pista.js').Pista} pista
   * @param {object} qualidade
   * @param {{cartas:string[], semente:number, renderer:THREE.WebGLRenderer}} o
   */
  constructor(scene, pista, qualidade, { cartas, semente = 1, renderer }) {
    this.scene = scene; this.pista = pista; this.q = qualidade; this.cartas = cartas;
    this.rnd = criarAleatorio(semente);
    this.sombra = qualidade.sombras > 0;
    this.placas = []; this.obras = new Map(); this.tempo = 0;
    this.ocupado = [];
    this._ceu(renderer);
    this._luzes();
    this._base();
    this._pistaMalhas();
    this._viaduto();
    this._placas();
    this._arco();
    this._terrenos();
    this._lago();
    this._predios();
    this._arvoresEPostes();
    this._marcador();
    this._confete();
  }

  _add(malha, lanca = true, recebe = true) { malha.castShadow = lanca && this.sombra; malha.receiveShadow = recebe && this.sombra; this.scene.add(malha); return malha; }

  // ── Céu e ambiente ───────────────────────────────────────────
  _ceu(renderer) {
    const { scene } = this;
    scene.background = new THREE.Color('#1F4E9A');
    scene.fog = new THREE.Fog('#1F4E9A', 150, 340);
    const domo = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { a: { value: new THREE.Color('#163F85') }, b: { value: new THREE.Color('#5E9BE6') } },
      vertexShader: 'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; varying float vy; void main(){ gl_FragColor = vec4(mix(a, b, smoothstep(-0.2, 0.9, vy)), 1.0); }',
    }));
    domo.renderOrder = -1; domo.frustumCulled = false; scene.add(domo);
    if (renderer) {
      const pm = new THREE.PMREMGenerator(renderer);
      const est = new THREE.Scene();
      est.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#2A4A86', side: THREE.BackSide })));
      const luz = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ color: '#FFF2DD' })); luz.position.set(0, 30, -20); luz.lookAt(0, 0, 0); est.add(luz);
      scene.environment = pm.fromScene(est, 0.05).texture; scene.environmentIntensity = 0.5; pm.dispose();
    }
  }

  _luzes() {
    const { scene, q } = this;
    scene.add(new THREE.HemisphereLight('#DCEBFF', '#2E4A7A', 1.1));
    const sol = new THREE.DirectionalLight('#FFF0D6', 3.0);
    sol.position.set(38, 52, 26); sol.target.position.set(0, 0, 0);
    if (q.sombras > 0) {
      sol.castShadow = true; sol.shadow.mapSize.set(q.sombras, q.sombras);
      Object.assign(sol.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 160 });
      sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.04; sol.shadow.radius = 2;
    }
    scene.add(sol, sol.target); this.sol = sol;
    const contorno = new THREE.DirectionalLight('#9CC4FF', 1.1); contorno.position.set(-30, 18, -40); scene.add(contorno);
  }

  _base() {
    const mesa = new THREE.Mesh(new THREE.CircleGeometry(260, 48), mat('#173C7E', { roughness: 0.95 }));
    mesa.rotation.x = -Math.PI / 2; mesa.position.y = -3.2; this._add(mesa, false);
    const base = new THREE.Mesh(new RoundedBoxGeometry(66, 3, 66, 4, 0.9), mat('#1F4E9A', { roughness: 0.55 }));
    base.position.y = -1.6; this._add(base);
    const grama = new THREE.Mesh(new RoundedBoxGeometry(63, 0.6, 63, 3, 0.3), mat('#FFFFFF', { map: Texturas.grama(), roughness: 0.95 }));
    grama.position.y = -0.3; this._add(grama, false);
  }

  // ── Varredura de um perfil 2D (lateral, altura absoluta) ao longo da pista ──
  _varrer(perfilDe, filtro, escalaU = 0) {
    const { pista } = this, N = pista.N, pos = [], uv = [];
    const P = (i, [lat, y]) => { const c = pista.centro[i], l = pista.lat[i]; return [c.x + l.x * lat, y, c.z + l.z * lat]; };
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!filtro(i) || !filtro(j)) continue;
      const a = perfilDe(i), b = perfilDe(j);
      const u0 = (i / N) * pista.comprimento / 8, u1 = ((i + 1) / N) * pista.comprimento / 8;
      for (let k = 0; k < a.length; k++) {
        const k2 = (k + 1) % a.length;
        if (a.length === 2 && k === 1) break; // fita aberta: uma face só
        const p00 = P(i, a[k]), p01 = P(i, a[k2]), p10 = P(j, b[k]), p11 = P(j, b[k2]);
        pos.push(...p00, ...p10, ...p01, ...p01, ...p10, ...p11);
        if (escalaU) uv.push(u0, 0, u1, 0, u0, 1, u0, 1, u1, 0, u1, 1); else uv.push(0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  _pistaMalhas() {
    const { pista } = this, L = pista.largura, h = (i) => pista.alturas[i];
    // Asfalto (acompanha a subida do viaduto) — dupla face para nunca "sumir" visto de baixo
    const asfalto = new THREE.Mesh(this._varrer((i) => [[-L / 2, h(i) + 0.12], [L / 2, h(i) + 0.12]], () => true, 1), mat('#FFFFFF', { map: Texturas.asfalto(), roughness: 0.85, side: THREE.DoubleSide }));
    asfalto.geometry.computeVertexNormals();
    this._add(asfalto, false);
    // Meio-fio no trecho ao nível do chão
    const guia = (lado) => this._varrer((i) => { const a = lado * (L / 2), b = lado * (L / 2 + 0.35); return [[a, 0.22], [b, 0.22], [b, -0.05], [a, -0.05]]; }, (i) => h(i) < 0.03);
    this._add(new THREE.Mesh(unir([guia(-1), guia(1)]), mat('#D9D2C2', { roughness: 0.8, side: THREE.DoubleSide })), false);
  }

  // ── Viaduto maciço: tabuleiro, muretas e pilares de concreto (nada vazado) ──
  _viaduto() {
    const { pista } = this, L = pista.largura, N = pista.N, h = (i) => pista.alturas[i];
    const meio = L / 2 + 0.6;
    const concreto = mat('#FFFFFF', { map: Texturas.concreto(), roughness: 0.9, side: THREE.DoubleSide });
    const elevado = (i) => h(i) > 0.03;
    // Tabuleiro: laje de 0,6 m no alto; nas rampas baixas vira aterro maciço até o chão
    const tabuleiro = this._varrer((i) => { const topo = h(i) + 0.08, fundo = h(i) < 1.5 ? -0.1 : h(i) - 0.55; return [[-meio, topo], [meio, topo], [meio, fundo], [-meio, fundo]]; }, elevado);
    this._add(new THREE.Mesh(tabuleiro, concreto));
    // Muretas (guarda-corpo maciço) dos dois lados
    const mureta = (lado) => this._varrer((i) => { const a = lado * (L / 2 + 0.22), b = lado * meio, y0 = h(i) + 0.08, y1 = h(i) + 0.85; return [[a, y1], [b, y1], [b, y0], [a, y0]]; }, elevado);
    this._add(new THREE.Mesh(unir([mureta(-1), mureta(1)]), mat('#F4F1E8', { roughness: 0.7, side: THREE.DoubleSide })));
    // Faixa dourada no topo da mureta (identidade do jogo)
    const friso = (lado) => this._varrer((i) => { const a = lado * (L / 2 + 0.2), b = lado * (meio + 0.02), y0 = h(i) + 0.85, y1 = h(i) + 0.95; return [[a, y1], [b, y1], [b, y0], [a, y0]]; }, elevado);
    this._add(new THREE.Mesh(unir([friso(-1), friso(1)]), mat('#E0A537', { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })), false);
    // Pilares maciços com travessa; nenhum sobre a pista que passa por baixo
    const pecas = [];
    for (let i = 0; i < N; i += 20) {
      if (h(i) < 1.6 || pista.centro[i].distanceTo(pista.cruzamento) < 4.6) continue;
      const c = pista.centro[i], l = pista.lat[i], t = pista.tan[i], ang = Math.atan2(t.x, t.z), alt = h(i) - 0.5;
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.8, alt, 0.8); g.rotateY(ang); g.translate(c.x + l.x * s * (L / 2 - 0.2), alt / 2, c.z + l.z * s * (L / 2 - 0.2)); pecas.push(g);
        const sap = new THREE.BoxGeometry(1.3, 0.3, 1.3); sap.rotateY(ang); sap.translate(c.x + l.x * s * (L / 2 - 0.2), 0.15, c.z + l.z * s * (L / 2 - 0.2)); pecas.push(sap);
      }
      const trav = new THREE.BoxGeometry(L + 1.2, 0.5, 1.0); trav.rotateY(ang); trav.translate(c.x, h(i) - 0.75, c.z); pecas.push(trav);
    }
    if (pecas.length) this._add(new THREE.Mesh(unir(pecas), mat('#FFFFFF', { map: Texturas.concreto(), roughness: 0.9 })));
  }

  // ── Placas das casas ─────────────────────────────────────────
  _placas() {
    const { pista } = this, L = pista.largura;
    const geo = new RoundedBoxGeometry(L - 0.9, 0.1, 2.5, 2, 0.05);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < pista.casas; k++) {
      const a = pista.amostra(k);
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const bairro = BAIRROS[Math.floor(k / 5) % BAIRROS.length];
      const estado = { numero: k, cor: bairro.hex, rotulo: k === 0 ? TIPOS.largada.rotulo : null, corCarta: TIPOS.largada.cor, destaque: false };
      desenharPlaca(cv, estado);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const malha = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
      // Referencial: x = lateral, y = normal, z = contra a tangente (o texto fica de pé para quem chega)
      m4.makeBasis(a.l, a.n, a.t.clone().negate());
      malha.quaternion.setFromRotationMatrix(m4);
      malha.position.copy(a.p).addScaledVector(a.n, 0.18);
      malha.receiveShadow = this.sombra;
      this.scene.add(malha);
      this.placas.push({ malha, cv, t, estado, pulso: 0 });
    }
  }

  /** Mostra a carta da casa (deixa de ser "?"). */
  revelarCasa(k, tipo) {
    const pl = this.placas[k]; if (!pl) return;
    const def = TIPOS[tipo] || {};
    pl.estado.rotulo = def.rotulo || '•'; pl.estado.corCarta = def.cor || '#FBF7EF';
    desenharPlaca(pl.cv, pl.estado); pl.t.needsUpdate = true; pl.pulso = 1;
  }

  /** Marca a casa de destino com um marcador dourado (ou tira, com null). */
  destacarCasa(k) {
    if (this._destacada != null && this.placas[this._destacada]) { const p = this.placas[this._destacada]; p.estado.destaque = false; desenharPlaca(p.cv, p.estado); p.t.needsUpdate = true; }
    this._destacada = k;
    if (k == null) { this.marcador.visible = false; return; }
    const p = this.placas[k]; p.estado.destaque = true; desenharPlaca(p.cv, p.estado); p.t.needsUpdate = true;
    const a = this.pista.amostra(k);
    this.marcador.position.copy(a.p); this._marcadorY = a.p.y + 2.6; this.marcador.visible = true;
  }

  _marcador() {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), new THREE.MeshStandardMaterial({ color: '#E0A537', emissive: '#E0A537', emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.4 }));
    cone.rotation.x = Math.PI; g.add(cone);
    g.visible = false; this.scene.add(g); this.marcador = g; this._marcadorY = 2.6;
  }

  _arco() {
    const { pista } = this, L = pista.largura, a = pista.amostra(0);
    const g = new THREE.Group();
    const postes = [];
    for (const s of [-1, 1]) { const p = new THREE.CylinderGeometry(0.35, 0.4, 7, 12); p.translate(s * (L / 2 + 1.1), 3.5, 0); postes.push(p); }
    g.add(new THREE.Mesh(unir(postes), mat('#161F38', { roughness: 0.5 })));
    const viga = new THREE.Mesh(new THREE.BoxGeometry(L + 3.2, 1.4, 0.6), mat('#FFFFFF', { map: Texturas.faixa('LARGADA · CHEGADA'), roughness: 0.5 })); viga.position.y = 7.2; g.add(viga);
    const xadrez = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.4, 1.2), mat('#FFFFFF', { map: Texturas.xadrez() })); xadrez.rotation.x = -Math.PI / 2; xadrez.position.set(0, 0.2, 1.9); g.add(xadrez);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 4), mat(s < 0 ? '#E0A537' : '#286456')); b.position.set(s * (L / 2 + 1.1), 7.8, 0); g.add(b); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = this.sombra; } });
    g.position.copy(a.p); g.rotation.y = Math.atan2(a.t.x, a.t.z);
    this.scene.add(g);
    this.arco = g;
    this.ocupado.push({ x: a.p.x + a.l.x * 3.2, z: a.p.z + a.l.z * 3.2, r: 1.2 }, { x: a.p.x - a.l.x * 3.2, z: a.p.z - a.l.z * 3.2, r: 1.2 });
  }

  // ── Terrenos das casas de Obra (reservados antes dos prédios) ──
  _terrenos() {
    const { pista } = this, L = pista.largura;
    this.terrenos = new Map();
    this.cartas.forEach((tipo, k) => {
      if (tipo !== 'obra') return;
      const a = pista.amostra(k), vagas = [];
      for (const [s, ao] of [[1, 0], [-1, 0], [1, 3.4], [-1, 3.4], [1, -3.4], [-1, -3.4]]) {
        const x = a.p.x + a.l.x * s * (L / 2 + 2.8) + a.t.x * ao, z = a.p.z + a.l.z * s * (L / 2 + 2.8) + a.t.z * ao;
        if (Math.abs(x) > 29 || Math.abs(z) > 29 || pista.distancia(x, z) < L / 2 + 2.0) continue;
        vagas.push({ x, z }); this.ocupado.push({ x, z, r: 2.0 });
      }
      this.terrenos.set(k, { vagas, usadas: 0 });
    });
  }

  _livre(x, z, r, folga = 3.0) {
    const { pista } = this;
    if (Math.abs(x) > 29 || Math.abs(z) > 29) return false;
    if (pista.distancia(x, z) < pista.largura / 2 + folga + r * 0.6) return false;
    if (Math.hypot(x + 16, z + 1) < 7.5 + r) return false;
    for (const o of this.ocupado) if (Math.hypot(o.x - x, o.z - z) < o.r + r + 0.9) return false;
    return true;
  }

  _lago() {
    const lago = new THREE.Mesh(new THREE.CircleGeometry(4.8, 40), new THREE.MeshStandardMaterial({ color: '#3DA6D9', roughness: 0.12, metalness: 0.1 }));
    lago.rotation.x = -Math.PI / 2; lago.position.set(-16, 0.02, -1); lago.scale.set(1.3, 1, 0.9); this.scene.add(lago);
    const borda = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.4, 40), mat('#E8D9B0', { roughness: 0.95 })); borda.rotation.x = -Math.PI / 2; borda.position.set(-16, 0.015, -1); borda.scale.set(1.3, 1, 0.9); this.scene.add(borda);
    const bacias = [];
    for (const [r, y, alt] of [[1.1, 0.25, 0.5], [0.7, 0.85, 0.35], [0.4, 1.35, 0.3]]) { const b = new THREE.CylinderGeometry(r, r * 0.8, alt, 16); b.translate(-16, y, -1); bacias.push(b); }
    this._add(new THREE.Mesh(unir(bacias), mat('#EDE6D6', { roughness: 0.6 })));
    this.jato = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#BFE9FF', transparent: true, opacity: 0.8, emissive: '#7FD4FF', emissiveIntensity: 0.3 }));
    this.jato.position.set(-16, 2.1, -1); this.scene.add(this.jato);
  }

  _predio(x, z, w, d, h, cor, adereços = true) {
    const { rnd } = this;
    const t = Texturas.janela(cor).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(2, Math.round(w / 1.0)), Math.max(2, Math.round(h / 1.1))); t.needsUpdate = true;
    const corpo = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), mat('#FFFFFF', { map: t, roughness: 0.7 }));
    corpo.position.set(x, h / 2, z); this._add(corpo);
    const topo = new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3); topo.translate(x, h + 0.1, z);
    this._topos.push({ g: topo, cor: new THREE.Color(cor).multiplyScalar(0.75) });
    if (adereços) {
      if (rnd() < 0.6) { const g = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 10); g.translate(x + rnd.entre(-w / 3, w / 3), h + 0.75, z + rnd.entre(-d / 3, d / 3)); this._aderecos.push(g); }
      if (rnd() < 0.5) { const g = new THREE.CylinderGeometry(0.05, 0.08, 2.2, 6); g.translate(x + rnd.entre(-w / 3, w / 3), h + 1.3, z + rnd.entre(-d / 3, d / 3)); this._aderecos.push(g); }
      if (rnd() < 0.7) { const g = new THREE.BoxGeometry(0.7, 0.4, 0.7); g.translate(x + rnd.entre(-w / 3, w / 3), h + 0.45, z + rnd.entre(-d / 3, d / 3)); this._aderecos.push(g); }
    }
    return corpo;
  }

  _predios() {
    const { rnd } = this;
    this._topos = []; this._aderecos = [];
    // Marco 1: torre escalonada
    const tx = 9, tz = -8; this.ocupado.push({ x: tx, z: tz, r: 4 });
    let y = 0;
    for (const [w, d, h, cor] of [[7, 7, 7, '#F5EAD3'], [5.6, 5.6, 6, '#F2C14E'], [4.2, 4.2, 5, '#F5EAD3'], [2.8, 2.8, 4, '#EE8B3A']]) {
      const t = Texturas.janela(cor).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.round(w), Math.round(h / 1.1)); t.needsUpdate = true;
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), mat('#FFFFFF', { map: t, roughness: 0.65 })); m.position.set(tx, y + h / 2, tz); this._add(m); y += h;
    }
    const espira = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5, 8), new THREE.MeshStandardMaterial({ color: '#E0A537', emissive: '#E0A537', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.6 })); espira.position.set(tx, y + 2.5, tz); this.scene.add(espira);
    // Marco 2: museu com cúpula
    const cx = 18, cz = 2; this.ocupado.push({ x: cx, z: cz, r: 3.5 });
    { const t = Texturas.janela('#F5EAD3').clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); t.needsUpdate = true;
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(6.5, 4, 6.5, 2, 0.15), mat('#FFFFFF', { map: t })); corpo.position.set(cx, 2, cz); this._add(corpo);
      const cupula = new THREE.Mesh(new THREE.SphereGeometry(2.9, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3BA9A0', { roughness: 0.35, metalness: 0.25 })); cupula.position.set(cx, 4, cz); this._add(cupula);
      const colunas = []; for (let k = 0; k < 6; k++) { const c = new THREE.CylinderGeometry(0.25, 0.25, 3.6, 10); c.translate(cx - 3.0 + k * 1.2, 1.8, cz + 3.5); colunas.push(c); }
      this._add(new THREE.Mesh(unir(colunas), mat('#F5EAD3'))); }
    // Prédios comuns
    for (let tent = 0, feitos = 0; tent < 1600 && feitos < 30; tent++) {
      const x = rnd.entre(-29, 29), z = rnd.entre(-29, 29), w = rnd.entre(2.6, 5.0), d = rnd.entre(2.6, 5.0), r = Math.max(w, d) / 2;
      if (!this._livre(x, z, r, 3.2)) continue;
      const h = Math.hypot(x, z) < 12 ? rnd.entre(5, 11) : rnd.entre(2.5, 6);
      this._predio(x, z, w, d, h, rnd.escolher(PALETA));
      this.ocupado.push({ x, z, r }); feitos++;
    }
    // Telhados (uma malha, cor por vértice) e adereços (uma malha)
    const geos = this._topos.map(({ g, cor }) => { const n = g.toNonIndexed(); const arr = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < arr.length; i += 3) { arr[i] = cor.r; arr[i + 1] = cor.g; arr[i + 2] = cor.b; } n.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.dispose(); return n; });
    if (geos.length) this._add(new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
    if (this._aderecos.length) this._add(new THREE.Mesh(unir(this._aderecos), mat('#D9D2C2')));
  }

  _arvoresEPostes() {
    const { rnd, pista, q } = this, L = pista.largura;
    const copas = [], troncos = [];
    for (let tent = 0, feitas = 0; tent < 2400 && feitas < (q.arvores || 60); tent++) {
      const x = rnd.entre(-30, 30), z = rnd.entre(-30, 30);
      if (!this._livre(x, z, 0.9, 1.6)) continue;
      const s = rnd.entre(0.7, 1.3);
      const copa = new THREE.SphereGeometry(1.0 * s, 10, 8); copa.scale(1, 1.15, 1); copa.translate(x, 1.9 * s, z); copas.push(copa);
      const tr = new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 7); tr.translate(x, 0.7 * s, z); troncos.push(tr);
      this.ocupado.push({ x, z, r: 0.9 * s }); feitas++;
    }
    if (copas.length) { this._add(new THREE.Mesh(unir(copas), mat('#3E8E41', { roughness: 0.9 }))); this._add(new THREE.Mesh(unir(troncos), mat('#7A4E2A'))); }
    const postes = [], lampadas = [];
    for (let i = 0; i < pista.N; i += 32) {
      if (pista.alturas[i] > 0.03) continue; // no viaduto a mureta já ilumina
      const c = pista.centro[i], l = pista.lat[i], s = (i / 32) % 2 ? 1 : -1;
      const px = c.x + l.x * s * (L / 2 + 1.0), pz = c.z + l.z * s * (L / 2 + 1.0);
      const g = new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8); g.translate(px, 1.6, pz); postes.push(g);
      const la = new THREE.SphereGeometry(0.22, 10, 8); la.translate(px - l.x * s * 0.5, 3.15, pz - l.z * s * 0.5); lampadas.push(la);
    }
    this._add(new THREE.Mesh(unir(postes), mat('#2E3340', { roughness: 0.5, metalness: 0.3 })));
    this.scene.add(new THREE.Mesh(unir(lampadas), new THREE.MeshStandardMaterial({ color: '#FFF1CC', emissive: '#FFD27A', emissiveIntensity: 0.8 })));
  }

  // ── Obras dos jogadores ──────────────────────────────────────
  /** Constrói (ou amplia) o prédio do jogador no terreno da casa. */
  adicionarObra({ casa, jogador, nivel }, nome, corIndice) {
    const chave = `${casa}:${jogador}`;
    const cor = CORES_JOGADORES[corIndice % CORES_JOGADORES.length].hex;
    let o = this.obras.get(chave);
    if (!o) {
      const terr = this.terrenos.get(casa) || { vagas: [], usadas: 0 };
      const vaga = terr.vagas[terr.usadas % Math.max(1, terr.vagas.length)] || (() => { const a = this.pista.amostra(casa); return { x: a.p.x + a.l.x * 5, z: a.p.z + a.l.z * 5 }; })();
      terr.usadas++;
      const g = new THREE.Group(); g.position.set(vaga.x, 0, vaga.z);
      const t = Texturas.janela(cor).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.needsUpdate = true;
      const corpo = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.2, 2.6, 2, 0.12), mat('#FFFFFF', { map: t, roughness: 0.65 })); corpo.position.y = 1.1; g.add(corpo);
      const teto = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), mat('#161F38', { roughness: 0.6 })); teto.rotation.y = Math.PI / 4; g.add(teto);
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.8), new THREE.MeshBasicMaterial({ map: Texturas.placaNome(cor, nome), side: THREE.DoubleSide })); g.add(placa);
      const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), mat('#F5EAD3')); g.add(mastro);
      g.traverse((m) => { if (m.isMesh) { m.castShadow = this.sombra; m.receiveShadow = this.sombra; } });
      this.scene.add(g);
      o = { g, corpo, teto, placa, mastro, t, crescer: 0 };
      this.obras.set(chave, o);
    }
    const andares = Math.min(4, nivel), h = 2.2 * andares;
    o.corpo.scale.y = andares; o.corpo.position.y = h / 2; o.t.repeat.set(3, 2 * andares);
    o.teto.position.y = h + 0.55; o.placa.position.set(0, h + 1.9, 0); o.mastro.position.y = h + 1.4;
    o.crescer = 1; o.g.scale.setScalar(0.01);
    return o.g.position;
  }

  // ── Confete ──────────────────────────────────────────────────
  _confete() {
    const n = 140;
    const malha = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
    malha.instanceMatrix.setUsage(THREE.DynamicDrawUsage); malha.frustumCulled = false; malha.visible = false;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) { c.setHSL(Math.random(), 0.85, 0.6); malha.setColorAt(i, c); }
    this.scene.add(malha);
    this.confeteM = malha; this.confetes = [];
  }
  soltarConfete(pos) {
    this.confetes = Array.from({ length: this.confeteM.count }, () => ({
      p: new THREE.Vector3(pos.x + (Math.random() - 0.5) * 4, pos.y + 3 + Math.random() * 3, pos.z + (Math.random() - 0.5) * 4),
      v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3), r: Math.random() * 6, vida: 2.6 + Math.random(),
    }));
    this.confeteM.visible = true;
  }

  atualizar(dt) {
    this.tempo += dt;
    const t = this.tempo;
    if (this.marcador.visible) { this.marcador.position.y = this._marcadorY + Math.sin(t * 3.2) * 0.25; this.marcador.rotation.y = t * 1.6; }
    if (this.jato) this.jato.scale.y = 1 + Math.sin(t * 5) * 0.12;
    for (const pl of this.placas) if (pl.pulso > 0) { pl.pulso = Math.max(0, pl.pulso - dt * 1.6); const s = 1 + Math.sin(pl.pulso * Math.PI) * 0.35; pl.malha.scale.set(s, 1 + pl.pulso * 3, s); }
    for (const o of this.obras.values()) if (o.crescer > 0) { o.crescer = Math.max(0, o.crescer - dt * 1.4); const k = 1 - o.crescer; o.g.scale.setScalar(Math.max(0.01, k * (1 + Math.sin(k * Math.PI) * 0.2))); }
    if (this.confeteM.visible) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), um = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
      let vivos = 0;
      this.confetes.forEach((c, i) => {
        c.vida -= dt; c.v.y -= 6 * dt; c.p.addScaledVector(c.v, dt); c.r += dt * 6;
        if (c.vida > 0 && c.p.y > 0) { vivos++; e.set(c.r, c.r * 0.7, c.r * 1.3); q.setFromEuler(e); m.compose(c.p, q, um); } else m.compose(zero, q, zero);
        this.confeteM.setMatrixAt(i, m);
      });
      this.confeteM.instanceMatrix.needsUpdate = true;
      if (!vivos) this.confeteM.visible = false;
    }
  }
}
