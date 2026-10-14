// ============================================================
//  js/letras.js — Blocos de letra 3D (instanciados) com atlas de
//  glifos desenhado em canvas. Animação de queda com "quique".
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { caixaArredondada } from './temas/pecas.js';

const GLIFOS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÜÇ'];
const COLUNAS_ATLAS = 8;

/** Gera o atlas de letras (fonte Fraunces se já carregada; senão Georgia). */
export async function criarAtlasLetras() {
  try { await document.fonts?.load('700 100px Fraunces'); } catch { /* usa fallback */ }
  const tam = 128, cv = document.createElement('canvas');
  cv.width = cv.height = tam * COLUNAS_ATLAS;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#161F38';
  ctx.font = `700 ${tam * 0.72}px Fraunces, Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  GLIFOS.forEach((g, i) => {
    const x = (i % COLUNAS_ATLAS) * tam + tam / 2;
    const y = Math.floor(i / COLUNAS_ATLAS) * tam + tam * 0.56;
    ctx.fillText(g, x, y);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return {
    textura: tex,
    indice(letra) { const i = GLIFOS.indexOf(String(letra).toUpperCase()); return i < 0 ? GLIFOS.indexOf('A') : i; },
  };
}

const easeOutBounce = (x) => {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

export class BlocosLetra {
  /**
   * @param grade  objeto retornado por Mundo._grade (mapa de células → x, z)
   */
  constructor(scene, grade, atlas, qualidade, cores = {}) {
    this.scene = scene;
    this.grade = grade;
    this.atlas = atlas;
    this.elevacao = 0;                     // deslocamento vertical global (celebração)
    this.animacoes = [];
    this.visiveis = new Map();             // chave "l,c" → { indice, x, z, letra }
    this.ouvintes = { pousou: [] };

    const T = CONFIG.ladrilho.tamanho, H = CONFIG.ladrilho.altura;
    this.alturaBase = H;
    this.tamanho = T * 0.78;
    const geo = caixaArredondada(this.tamanho, 0.5, this.tamanho, 0.1, 2);
    geo.translate(0, 0.25, 0);
    const total = grade.mapa.size;
    this.letraIdx = new THREE.InstancedBufferAttribute(new Float32Array(total), 1);
    geo.setAttribute('letraIdx', this.letraIdx);

    const mat = new THREE.MeshStandardMaterial({ map: atlas.textura, color: cores.bloco || '#FBF7EF', roughness: 0.5 });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = 'attribute float letraIdx;\n' + shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         #ifdef USE_MAP
           // Letra só na face de cima; laterais usam a célula vazia do atlas (branca)
           vec2 celula = vec2(mod(letraIdx, ${COLUNAS_ATLAS}.0), ${COLUNAS_ATLAS - 1}.0 - floor(letraIdx / ${COLUNAS_ATLAS}.0));
           vec2 vazia = vec2(${COLUNAS_ATLAS - 1}.0, 0.0);
           vMapUv = (uv + (position.y > 0.42 ? celula : vazia)) / ${COLUNAS_ATLAS}.0;
         #endif`
      );
    };
    // Chave de cache própria para o shader modificado
    mat.customProgramCacheKey = () => 'blocosLetra';

    this.malha = new THREE.InstancedMesh(geo, mat, total);
    this.malha.castShadow = qualidade.sombras > 0;
    this.malha.receiveShadow = qualidade.sombras > 0;
    this.malha.frustumCulled = false;
    const escondido = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < total; i++) this.malha.setMatrixAt(i, escondido);
    this.malha.instanceMatrix.needsUpdate = true;
    this.malha.count = total;
    scene.add(this.malha);
    this._m = new THREE.Matrix4();
    this._livre = 0;
    this._indicePorChave = new Map();
    let i = 0;
    for (const chave of grade.mapa.keys()) this._indicePorChave.set(chave, i++);
  }

  on(nome, fn) { this.ouvintes[nome].push(fn); }

  /** Mostra a letra na célula (l, c). `queda` anima do céu; senão aparece no lugar. */
  mostrar(l, c, letra, { atraso = 0, queda = true } = {}) {
    const chave = `${l},${c}`;
    if (this.visiveis.has(chave)) return;
    const cel = this.grade.mapa.get(chave);
    if (!cel) return;
    const indice = this._indicePorChave.get(chave);
    this.letraIdx.setX(indice, this.atlas.indice(letra));
    this.letraIdx.needsUpdate = true;
    const item = { indice, x: cel.x, z: cel.z, letra, l, c };
    this.visiveis.set(chave, item);
    if (queda) this.animacoes.push({ ...item, t: -atraso, duracao: 0.9, giro: (Math.random() - 0.5) * 0.6 });
    else this._colocar(item, 0, 1);
  }

  _colocar(item, yExtra, escala, giro = 0) {
    this._m.makeRotationY(giro);
    this._m.scale(new THREE.Vector3(escala, escala, escala));
    this._m.setPosition(item.x, this.alturaBase + this.elevacao + yExtra, item.z);
    this.malha.setMatrixAt(item.indice, this._m);
    this.malha.instanceMatrix.needsUpdate = true;
  }

  /** Reposiciona todos os blocos visíveis (usado quando a grade sobe na celebração). */
  reposicionar() { for (const it of this.visiveis.values()) if (!this.animacoes.find(a => a.indice === it.indice)) this._colocar(it, 0, 1); }

  atualizar(dt) {
    for (let i = this.animacoes.length - 1; i >= 0; i--) {
      const a = this.animacoes[i];
      a.t += dt;
      if (a.t < 0) continue;
      const p = Math.min(1, a.t / a.duracao);
      const altura = 7 * (1 - easeOutBounce(p));
      const esc = 0.6 + 0.4 * Math.min(1, p * 3);
      this._colocar(a, altura, esc, a.giro * (1 - p));
      if (p >= 1) {
        this._colocar(a, 0, 1);
        this.animacoes.splice(i, 1);
        for (const fn of this.ouvintes.pousou) fn({ x: a.x, y: this.alturaBase + this.elevacao + 0.5, z: a.z, letra: a.letra });
      }
    }
  }
}
