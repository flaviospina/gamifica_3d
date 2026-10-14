// ============================================================
//  js/mundo.js — Monta a ilha: céu, chão, água, grade de blocos,
//  luzes, nuvens e decoração do tema. Registra colisores.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Colisao } from './colisao.js';
import { criarAleatorio, hashTexto } from './util.js';
import { criarNuvens, materialChapado } from './temas/pecas.js';
import { criarTotem } from './totem.js';

export class Mundo {
  /**
   * @param {THREE.Scene} scene
   * @param {object} tema      objeto de js/temas/*
   * @param {object} qualidade parâmetros de js/config.js QUALIDADE[nivel]
   * @param {object} layout    { linhas, colunas, celulas: [{l, c}], totens: [{l, c, numero, direcao}] }
   */
  constructor(scene, tema, qualidade, layout, seed = 'ilha') {
    this.scene = scene;
    this.tema = tema;
    this.qualidade = qualidade;
    this.colisao = new Colisao();
    this.rnd = criarAleatorio(hashTexto(seed));
    this.atualizaveis = [];
    this.totens = [];
    this.tempo = 0;

    this._ceu();
    this._luzes();
    this._chao();
    this._agua();
    this.grade = this._grade(layout);
    this._totens(layout);
    this.pontoInicial = this._pontoInicial(layout);
    this._decorar();
    if (qualidade.nuvens > 0) {
      const nuvens = criarNuvens(scene, this.rnd, qualidade.nuvens, CONFIG.mundo.raioAreia);
      this.atualizaveis.push(nuvens);
    }
  }

