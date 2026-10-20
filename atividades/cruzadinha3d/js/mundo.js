// ============================================================
//  js/mundo.js — Monta a ilha: céu, chão, água, grade de blocos,
//  luzes, nuvens e decoração do tema. Registra colisores.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Colisao } from './colisao.js';
import { criarAleatorio, hashTexto } from './util.js';
import { criarNuvens, materialSuave, materialBrilho, caixaArredondada } from './temas/pecas.js';
import { criarTotem } from './totem.js';
import { Texturas } from './texturas.js';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function mergeGeometriasSimples(lista) { return mergeGeometries(lista, false); }

export class Mundo {
  /**
   * @param {THREE.Scene} scene
   * @param {object} tema      objeto de js/temas/*
   * @param {object} qualidade parâmetros de js/config.js QUALIDADE[nivel]
   * @param {object} layout    { linhas, colunas, celulas: [{l, c}], totens: [{l, c, numero, direcao}] }
   */
  constructor(scene, tema, qualidade, layout, seed = 'ilha', renderer = null) {
    this.scene = scene;
    this.renderer = renderer;
    this.tema = tema;
    this.qualidade = qualidade;
    this.colisao = new Colisao();
    this.rnd = criarAleatorio(hashTexto(seed));
    this.atualizaveis = [];
    this.totens = [];
    this.tempo = 0;

    this._ceu();
    this._ambiente();
    this._luzes();
    this._chao();
    this._agua();
    this.grade = this._grade(layout);
    this._totens(layout);
    this.pontoInicial = this._pontoInicial(layout);
    this._decorar();
    this._tufos();
    this._horizonte();
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

  // ── Mapa de ambiente gerado do próprio céu (reflexos e luz suave) ──
  _ambiente() {
    if (!this.renderer) return;
    const { tema, scene } = this;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const cenaEnv = new THREE.Scene();
    cenaEnv.add(this.domo.clone());
    const chao = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: tema.cores.grama, side: THREE.BackSide }));
    cenaEnv.add(chao);
    const sol = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff7e0' }));
    sol.position.set(...tema.luz.direcaoSol).multiplyScalar(3);
    cenaEnv.add(sol);
    scene.environment = pmrem.fromScene(cenaEnv, 0.06).texture;
    scene.environmentIntensity = 0.7;
    pmrem.dispose();
  }

  _luzes() {
    const { tema, scene, qualidade } = this;
    const hemi = new THREE.HemisphereLight(tema.luz.ceu, tema.luz.chao, tema.luz.intensidadeAmbiente * 0.6);
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
      sol.shadow.bias = -0.0008;
      sol.shadow.normalBias = 0.03;
      sol.shadow.radius = 3;
    }
    // Luz de contorno fria vinda de trás (realça silhuetas, estilo animação)
    const contorno = new THREE.DirectionalLight('#BFD8FF', 0.9);
    contorno.position.set(-tema.luz.direcaoSol[0], 8, -tema.luz.direcaoSol[2]);
    scene.add(contorno);
    this.sol = sol;
  }

  // ── Chão: disco de grama + anel de areia ──────────────────────
  _chao() {
    const { tema, scene, qualidade } = this;
    const grama = new THREE.Mesh(new THREE.CircleGeometry(CONFIG.mundo.raioIlha, 72), materialSuave('#FFFFFF', { roughness: 0.95, map: Texturas.grama(tema.cores.grama) }));
    grama.rotation.x = -Math.PI / 2;
    grama.receiveShadow = qualidade.sombras > 0;
    scene.add(grama);
    const areia = new THREE.Mesh(
      new THREE.RingGeometry(CONFIG.mundo.raioIlha - 0.3, CONFIG.mundo.raioAreia, 72),
      materialSuave('#FFFFFF', { roughness: 0.95, map: Texturas.areia(tema.cores.areia) })
    );
    areia.rotation.x = -Math.PI / 2;
    areia.position.y = -0.01;
    areia.receiveShadow = qualidade.sombras > 0;
    scene.add(areia);
    // "Barranco" da ilha até a água (lateral visível de perto)
    const lateral = new THREE.Mesh(
      new THREE.CylinderGeometry(CONFIG.mundo.raioAreia, CONFIG.mundo.raioAreia + 0.8, 1.2, 72, 1, true),
      materialSuave(tema.cores.areia, { side: THREE.DoubleSide, roughness: 0.95 })
    );
    lateral.position.y = -0.6;
    scene.add(lateral);
  }

  _agua() {
    const { tema, scene, qualidade } = this;
    const R = CONFIG.mundo.raioAreia;
    // Malha fina perto da ilha (onde as ondas aparecem) e grossa longe
    const seg = qualidade.aguaSegmentos || 96;
    const geo = new THREE.PlaneGeometry(320, 320, seg, seg);
    geo.rotateX(-Math.PI / 2); // coordenadas locais = mundo (x, 0, z)
    const mat = materialBrilho(tema.cores.agua, { transparent: true, opacity: 0.92, roughness: 0.18 });
    const uTempo = { value: 0 };
    this._uTempoAgua = uTempo;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTempo = uTempo;
      shader.uniforms.uRaio = { value: R };
      shader.uniforms.uCorFunda = { value: new THREE.Color(tema.cores.aguaFunda || tema.cores.agua) };
      shader.uniforms.uCorRasa = { value: new THREE.Color(tema.cores.agua) };
      shader.vertexShader = `
        uniform float uTempo; uniform float uRaio;
        varying float vProfundidade; varying float vEspuma;
        // Ondas em anéis que viajam para a praia: altas no mar aberto, pequenas na areia
        float ondaAltura(vec2 p) {
          float d = length(p);
          float amp = 0.06 + 0.42 * smoothstep(0.0, 22.0, d - uRaio);
          float anel  = sin(d * 0.85 - uTempo * 1.6);
          float cruz  = sin(p.x * 0.45 + p.y * 0.35 + uTempo * 0.9) * 0.45;
          float fino  = sin(p.x * 1.7 - uTempo * 2.3) * sin(p.y * 1.3 + uTempo * 1.7) * 0.18;
          return amp * (anel + cruz + fino);
        }
      ` + shader.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec2 p = position.xz;
          float e = 0.6;
          float h  = ondaAltura(p);
          float hx = ondaAltura(p + vec2(e, 0.0));
          float hz = ondaAltura(p + vec2(0.0, e));
          vec3 objectNormal = normalize(vec3(h - hx, e, h - hz));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position.x, position.y + h, position.z);
          float dist = length(p);
          vProfundidade = smoothstep(uRaio, uRaio + 26.0, dist);
          vEspuma = (1.0 - smoothstep(uRaio, uRaio + 2.2, dist)) * (0.5 + 0.5 * sin(dist * 0.85 - uTempo * 1.6));`);
      shader.fragmentShader = 'uniform vec3 uCorFunda; uniform vec3 uCorRasa; varying float vProfundidade; varying float vEspuma;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(uCorRasa, uCorFunda, vProfundidade);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(vEspuma, 0.0, 1.0) * 0.55);`);
    };
    mat.customProgramCacheKey = () => 'aguaOndas';
    const agua = new THREE.Mesh(geo, mat);
    agua.position.y = CONFIG.mundo.nivelAgua;
    agua.frustumCulled = false;
    scene.add(agua);

    // Sol no céu (disco luminoso na direção da luz)
    const sol = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFF4CC', fog: false }));
    sol.position.set(...tema.luz.direcaoSol).normalize().multiplyScalar(105);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFE9A8', transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
    halo.position.copy(sol.position);
    scene.add(sol, halo);
  }

  // ── Grade da cruzadinha: blocos instanciados ──────────────────
  _grade(layout) {
    const { tema, scene, qualidade } = this;
    const T = CONFIG.ladrilho.tamanho, H = CONFIG.ladrilho.altura, folga = CONFIG.ladrilho.folga;
    const celulas = layout.celulas;
    const origemX = -(layout.colunas - 1) / 2 * T;
    const origemZ = -(layout.linhas - 1) / 2 * T;

    const geo = caixaArredondada(T - folga, H, T - folga, 0.07, 2);
    geo.translate(0, H / 2, 0);
    // Atributo por casa: 0 = normal, 1 = palavra resolvida (verde reluzente pulsando)
    const resolvido = new THREE.InstancedBufferAttribute(new Float32Array(celulas.length), 1);
    geo.setAttribute('resolvido', resolvido);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, map: Texturas.pedra('#F2EADA', 15) });
    const uTempo = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTempo = uTempo;
      shader.vertexShader = 'attribute float resolvido;\nvarying float vResolvido;\nvarying vec3 vPosMundo;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vResolvido = resolvido;\n vPosMundo = (instanceMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = 'uniform float uTempo;\nvarying float vResolvido;\nvarying vec3 vPosMundo;\n' + shader.fragmentShader
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float pulso = 0.55 + 0.45 * sin(uTempo * 2.2 + vPosMundo.x * 0.9 + vPosMundo.z * 0.7);
          totalEmissiveRadiance += vec3(0.12, 0.95, 0.42) * vResolvido * (0.45 + 0.4 * pulso);`);
    };
    mat.customProgramCacheKey = () => 'casasCruzadinha';
    this._uTempoCasas = uTempo;
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

    const corVerde = new THREE.Color(tema.cores.casaResolvida || '#2ECC6A');
    return {
      malha, mapa, origemX, origemZ, linhas: layout.linhas, colunas: layout.colunas,
      posicaoDe: (l, c) => ({ x: origemX + c * T, z: origemZ + l * T }),
      /** Marca a casa como resolvida: fica verde e reluzente. */
      resolverCasa: (l, c) => {
        const cel = mapa.get(`${l},${c}`);
        if (!cel) return;
        malha.setColorAt(cel.indice, corVerde);
        malha.instanceColor.needsUpdate = true;
        resolvido.setX(cel.indice, 1);
        resolvido.needsUpdate = true;
      },
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
    this.areaLivre = areaLivre;
    // Caminho de pedras: do início até a entrada da grade
    const caminho = [];
    const fimZ = lim.maxZ - 0.8;
    for (let z = ini.z + 1.0; z > fimZ; z -= 0.95) caminho.push([ini.x + Math.sin(z * 1.7) * 0.25, z]);
    const resultado = this.tema.decorar({
      scene: this.scene, rnd: this.rnd, qualidade: this.qualidade,
      colisao: this.colisao, areaLivre, raioIlha: CONFIG.mundo.raioIlha, caminho,
    });
    if (resultado && resultado.atualizar) this.atualizaveis.push(resultado);
  }

  // ── Grama em tufos (instanciada, balança com o vento) ────────
  _tufos() {
    const n = this.qualidade.grama || 0;
    if (!n) return;
    const { scene, rnd, tema } = this;
    // Tufo = 3 planos cruzados com recorte alfa
    const plano = new THREE.PlaneGeometry(0.55, 0.5, 1, 2);
    plano.translate(0, 0.25, 0);
    const partes = [plano, plano.clone().rotateY(Math.PI / 3), plano.clone().rotateY(-Math.PI / 3)];
    const geo = mergeGeometriasSimples(partes);
    const mat = new THREE.MeshStandardMaterial({ map: Texturas.tufo(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, color: '#FFFFFF' });
    const uTempo = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTempo = uTempo;
      shader.vertexShader = 'uniform float uTempo;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec3 pm = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float balanco = sin(uTempo * 1.6 + pm.x * 0.8 + pm.z * 0.6) * 0.08 + sin(uTempo * 3.1 + pm.z) * 0.03;
        transformed.x += balanco * uv.y * uv.y;`);
    };
    mat.customProgramCacheKey = () => 'tufosGrama';
    this._uTempoTufos = uTempo;
    const malha = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(), c = new THREE.Color();
    const base = new THREE.Color(tema.cores.grama), escuro = new THREE.Color(tema.cores.gramaEscura), claro = new THREE.Color('#D7F08A');
    const lim = this.grade.limites, ini = this.pontoInicial;
    let i = 0, tent = 0;
    while (i < n && tent++ < n * 4) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (CONFIG.mundo.raioIlha - 0.6);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (x > lim.minX - 0.3 && x < lim.maxX + 0.3 && z > lim.minZ - 0.3 && z < lim.maxZ + 0.3) continue;
      if (Math.abs(x - ini.x) < 0.7 && z > lim.maxZ && z < ini.z + 1.5) continue; // caminho de pedras
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
      const esc = rnd.entre(0.7, 1.3);
      e.set(esc, esc * rnd.entre(0.8, 1.2), esc);
      m.compose(new THREE.Vector3(x, 0, z), q, e);
      malha.setMatrixAt(i, m);
      c.copy(escuro).lerp(base, rnd()).lerp(claro, rnd() * 0.3);
      malha.setColorAt(i, c);
      i++;
    }
    malha.count = i;
    malha.instanceMatrix.needsUpdate = true;
    malha.instanceColor.needsUpdate = true;
    malha.receiveShadow = this.qualidade.sombras > 0;
    malha.frustumCulled = false;
    scene.add(malha);
  }

  // ── Rochas no mar e ilhas ao longe (profundidade no horizonte) ──
  _horizonte() {
    const { scene, rnd, tema, colisao } = this;
    const R = CONFIG.mundo.raioAreia;
    const matRocha = materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.pedraMusgo(27) });
    const geoRocha = new THREE.IcosahedronGeometry(1, 1);
    // Rochas perto da praia (algumas dentro da água)
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, d = R + rnd.entre(0.5, 5);
      const r = new THREE.Mesh(geoRocha, matRocha);
      const esc = rnd.entre(0.7, 1.8);
      r.position.set(Math.cos(a) * d, CONFIG.mundo.nivelAgua - 0.2 + esc * 0.3, Math.sin(a) * d);
      r.scale.set(esc * rnd.entre(0.8, 1.4), esc * 0.7, esc);
      r.rotation.set(rnd(), rnd() * 6.28, rnd());
      r.castShadow = r.receiveShadow = true;
      scene.add(r);
    }
    // Ilhas distantes: montes com "copas" no topo, dentro da névoa
    const matMonte = materialSuave('#6E8F62', { roughness: 1 });
    const matCopa = materialSuave('#4F8A3C', { roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2, d = rnd.entre(60, 85);
      const g = new THREE.Group();
      const largura = rnd.entre(8, 18), altura = rnd.entre(4, 11);
      const monte = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), matMonte);
      monte.scale.set(largura, altura, largura * rnd.entre(0.6, 1));
      g.add(monte);
      for (let k = 0; k < 4; k++) {
        const copa = new THREE.Mesh(new THREE.SphereGeometry(rnd.entre(1.5, 3), 8, 6), matCopa);
        copa.position.set(rnd.entre(-largura * 0.4, largura * 0.4), altura * rnd.entre(0.5, 0.9), rnd.entre(-largura * 0.3, largura * 0.3));
        g.add(copa);
      }
      g.position.set(Math.cos(a) * d, CONFIG.mundo.nivelAgua - 0.5, Math.sin(a) * d);
      scene.add(g);
    }
    void colisao;
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
    if (this._uTempoCasas) this._uTempoCasas.value = this.tempo;
    if (this._uTempoAgua) this._uTempoAgua.value = this.tempo;
    if (this._uTempoTufos) this._uTempoTufos.value = this.tempo;
    for (const a of this.atualizaveis) a.atualizar(dt, this.tempo);
  }
}
