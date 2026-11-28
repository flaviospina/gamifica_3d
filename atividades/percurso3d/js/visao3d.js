// ============================================================
//  js/visao3d.js — Cena 3D: renderer, câmera que acompanha o
//  carrinho da vez, carrinhos e pós-processamento.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG, CORES_JOGADORES } from './config.js';
import { suavizar } from './util.js';
import { Cidade3D } from './cidade3d.js';
import { criarCarrinho } from './carrinho.js';

export class Visao3D {
  /** Tenta criar o contexto WebGL 2; devolve null (com o motivo) se o navegador não tiver. */
  static sondar(canvas, antialias) {
    const diag = { motivo: '' };
    if (new URLSearchParams(location.search).has('semwebgl')) { diag.motivo = 'modo 2D forçado por ?semwebgl=1'; return { gl: null, diag }; }
    const aoFalhar = (ev) => { if (ev.statusMessage) diag.motivo = ev.statusMessage; };
    canvas.addEventListener('webglcontextcreationerror', aoFalhar);
    let gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: false, antialias, stencil: false, powerPreference: 'default' }); } catch (e) { diag.motivo = e.message; }
    canvas.removeEventListener('webglcontextcreationerror', aoFalhar);
    if (!gl && !diag.motivo) diag.motivo = 'o navegador não criou um contexto WebGL 2';
    return { gl, diag };
  }

  constructor(canvas, gl, pista, qualidade, { cartas, semente }) {
    this.tipo = '3d';
    this.canvas = canvas; this.pista = pista; this.q = qualidade;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: qualidade.antialias });
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    if (qualidade.sombras > 0) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.5, 500);
    this.cidade = new Cidade3D(this.scene, pista, qualidade, { cartas, semente, renderer: r });
    this.carros = new Map();
    this.foco = null; this.geral = true; this.giro = 0;
    this._alvo = new THREE.Vector3(0, 0, 0); this._pos = new THREE.Vector3(44, 50, 56);
    this._a = {}; this._m4 = new THREE.Matrix4(); this._v = new THREE.Vector3();
    this.camera.position.copy(this._pos); this.camera.lookAt(this._alvo);
    this.redimensionar();
    this._pos3d();
    this._arrasto();
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); this.perdido = true; this.aoPerderContexto?.(); });
    canvas.addEventListener('webglcontextrestored', () => { this.perdido = false; if (this.composer) { this.composer.dispose?.(); this.composer = null; } this._pos3d(); this.aoRecuperarContexto?.(); });
  }

  _razaoPixels() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.pixelRatioMax);
    const teto = Math.sqrt(3.2e6 / Math.max(1, window.innerWidth * window.innerHeight));
    return Math.max(0.75, Math.min(dpr, teto));
  }

  _pos3d() {
    if (!this.q.pos) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.5, 0.95));
    this.composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          vec3 q = c.rgb * vec3(1.04, 1.0, 0.95);
          float g = dot(q, vec3(0.299, 0.587, 0.114));
          vec3 s = mix(vec3(g), q, 1.1);
          float d = distance(vUv, vec2(0.5));
          gl_FragColor = vec4(s * (1.0 - smoothstep(0.45, 1.0, d) * 0.35), c.a);
        }`,
    }));
    this.composer.addPass(new OutputPass());
  }

  /** Arrastar gira a câmera em volta do carrinho; dois toques/duplo clique volta ao normal. */
  _arrasto() {
    let ativo = false, x0 = 0;
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { ativo = true; x0 = e.clientX; });
    window.addEventListener('pointermove', (e) => { if (!ativo) return; this.giro += (e.clientX - x0) * 0.006; x0 = e.clientX; });
    window.addEventListener('pointerup', () => { ativo = false; });
    c.addEventListener('dblclick', () => { this.giro = 0; });
  }

  redimensionar() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this._razaoPixels());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Em tela estreita (celular em pé) abre o campo de visão para a pista caber
    this.camera.fov = w < h ? 52 : CONFIG.camera.fov;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  definirCarros(jogadores) {
    for (const j of jogadores) {
      const car = criarCarrinho(CORES_JOGADORES[j.cor % CORES_JOGADORES.length].hex, (j.nome[0] || '?').toUpperCase(), j.id);
      if (!this.q.sombras) car.grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      this.scene.add(car.grupo);
      this.carros.set(j.id, { ...car, s: 0, faixa: 0, vel: 0 });
    }
  }

  /** Coloca o carrinho na posição s (em casas), deslocado `faixa` metros para o lado. */
  posicionar(id, s, faixa = 0, vel = 0) {
    const car = this.carros.get(id); if (!car) return;
    car.s = s; car.faixa = faixa; car.vel = vel;
    const a = this.pista.amostra(s, this._a);
    car.grupo.position.copy(a.p).addScaledVector(a.l, faixa).addScaledVector(a.n, 0.22);
    this._m4.makeBasis(a.l.clone().negate(), a.n, a.t);
    car.grupo.quaternion.setFromRotationMatrix(this._m4);
  }

  focar(id) { this.foco = id; this.geral = false; this.giro = 0; }
  visaoGeral(ligada = true) { this.geral = ligada; }
  revelarCasa(k, tipo) { this.cidade.revelarCasa(k, tipo); }
  destacarCasa(k) { this.cidade.destacarCasa(k); }
  adicionarObra(obra, nome, cor) { return this.cidade.adicionarObra(obra, nome, cor); }
  comemorar(id) { const car = this.carros.get(id); if (!car) return; car.comemorar(); this.cidade.soltarConfete(car.grupo.position); }

  _camera(dt) {
    const car = this.carros.get(this.foco);
    let pos, alvo;
    if (this.geral || !car) {
      pos = this._v.set(44, 50, 56); alvo = new THREE.Vector3(0, -1, -1);
      if (this.camera.aspect < 1) pos.set(40, 92, 70);
    } else {
      const a = this.pista.amostra(car.s, this._a);
      const frente = new THREE.Vector3(a.t.x, 0, a.t.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.giro);
      const base = car.grupo.position;
      const estreita = this.camera.aspect < 1;
      const dist = CONFIG.camera.seguirDist * (estreita ? 1.25 : 1), alt = CONFIG.camera.seguirAltura * (estreita ? 1.35 : 1);
      pos = this._v.copy(base).addScaledVector(frente, -dist); pos.y = base.y + alt;
      alvo = new THREE.Vector3().copy(base).addScaledVector(frente, 2.6); alvo.y = base.y + 0.6;
    }
    // O arco de largada some enquanto a câmera está colada nele (senão tapa o carrinho)
    if (this.cidade.arco) this.cidade.arco.visible = this.geral || !car || this._pos.distanceTo(this.cidade.arco.position) > 17;
    const k = suavizar(this.geral ? 2.2 : CONFIG.camera.suavidade, dt);
    this._pos.lerp(pos, k); this._alvo.lerp(alvo, k);
    this.camera.position.copy(this._pos); this.camera.lookAt(this._alvo);
  }

  render(dt) {
    if (this.perdido) return;
    this.cidade.atualizar(dt);
    for (const car of this.carros.values()) car.atualizar(dt, car.vel);
    this._camera(dt);
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  info() { const i = this.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geoms: i.memory.geometries, texs: i.memory.textures }; }
}
