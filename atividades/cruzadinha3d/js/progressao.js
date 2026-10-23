// ============================================================
//  js/progressao.js — Progressão por exploração: os totens das
//  zonas seguintes começam no alto de pilares de pedra; resolver
//  palavras faz os pilares descerem e libera o acesso.
//  Nunca bloqueia por erro: só por progresso (e dicas são ilimitadas).
// ============================================================
import * as THREE from 'three';
import { materialSuave } from './temas/pecas.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Texturas } from './texturas.js';

const ALTURA_PILAR = 2.3;

/** Divide as palavras (por número) em zonas e define quantas resolvidas liberam cada uma. */
export function calcularZonas(totalPalavras) {
  const n = totalPalavras;
  if (n <= 3) return { tamanhos: [n], limiares: [0] };
  const z1 = Math.ceil(n / 3) + 1;
  const z2 = Math.min(n - z1, Math.ceil(n / 3));
  const z3 = n - z1 - z2;
  const tamanhos = z3 > 0 ? [z1, z2, z3] : [z1, z2];
  const limiares = tamanhos.map((_, k) => k === 0 ? 0 : Math.ceil(n * k / 3));
  return { tamanhos, limiares };
}

export class Progressao {
  constructor({ scene, mundo, estado, colisao, cores }) {
    this.scene = scene;
    this.mundo = mundo;
    this.estado = estado;
    this.colisao = colisao;
    this.ouvintes = { zonaAberta: [] };
    this.pilares = [];
    this.zonasAbertas = new Set([0]);

    const { tamanhos, limiares } = calcularZonas(estado.total);
    this.limiares = limiares;
    // Palavras ordenadas por número → zona
    const ordenadas = [...estado.palavras].sort((a, b) => a.numero - b.numero || a.indice - b.indice);
    this.zonaDaPalavra = new Map();
    let i = 0;
    tamanhos.forEach((tam, z) => { for (let k = 0; k < tam; k++) this.zonaDaPalavra.set(ordenadas[i++].indice, z); });

    // Coluna talhada: fuste com leve afunilamento, capitel e anel — uma malha só
    const fuste = new THREE.CylinderGeometry(0.46, 0.6, ALTURA_PILAR - 0.3, 14);
    fuste.translate(0, (ALTURA_PILAR - 0.3) / 2, 0);
    const capitel = new THREE.CylinderGeometry(0.6, 0.48, 0.3, 14);
    capitel.translate(0, ALTURA_PILAR - 0.15, 0);
    const anel = new THREE.TorusGeometry(0.6, 0.07, 8, 20);
    anel.rotateX(Math.PI / 2); anel.translate(0, ALTURA_PILAR - 0.32, 0);
    const geoPilar = mergeGeometries([fuste.toNonIndexed(), capitel.toNonIndexed(), anel.toNonIndexed()], false);
    const matPedra = materialSuave('#FFFFFF', { roughness: 0.9, map: Texturas.pedra('#C9BC9C', 25) }); // arenito, igual à laje

    for (const totem of mundo.totens) {
      const z = this.zonaDaPalavra.get(totem.dados.palavra) ?? 0;
      totem.zona = z;
      if (z === 0) continue;
      const pilar = new THREE.Group();
      pilar.add(new THREE.Mesh(geoPilar, matPedra));
      pilar.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const { x, z: pz } = totem.grupo.position;
      pilar.position.set(x, 0, pz);
      scene.add(pilar);
      const solido = colisao.solidoCentro(x, pz, 1.25, 1.25, ALTURA_PILAR, -1);
      colisao.malhasCamera.push(pilar);
      totem.grupo.position.y = ALTURA_PILAR;
      totem.bloquear(true);
      this.pilares.push({ totem, pilar, solido, altura: ALTURA_PILAR, descendo: false, t: 0 });
    }
  }

  on(nome, fn) { this.ouvintes[nome].push(fn); }

  /** Quantas palavras ainda faltam para o totem descer (0 = liberado). */
  faltam(totem) {
    const z = totem.zona || 0;
    return Math.max(0, (this.limiares[z] || 0) - this.estado.resolvidas.size);
  }

  /** Chamar após cada palavra resolvida (e no início, para restaurar progresso). */
  verificar(animar = true) {
    const resolvidas = this.estado.resolvidas.size;
    this.limiares.forEach((lim, z) => {
      if (z === 0 || this.zonasAbertas.has(z) || resolvidas < lim) return;
      this.zonasAbertas.add(z);
      const totens = [];
      for (const p of this.pilares) {
        if (p.totem.zona !== z) continue;
        totens.push(p.totem);
        if (animar) { p.descendo = true; p.t = 0; }
        else this._finalizar(p);
      }
      if (animar && totens.length) for (const fn of this.ouvintes.zonaAberta) fn({ zona: z, totens });
    });
  }

  _finalizar(p) {
    p.descendo = false;
    p.altura = 0;
    p.totem.grupo.position.y = 0;
    p.pilar.position.y = -ALTURA_PILAR - 0.2;
    p.pilar.visible = false;
    p.solido.maxY = -1; // deixa de bloquear
    p.totem.bloquear(false);
  }

  atualizar(dt) {
    for (const p of this.pilares) {
      if (!p.descendo) continue;
      p.t += dt;
      const dur = 1.8;
      const f = Math.min(1, p.t / dur);
      const e = 1 - Math.pow(1 - f, 3); // ease-out cúbico
      p.altura = ALTURA_PILAR * (1 - e);
      p.totem.grupo.position.y = p.altura + Math.sin(f * Math.PI * 6) * 0.02 * (1 - f);
      p.pilar.position.y = -ALTURA_PILAR * e;
      p.solido.maxY = p.altura > 0.5 ? p.altura : -1;
      if (f >= 1) this._finalizar(p);
    }
  }
}
