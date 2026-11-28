// ============================================================
//  js/texturas.js — Texturas desenhadas em canvas (nada é baixado)
// ============================================================
import * as THREE from 'three';
import { criarAleatorio } from './util.js';

export function tex(fn, w = 256, h = 256, repete = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repete) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repete[0], repete[1]); }
  return t;
}

const cache = {};
const memo = (k, fn) => (cache[k] ||= fn());

export const Texturas = {
  grama: () => memo('grama', () => { const r = criarAleatorio(7); return tex((c, w, h) => {
    c.fillStyle = '#6FBF4A'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `hsl(${100 + r() * 20}, ${45 + r() * 25}%, ${38 + r() * 22}%)`; c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
  }, 512, 512, [14, 14]); }),

  /** Asfalto: u = comprimento (1 repetição = 8 m), v = largura. */
  asfalto: () => memo('asfalto', () => { const r = criarAleatorio(11); return tex((c, w, h) => {
    c.fillStyle = '#4A4F58'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? 30 : 110},${r() < 0.5 ? 32 : 115},${r() < 0.5 ? 38 : 125},${r() * 0.5})`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.fillStyle = '#F5F0DC'; c.fillRect(0, 8, w, 6); c.fillRect(0, h - 14, w, 6);
    c.fillStyle = '#F2C14E'; c.fillRect(0, h / 2 - 3, w * 0.5, 6);
  }, 512, 256, [1, 1]); }),

  concreto: () => memo('concreto', () => { const r = criarAleatorio(13); return tex((c, w, h) => {
    c.fillStyle = '#C6C9D0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${r() < 0.5 ? 90 : 235},${r() < 0.5 ? 92 : 235},${r() < 0.5 ? 100 : 240},${r() * 0.25})`; c.fillRect(r() * w, r() * h, 3, 3); }
    c.strokeStyle = 'rgba(80,84,96,.35)'; c.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  }, 256, 256, [1, 1]); }),

  /** Uma janela por repetição: a textura é clonada por prédio com repeat = (colunas, andares). */
  janela: (cor) => memo('janela' + cor, () => tex((c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(28,42,68,.9)'; c.fillRect(w * 0.22, h * 0.2, w * 0.56, h * 0.52);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(w * 0.22, h * 0.2, w * 0.56, h * 0.09);
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, h * 0.92, w, h * 0.08);
  }, 64, 64, [1, 1])),

  xadrez: () => memo('xadrez', () => tex((c, w, h) => { const n = 4; for (let y = 0; y < n; y++) for (let x = 0; x < n * 4; x++) { c.fillStyle = (x + y) % 2 ? '#161F38' : '#FBF7EF'; c.fillRect(x * w / (n * 4), y * h / n, w / (n * 4) + 1, h / n + 1); } }, 512, 128)),

  faixa: (texto) => tex((c, w, h) => {
    c.fillStyle = '#E0A537'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#161F38'; c.font = '700 150px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(texto, w / 2, h / 2 + 8);
  }, 2048, 256),

  bandeira: (cor, letra) => tex((c, w, h) => {
    c.fillStyle = cor; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = '700 84px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(letra, w / 2, h / 2 + 4);
  }, 160, 100),

  placaNome: (cor, nome) => tex((c, w, h) => {
    c.fillStyle = '#FBF7EF'; c.fillRect(0, 0, w, h);
    c.fillStyle = cor; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
    c.fillStyle = '#161F38'; c.font = '700 54px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(nome.slice(0, 10), w / 2, h / 2 + 2);
  }, 320, 110),

  faceDado: (n) => memo('dado' + n, () => tex((c, w, h) => {
    c.fillStyle = '#FBF7EF'; c.fillRect(0, 0, w, h); c.fillStyle = '#161F38';
    const P = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]] }[n];
    for (const [x, y] of P) { c.beginPath(); c.arc(x * w, y * h, w * 0.09, 0, 6.28); c.fill(); }
  }, 128, 128)),
};

/**
 * Textura da placa de uma casa. Escondida: "?" grande e o número pequeno.
 * Revelada: rótulo da carta e o número pequeno.
 */
export function desenharPlaca(canvas, { numero, cor, rotulo = null, corCarta = '#FBF7EF', destaque = false }) {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = cor; c.fillRect(0, 0, w, h);
  // miolo
  c.fillStyle = rotulo ? corCarta : 'rgba(255,255,255,.28)';
  c.beginPath(); c.roundRect(16, 16, w - 32, h - 32, 22); c.fill();
  c.strokeStyle = destaque ? '#E0A537' : 'rgba(255,255,255,.85)'; c.lineWidth = destaque ? 14 : 8;
  c.beginPath(); c.roundRect(10, 10, w - 20, h - 20, 26); c.stroke();
  c.fillStyle = '#161F38'; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (rotulo) {
    const tam = rotulo.length <= 3 ? 110 : rotulo.length <= 5 ? 74 : 50;
    c.font = `700 ${tam}px Inter, Arial, sans-serif`;
    const partes = rotulo.split(' ');
    if (partes.length > 1 && rotulo.length > 6) { c.fillText(partes[0], w / 2, h / 2 - tam * 0.5 + 8); c.fillText(partes.slice(1).join(' '), w / 2, h / 2 + tam * 0.55 + 8); }
    else c.fillText(rotulo, w / 2, h / 2 + 10);
  } else {
    c.font = '700 150px Fraunces, Georgia, serif';
    c.fillStyle = 'rgba(22,31,56,.85)'; c.fillText('?', w / 2, h / 2 + 12);
  }
  c.font = '700 34px Inter, Arial, sans-serif'; c.fillStyle = 'rgba(22,31,56,.75)'; c.textAlign = 'left';
  c.fillText(String(numero), 28, 44);
}
