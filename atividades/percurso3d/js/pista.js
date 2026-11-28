// ============================================================
//  js/pista.js — A pista em "8" com viaduto (só matemática: serve
//  tanto para a cena 3D quanto para o mapa 2D).
//
//  A posição ao longo da pista é medida em CASAS (0..40 por volta).
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

const PONTOS = [[4, -3], [16, -15], [26, -2], [18, 12], [6, 7], [-8, -5], [-20, -15], [-27, 0], [-16, 13], [-6, 9]];

export class Pista {
  constructor() {
    const N = this.N = 640;
    const curva = new THREE.CatmullRomCurve3(PONTOS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.6);
    const pts = curva.getSpacedPoints(N); pts.pop();
    this.comprimento = curva.getLength();
    this.largura = CONFIG.mundo.larguraPista;

    // Viaduto: o trecho que passa pelo cruzamento do "8" na primeira metade sobe; o outro passa por baixo.
    const cruz = new THREE.Vector3(0, 0, 1.8);
    let iA = 0, dA = 1e9, iB = 0, dB = 1e9;
    pts.forEach((p, i) => {
      const u = i / N, d = p.distanceTo(cruz);
      if (u > 0.35 && u < 0.55 && d < dA) { dA = d; iA = i; }
      if ((u > 0.85 || u < 0.08) && d < dB) { dB = d; iB = i; }
    });
    this.iViaduto = iA; this.iPorBaixo = iB; this.cruzamento = cruz;
    const ALT = CONFIG.mundo.alturaViaduto, PLANO = 0.025, RAMPA = 0.12;
    const altura = (i) => {
      let du = Math.abs(i - iA) / N; du = Math.min(du, 1 - du);
      const t = THREE.MathUtils.clamp((du - PLANO) / RAMPA, 0, 1);
      return ALT * (1 - t * t * (3 - 2 * t));
    };
    this.centro = pts.map((p, i) => new THREE.Vector3(p.x, altura(i), p.z));
    this.alturas = this.centro.map((c) => c.y);

    // Referenciais por amostra: tangente (3D), lateral (horizontal) e normal
    this.tan = []; this.lat = []; this.nor = [];
    for (let i = 0; i < N; i++) {
      const t = new THREE.Vector3().subVectors(this.centro[(i + 1) % N], this.centro[(i - 1 + N) % N]).normalize();
      const l = new THREE.Vector3(-t.z, 0, t.x).normalize();
      const n = new THREE.Vector3().crossVectors(t, l).normalize(); if (n.y < 0) n.negate();
      this.tan.push(t); this.lat.push(l); this.nor.push(n);
    }
    this.iLargada = Math.round(0.2 * N);
    this.casas = CONFIG.casas;
    this.porCasa = N / this.casas;
  }

  /** Índice de amostra (inteiro) do centro da casa k. */
  indiceDaCasa(k) { return (this.iLargada + Math.round(((k % this.casas) + this.casas) % this.casas * this.porCasa)) % this.N; }

  /**
   * Ponto e referencial na posição s (em casas, pode passar de 40: dá a volta).
   * @returns {{p:THREE.Vector3, t:THREE.Vector3, l:THREE.Vector3, n:THREE.Vector3}}
   */
  amostra(s, alvo = {}) {
    const N = this.N;
    const f = this.iLargada + (((s % this.casas) + this.casas) % this.casas) * this.porCasa;
    const i0 = Math.floor(f) % N, i1 = (i0 + 1) % N, k = f - Math.floor(f);
    alvo.p = (alvo.p || new THREE.Vector3()).copy(this.centro[i0]).lerp(this.centro[i1], k);
    alvo.t = (alvo.t || new THREE.Vector3()).copy(this.tan[i0]).lerp(this.tan[i1], k).normalize();
    alvo.l = (alvo.l || new THREE.Vector3()).copy(this.lat[i0]).lerp(this.lat[i1], k).normalize();
    alvo.n = (alvo.n || new THREE.Vector3()).copy(this.nor[i0]).lerp(this.nor[i1], k).normalize();
    return alvo;
  }

  /** Distância horizontal de (x, z) até o eixo da pista. */
  distancia(x, z) {
    let m = 1e9;
    for (let i = 0; i < this.N; i += 2) { const p = this.centro[i]; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; }
    return Math.sqrt(m);
  }

  /** A casa k fica no trecho elevado? */
  elevada(k) { return this.alturas[this.indiceDaCasa(k)] > 0.4; }
}
