// ============================================================
//  js/util.js — Funções utilitárias puras (sem Three.js)
// ============================================================

/** Gerador pseudoaleatório determinístico (mulberry32). Mesmo seed = mesmo mundo. */
export function criarAleatorio(seed = 1) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rnd.entre = (min, max) => min + rnd() * (max - min);
  rnd.inteiro = (min, max) => Math.floor(rnd.entre(min, max + 1));
  rnd.escolher = (lista) => lista[Math.floor(rnd() * lista.length)];
  return rnd;
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Fator de suavização independente do frame rate. */
export const suavizar = (velocidade, dt) => 1 - Math.exp(-velocidade * dt);

/** Interpola ângulos pelo caminho mais curto. */
export function lerpAngulo(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Hash simples de string para seed numérico. */
export function hashTexto(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Lê/grava preferências do jogador no navegador (nunca dados pessoais). */
export const prefs = {
  ler(chave, padrao) {
    try {
      const v = localStorage.getItem('cruz3d_' + chave);
      return v === null ? padrao : JSON.parse(v);
    } catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem('cruz3d_' + chave, JSON.stringify(valor)); } catch { /* modo privado */ }
  },
};

export const ehToque = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
