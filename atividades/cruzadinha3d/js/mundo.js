// ============================================================
//  js/mundo.js — Monta a ilha: céu, chão, água, grade de blocos,
//  luzes, nuvens e decoração do tema. Registra colisores.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Colisao } from './colisao.js';
import { criarAleatorio, hashTexto } from './util.js';
import { criarNuvens, materialSuave, materialBrilho, caixaArredondada, pedraFacetada, geometrias } from './temas/pecas.js';
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
    this._praia();
    this._lampioes();
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
    const dirSol = new THREE.Vector3(...(tema.luz?.direcaoSol || [16, 11, -12])).normalize();
    const geo = new THREE.SphereGeometry(120, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        corTopo: { value: new THREE.Color(tema.ceu.topo) },
        corHorizonte: { value: new THREE.Color(tema.ceu.horizonte) },
        corSol: { value: new THREE.Color(tema.ceu.sol || '#FFF1C8') },
        dirSol: { value: dirSol },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 corTopo; uniform vec3 corHorizonte; uniform vec3 corSol; uniform vec3 dirSol;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          // Gradiente com faixa quente baixa (fim de tarde) e azul mais profundo no zênite
          vec3 cor = mix(corHorizonte, corTopo, pow(h, 0.55));
          float faixa = (1.0 - smoothstep(0.0, 0.22, h));
          cor = mix(cor, corSol * 0.92, faixa * 0.35);
          // Disco do sol e halo largo
          float s = clamp(dot(d, dirSol), 0.0, 1.0);
          cor += corSol * (pow(s, 1200.0) * 0.75 + pow(s, 32.0) * 0.18 + pow(s, 4.0) * 0.07);
          // Abaixo do horizonte: tom da água ao longe
          cor = mix(cor, corHorizonte * 0.85, smoothstep(0.0, -0.08, d.y));
          gl_FragColor = vec4(cor, 1.0);
        }`,
    });
    const domo = new THREE.Mesh(geo, mat);
    domo.renderOrder = -1;
    domo.frustumCulled = false;
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
    this.sol = sol;
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
    const mat = materialBrilho(tema.cores.agua, { transparent: true, opacity: 0.94, roughness: 0.38, metalness: 0.02, envMapIntensity: 0.6 }); // reflexo do sol largo, sem estourar
    const uTempo = { value: 0 };
    this._uTempoAgua = uTempo;
    const ruido = Texturas.ruido(93);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTempo = uTempo;
      shader.uniforms.uRaio = { value: R };
      shader.uniforms.uCorFunda = { value: new THREE.Color(tema.cores.aguaFunda || tema.cores.agua) };
      shader.uniforms.uCorRasa = { value: new THREE.Color(tema.cores.agua) };
      shader.uniforms.uCorCeu = { value: new THREE.Color(tema.ceu.horizonte) };
      shader.uniforms.uRuido = { value: ruido };
      shader.vertexShader = `
        uniform float uTempo; uniform float uRaio;
        varying float vProfundidade; varying float vEspuma; varying vec2 vPosXZ;
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
          vPosXZ = p;
          vEspuma = (1.0 - smoothstep(uRaio, uRaio + 2.2, dist)) * (0.5 + 0.5 * sin(dist * 0.85 - uTempo * 1.6));`);
      shader.fragmentShader = 'uniform vec3 uCorFunda; uniform vec3 uCorRasa; uniform vec3 uCorCeu; uniform sampler2D uRuido; uniform float uTempo; varying float vProfundidade; varying float vEspuma; varying vec2 vPosXZ;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(uCorRasa, uCorFunda, vProfundidade);
          // Cintilação: dois ruídos deslizando em direções diferentes
          float r1 = texture2D(uRuido, vPosXZ * 0.08 + vec2(uTempo * 0.015, uTempo * 0.01)).r;
          float r2 = texture2D(uRuido, vPosXZ * 0.13 - vec2(uTempo * 0.02, -uTempo * 0.012)).g;
          float cintila = smoothstep(0.62, 0.9, r1 * r2 * 1.7);
          diffuseColor.rgb += vec3(0.22, 0.26, 0.27) * cintila * (1.0 - vProfundidade * 0.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(vEspuma, 0.0, 1.0) * 0.6);`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          // Fresnel: de longe a água reflete o céu
          float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normalize(vNormal)), 0.0, 1.0), 3.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uCorCeu, fres * 0.45);
          // Limita o reflexo do sol antes do bloom (sem "bola branca" estourada)
          gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(0.9));`);
    };
    mat.customProgramCacheKey = () => 'aguaOndas2';
    const agua = new THREE.Mesh(geo, mat);
    agua.position.y = CONFIG.mundo.nivelAgua;
    agua.frustumCulled = false;
    scene.add(agua);
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
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, map: Texturas.ladrilho('#F2EADA', 15) });
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

    // Laje de pedra sob a cruzadinha: a grade vira um "monumento" em vez de peças soltas na grama
    const margem = T * 0.5, hLaje = 0.08;
    const larg = (layout.colunas - 1) * T + T + margem * 2, prof = (layout.linhas - 1) * T + T + margem * 2;
    const cx = origemX + (layout.colunas - 1) * T / 2, cz = origemZ + (layout.linhas - 1) * T / 2;
    const laje = new THREE.Mesh(caixaArredondada(larg, hLaje * 2, prof, 0.1, 2), materialSuave('#FFFFFF', { roughness: 0.9, map: Texturas.pedra('#CFC3A6', 29) }));
    laje.position.set(cx, 0, cz);
    laje.receiveShadow = qualidade.sombras > 0;
    scene.add(laje);
    this.colisao.adicionarPlataforma({ minX: cx - larg / 2, maxX: cx + larg / 2, minZ: cz - prof / 2, maxZ: cz + prof / 2, topo: hLaje, base: 0 });
    // Friso dourado ao redor da laje (sinal autoral, alvo do bloom bem discreto)
    const friso = new THREE.Mesh(new THREE.BoxGeometry(larg + 0.08, 0.025, prof + 0.08), new THREE.MeshStandardMaterial({ color: '#B8923A', emissive: '#5A4210', emissiveIntensity: 0.2, roughness: 0.45, metalness: 0.5 }));
    friso.position.set(cx, hLaje - 0.02, cz);
    scene.add(friso);

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

  // ── Praia: palmeiras na faixa de areia e areia molhada na beira ──
  _praia() {
    const { scene, rnd, qualidade, colisao } = this;
    const g = geometrias();
    const Ri = CONFIG.mundo.raioIlha, Ra = CONFIG.mundo.raioAreia;
    // Faixa de areia molhada (mais escura) junto à água
    const molhada = new THREE.Mesh(new THREE.RingGeometry(Ra - 0.9, Ra + 0.05, 72), materialSuave('#D9C58E', { roughness: 0.6, transparent: true, opacity: 0.55 }));
    molhada.rotation.x = -Math.PI / 2; molhada.position.y = 0.004;
    scene.add(molhada);
    // Palmeiras (instanciadas: tronco + folhas), inclinadas para o mar
    const n = Math.round(9 * (qualidade.decoracao || 0.6));
    const tronco = new THREE.InstancedMesh(g.troncoPalmeira, materialSuave('#FFFFFF', { roughness: 0.9, map: Texturas.casca('#9C6B3C', 57) }), n);
    const folhas = new THREE.InstancedMesh(g.folhasPalmeira, materialSuave('#FFFFFF', { roughness: 0.8, map: Texturas.folhas('#4C9A3A', 59) }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(), pos = new THREE.Vector3();
    let i = 0, tent = 0;
    while (i < n && tent++ < 80) {
      const a = rnd() * Math.PI * 2, d = rnd.entre(Ri - 0.4, Ra - 1.4);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - this.pontoInicial.x, z - this.pontoInicial.z) < 4) continue;
      if (!this.areaLivre(x, z, 1.4)) continue;
      // O tronco curva no +x local: gira para a curva apontar para fora da ilha
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      const esc = rnd.entre(0.85, 1.25);
      e.set(esc, esc * rnd.entre(0.9, 1.15), esc);
      pos.set(x, -0.05, z);
      m.compose(pos, q, e);
      tronco.setMatrixAt(i, m); folhas.setMatrixAt(i, m);
      colisao.solidoCentro(x, z, 0.5, 0.5, 3);
      i++;
    }
    tronco.count = folhas.count = i;
    tronco.instanceMatrix.needsUpdate = folhas.instanceMatrix.needsUpdate = true;
    tronco.castShadow = folhas.castShadow = qualidade.sombras > 0;
    tronco.receiveShadow = true;
    scene.add(tronco, folhas);
    colisao.malhasCamera.push(tronco);
  }

  // ── Lampiões ao longo do caminho de pedras (luz prática, alvo do bloom) ──
  _lampioes() {
    const { scene, qualidade } = this;
    const g = geometrias();
    const lim = this.grade.limites, ini = this.pontoInicial;
    const pontos = [];
    const z0 = ini.z + 0.6, z1 = lim.maxZ - 0.6;
    for (let k = 0; k < 2; k++) for (const lado of [-1, 1]) {
      const z = z0 + (z1 - z0) * (k === 0 ? 0.15 : 0.85);
      pontos.push([ini.x + lado * 1.15, z, lado]);
    }
    // Mais dois nos cantos da laje
    pontos.push([lim.minX - 0.3, lim.minZ - 0.3, -1], [lim.maxX + 0.3, lim.minZ - 0.3, 1]);
    const n = pontos.length;
    const poste = new THREE.InstancedMesh(g.lampiaoPoste, materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.madeira('#7A5230', 83) }), n);
    const vidro = new THREE.InstancedMesh(g.lampiaoVidro, new THREE.MeshStandardMaterial({ color: '#FFE9B0', emissive: '#FFB347', emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.7 }), n);
    const chama = new THREE.InstancedMesh(g.lampiaoChama, new THREE.MeshStandardMaterial({ color: '#FFF3C4', emissive: '#FFD27A', emissiveIntensity: 3.2, roughness: 0.4 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    pontos.forEach(([x, z, lado], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), lado > 0 ? Math.PI : 0); // braço virado para o caminho
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
      poste.setMatrixAt(i, m); vidro.setMatrixAt(i, m); chama.setMatrixAt(i, m);
      this.colisao.solidoCentro(x, z, 0.2, 0.2, 1.6);
    });
    poste.instanceMatrix.needsUpdate = vidro.instanceMatrix.needsUpdate = chama.instanceMatrix.needsUpdate = true;
    poste.castShadow = qualidade.sombras > 0;
    scene.add(poste, vidro, chama);
    this._chamas = chama.material;
  }

  // ── Rochas no mar, ilhas e montanhas ao longe (camadas de profundidade) ──
  _horizonte() {
    const { scene, rnd, qualidade } = this;
    const R = CONFIG.mundo.raioAreia;
    // Rochas facetadas perto da praia — fundidas numa malha só
    const matRocha = materialSuave('#FFFFFF', { roughness: 0.85, map: Texturas.pedraMusgo(27) });
    const rochas = [];
    for (let i = 0; i < 11; i++) {
      const a = rnd() * Math.PI * 2, d = R + rnd.entre(0.3, 5.5);
      const esc = rnd.entre(0.6, 1.9);
      const g = pedraFacetada(100 + i, 1, 1);
      g.scale(esc * rnd.entre(0.8, 1.4), esc * 0.65, esc);
      g.rotateY(rnd() * 6.28);
      g.translate(Math.cos(a) * d, CONFIG.mundo.nivelAgua - 0.35, Math.sin(a) * d);
      rochas.push(g);
    }
    const malhaRochas = new THREE.Mesh(mergeGeometriasSimples(rochas), matRocha);
    rochas.forEach(g => g.dispose());
    malhaRochas.castShadow = malhaRochas.receiveShadow = qualidade.sombras > 0;
    scene.add(malhaRochas);
    // Ilhas a média distância: montes + copas, fundidos por material
    const montes = [], copas = [];
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI * 2, d = rnd.entre(55, 85);
      const largura = rnd.entre(8, 18), altura = rnd.entre(4, 11);
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = CONFIG.mundo.nivelAgua - 0.5;
      const monte = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      monte.scale(largura, altura, largura * rnd.entre(0.6, 1)).translate(cx, cy, cz);
      montes.push(monte);
      for (let k = 0; k < 4; k++) {
        const copa = new THREE.SphereGeometry(rnd.entre(1.5, 3), 8, 6);
        copa.translate(cx + rnd.entre(-largura * 0.4, largura * 0.4), cy + altura * rnd.entre(0.5, 0.9), cz + rnd.entre(-largura * 0.3, largura * 0.3));
        copas.push(copa);
      }
    }
    scene.add(new THREE.Mesh(mergeGeometriasSimples(montes), materialSuave('#6E8F62', { roughness: 1 })));
    scene.add(new THREE.Mesh(mergeGeometriasSimples(copas), materialSuave('#4F8A3C', { roughness: 1 })));
    montes.forEach(g => g.dispose()); copas.forEach(g => g.dispose());
    // Montanhas distantes: silhuetas grandes dentro da névoa (profundidade "cinematográfica")
    // Cada serra = um pico principal e dois ombros mais baixos, para não virar "pirâmide"
    const serras = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd.entre(-0.3, 0.3), d = rnd.entre(105, 130);
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const largura = rnd.entre(34, 60), altura = rnd.entre(6, 13);
      const picos = [[0, 0, 1, 1], [rnd.entre(-0.45, -0.25), rnd.entre(-0.2, 0.2), 0.75, rnd.entre(0.45, 0.7)], [rnd.entre(0.25, 0.45), rnd.entre(-0.2, 0.2), 0.7, rnd.entre(0.4, 0.65)]];
      for (const [dx, dz, el, ea] of picos) {
        const pico = new THREE.ConeGeometry(1, 1, 6, 1);
        pico.rotateY(rnd() * 6.28);
        pico.scale(largura * el, altura * ea, largura * el * rnd.entre(0.6, 0.9)).translate(cx + dx * largura, CONFIG.mundo.nivelAgua + altura * ea / 2 - 1, cz + dz * largura);
        serras.push(pico);
      }
    }
    const matSerra = materialSuave(this.tema.ceu.montanha || '#7E8FB0', { roughness: 1 });
    scene.add(new THREE.Mesh(mergeGeometriasSimples(serras), matSerra));
    serras.forEach(g => g.dispose());
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
    if (this._chamas) this._chamas.emissiveIntensity = 3.0 + Math.sin(this.tempo * 7.3) * 0.35 + Math.sin(this.tempo * 19) * 0.15;
    for (const a of this.atualizaveis) a.atualizar(dt, this.tempo);
  }
}