  // ── Céu: domo com gradiente (barato, sem textura) ─────────────
  _ceu() {
    const { tema, scene } = this;
    scene.background = new THREE.Color(tema.ceu.horizonte);
    scene.fog = new THREE.Fog(tema.nevoa.cor, tema.nevoa.perto, tema.nevoa.longe);
    const geo = new THREE.SphereGeometry(120, 24, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        corTopo: { value: new THREE.Color(tema.ceu.topo) },
        corHorizonte: { value: new THREE.Color(tema.ceu.horizonte) },
      },
      vertexShader: `
        varying float vAltura;
        void main() {
          vAltura = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 corTopo; uniform vec3 corHorizonte; varying float vAltura;
        void main() {
          float t = smoothstep(-0.05, 0.55, vAltura);
          gl_FragColor = vec4(mix(corHorizonte, corTopo, t), 1.0);
        }`,
    });
    const domo = new THREE.Mesh(geo, mat);
    domo.renderOrder = -1;
    scene.add(domo);
    this.domo = domo;
  }

  _luzes() {
    const { tema, scene, qualidade } = this;
    const hemi = new THREE.HemisphereLight(tema.luz.ceu, tema.luz.chao, tema.luz.intensidadeAmbiente);
    scene.add(hemi);
    const sol = new THREE.DirectionalLight(tema.luz.sol, tema.luz.intensidadeSol);
    sol.position.set(...tema.luz.direcaoSol);
    sol.target.position.set(0, 0, 0);
    scene.add(sol, sol.target);
    if (qualidade.sombras > 0) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(qualidade.sombras, qualidade.sombras);
      const r = CONFIG.mundo.raioAreia + 2;
      Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 80 });
      sol.shadow.bias = -0.0015;
      sol.shadow.normalBias = 0.02;
    }
    this.sol = sol;
  }

  // ── Chão: disco de grama + anel de areia ──────────────────────
  _chao() {
    const { tema, scene, qualidade } = this;
    const grama = new THREE.Mesh(new THREE.CircleGeometry(CONFIG.mundo.raioIlha, 56), materialChapado(tema.cores.grama));
    grama.rotation.x = -Math.PI / 2;
    grama.receiveShadow = qualidade.sombras > 0;
    scene.add(grama);
    const areia = new THREE.Mesh(
      new THREE.RingGeometry(CONFIG.mundo.raioIlha - 0.3, CONFIG.mundo.raioAreia, 56),
      materialChapado(tema.cores.areia)
    );
    areia.rotation.x = -Math.PI / 2;
    areia.position.y = -0.01;
    areia.receiveShadow = qualidade.sombras > 0;
    scene.add(areia);
    // "Barranco" da ilha até a água (lateral visível de perto)
    const lateral = new THREE.Mesh(
      new THREE.CylinderGeometry(CONFIG.mundo.raioAreia, CONFIG.mundo.raioAreia + 0.8, 1.2, 56, 1, true),
      materialChapado(tema.cores.areia, { side: THREE.DoubleSide })
    );
    lateral.position.y = -0.6;
    scene.add(lateral);
  }

  _agua() {
    const { tema, scene } = this;
    const geo = new THREE.PlaneGeometry(320, 320, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: tema.cores.agua, transparent: true, opacity: 0.88 });
    const agua = new THREE.Mesh(geo, mat);
    agua.rotation.x = -Math.PI / 2;
    agua.position.y = CONFIG.mundo.nivelAgua;
    scene.add(agua);
    // Espuma: anel claro na borda da ilha
    const espuma = new THREE.Mesh(
      new THREE.RingGeometry(CONFIG.mundo.raioAreia + 0.1, CONFIG.mundo.raioAreia + 1.2, 56),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45 })
    );
    espuma.rotation.x = -Math.PI / 2;
    espuma.position.y = CONFIG.mundo.nivelAgua + 0.01;
    scene.add(espuma);
    this.atualizaveis.push({
      atualizar: (dt, t) => {
        agua.position.y = CONFIG.mundo.nivelAgua + Math.sin(t * 0.9) * 0.03;
        espuma.material.opacity = 0.35 + Math.sin(t * 1.3) * 0.12;
      },
    });
  }

  // ── Grade da cruzadinha: blocos instanciados ──────────────────
  _grade(layout) {
    const { tema, scene, qualidade } = this;
    const T = CONFIG.ladrilho.tamanho, H = CONFIG.ladrilho.altura, folga = CONFIG.ladrilho.folga;
    const celulas = layout.celulas;
    const origemX = -(layout.colunas - 1) / 2 * T;
    const origemZ = -(layout.linhas - 1) / 2 * T;

    const geo = new THREE.BoxGeometry(T - folga, H, T - folga);
    geo.translate(0, H / 2, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const malha = new THREE.InstancedMesh(geo, mat, celulas.length);
    malha.castShadow = qualidade.sombras > 0;
    malha.receiveShadow = qualidade.sombras > 0;

    const m = new THREE.Matrix4();
    const cor = new THREE.Color(tema.cores.ladrilho);
    const mapa = new Map();
    celulas.forEach((cel, i) => {
      const x = origemX + cel.c * T, z = origemZ + cel.l * T;
      m.makeTranslation(x, 0, z);
      malha.setMatrixAt(i, m);
      malha.setColorAt(i, cor);
      mapa.set(`${cel.l},${cel.c}`, { indice: i, x, z, l: cel.l, c: cel.c });
      this.colisao.adicionarPlataforma({
        minX: x - T / 2, maxX: x + T / 2, minZ: z - T / 2, maxZ: z + T / 2, topo: H, base: 0,
      });
    });
    malha.instanceMatrix.needsUpdate = true;
    malha.instanceColor.needsUpdate = true;
    scene.add(malha);

    return {
      malha, mapa, origemX, origemZ, linhas: layout.linhas, colunas: layout.colunas,
      posicaoDe: (l, c) => ({ x: origemX + c * T, z: origemZ + l * T }),
      /** Retângulo ocupado pela grade (com margem) — usado para não decorar em cima. */
      limites: {
        minX: origemX - T * 1.5, maxX: origemX + (layout.colunas - 1) * T + T * 1.5,
        minZ: origemZ - T * 1.5, maxZ: origemZ + (layout.linhas - 1) * T + T * 1.5,
      },
    };
  }

  _totens(layout) {
    for (const t of layout.totens || []) {
      const { x, z } = this.grade.posicaoDe(t.l, t.c);
      // O totem fica na casa anterior ao início da palavra (fora da grade)
      const dx = t.direcao === 'h' ? -1 : 0, dz = t.direcao === 'v' ? -1 : 0;
      const totem = criarTotem({ numero: t.numero, cor: this.tema.cores.totem, corAceso: this.tema.cores.totemAceso });
      totem.grupo.position.set(x + dx * CONFIG.ladrilho.tamanho, 0, z + dz * CONFIG.ladrilho.tamanho);
      this.scene.add(totem.grupo);
      totem.dados = t;
      this.totens.push(totem);
      this.atualizaveis.push(totem);
      this.colisao.solidoCentro(totem.grupo.position.x, totem.grupo.position.z, 0.5, 0.5, 2);
      this.colisao.malhasCamera.push(totem.grupo);
    }
  }

  _decorar() {
    const lim = this.grade.limites;
    const totens = this.totens;
    const ini = this.pontoInicial;
    const areaLivre = (x, z, raio) => {
      if (x > lim.minX - raio && x < lim.maxX + raio && z > lim.minZ - raio && z < lim.maxZ + raio) return false;
      if (Math.hypot(ini.x - x, ini.z - z) < raio + 3) return false;
      for (const t of totens) if (Math.hypot(t.grupo.position.x - x, t.grupo.position.z - z) < raio + 1) return false;
      return true;
    };
    const resultado = this.tema.decorar({
      scene: this.scene, rnd: this.rnd, qualidade: this.qualidade,
      colisao: this.colisao, areaLivre, raioIlha: CONFIG.mundo.raioIlha,
    });
    if (resultado && resultado.atualizar) this.atualizaveis.push(resultado);
  }

  /** Ponto inicial: um pouco abaixo (sul) da grade, no chão. */
  _pontoInicial(layout) {
    const lim = this.grade.limites;
    return new THREE.Vector3(0, 0, lim.maxZ + 1.5);
  }

  /** Totem mais próximo dentro do raio de interação (ou null). */
  totemProximo(pos) {
    let melhor = null, dMin = CONFIG.interacao.raio;
    for (const t of this.totens) {
      const d = Math.hypot(t.grupo.position.x - pos.x, t.grupo.position.z - pos.z);
      if (d < dMin) { dMin = d; melhor = t; }
    }
    return melhor;
  }

  atualizar(dt) {
    this.tempo += dt;
    for (const a of this.atualizaveis) a.atualizar(dt, this.tempo);
  }
}
