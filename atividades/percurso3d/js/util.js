// ============================================================
//  js/util.js — Utilidades pequenas (aleatório com semente, DOM, eventos)
// ============================================================

export const $ = (id) => document.getElementById(id);

/** Aleatório determinístico (LCG) com helpers. */
export function criarAleatorio(semente = 12345) {
  let s = (semente >>> 0) || 1;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) / 16777216; };
  rnd.entre = (a, b) => a + rnd() * (b - a);
  rnd.inteiro = (a, b) => Math.floor(rnd.entre(a, b + 1));
  rnd.escolher = (arr) => arr[Math.floor(rnd() * arr.length)];
  rnd.embaralhar = (arr) => { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  return rnd;
}

export function hashTexto(t) { let h = 2166136261; for (const ch of String(t)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const suavizar = (k, dt) => 1 - Math.exp(-k * dt);
export const ehToque = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

/** Emissor de eventos simples. */
export class Emissor {
  constructor() { this._o = new Map(); }
  on(nome, fn) { if (!this._o.has(nome)) this._o.set(nome, []); this._o.get(nome).push(fn); return this; }
  emitir(nome, dados) { for (const fn of this._o.get(nome) || []) fn(dados); }
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Preferências no localStorage (falha silenciosa em modo privado). */
export const prefs = {
  ler(chave, padrao) { try { const v = localStorage.getItem('cidade_' + chave); return v === null ? padrao : JSON.parse(v); } catch { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem('cidade_' + chave, JSON.stringify(valor)); } catch { /* ignora */ } },
};

export function normalizar(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
