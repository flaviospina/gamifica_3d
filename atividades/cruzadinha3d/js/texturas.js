// ============================================================
//  js/texturas.js — Texturas procedurais desenhadas em canvas
//  (pedra, grama, folhas, casca, areia, tufo de grama, musgo).
//  Nada é baixado: tudo é gerado na hora, em poucos milissegundos.
// ============================================================
import * as THREE from 'three';
import { criarAleatorio } from './util.js';

/** Ruído de valor suave (interpolação bilinear + oitavas). */
function campoRuido(tam, seed, oitavas = 4) {
  const rnd = criarAleatorio(seed);
  const base = 8;
  const grades = [];
  for (let o = 0; o < oitavas; o++) {
    const n = base << o;
    const g = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) g[i] = rnd();
    grades.push({ n, g });
  }
  const campo = new Float32Array(tam * tam);
  const suave = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    let v = 0, amp = 1, soma = 0;
    for (const { n, g } of grades) {
      const fx = (x / tam) * n, fy = (y / tam) * n;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = suave(fx - x0), ty = suave(fy - y0);
      const i = (xx, yy) => g[((yy % n) + n) % n * n + ((xx % n) + n) % n];
      const a = i(x0, y0) * (1 - tx) + i(x0 + 1, y0) * tx;
      const b = i(x0, y0 + 1) * (1 - tx) + i(x0 + 1, y0 + 1) * tx;
      v += (a * (1 - ty) + b * ty) * amp; soma += amp; amp *= 0.5;
    }
    campo[y * tam + x] = v / soma;
  }
  return campo;
}

function canvas(tam) { const cv = document.createElement('canvas'); cv.width = cv.height = tam; return cv; }
function textura(cv, repeticoes = 1) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeticoes, repeticoes);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const hex = (c) => { const k = new THREE.Color(c); return [k.r * 255, k.g * 255, k.b * 255]; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Pinta um canvas a partir de uma função (x, y, ruído) → [r, g, b, a]. */
function pintar(tam, seed, fn) {
  const cv = canvas(tam), ctx = cv.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const n = campoRuido(tam, seed);
  const n2 = campoRuido(tam, seed + 7, 3);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const i = y * tam + x;
    const [r, g, b, a] = fn(x / tam, y / tam, n[i], n2[i]);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a ?? 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

const cache = {};
export const Texturas = {
  /** Pedra clara (travertino) com veios e grãos. */
  pedra(cor = '#EFE6D3', seed = 11) {
    const k = 'pedra' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [120, 105, 85], 0.55);
    const cv = pintar(256, seed, (x, y, n, n2) => {
      const veio = Math.pow(Math.abs(Math.sin((n * 6 + x * 2) * Math.PI)), 12) * 0.35;
      const grao = (n2 - 0.5) * 0.18;
      return [...mix(base, escuro, Math.min(1, veio + grao + (n - 0.5) * 0.2)), 255];
    });
    return cache[k] = textura(cv, 1);
  },
  /** Pedra cinza com musgo embaixo (pilares, rochas). */
  pedraMusgo(seed = 21, forcaMusgo = 1) {
    const k = 'musgo' + seed + forcaMusgo; if (cache[k]) return cache[k];
    const pedra = [158, 156, 150], escura = [96, 94, 92], musgo = [86, 140, 60];
    const cv = pintar(256, seed, (x, y, n, n2) => {
      let c = mix(pedra, escura, Math.pow(n, 1.6));
      const m = Math.max(0, (1 - y) * 1.2 - 0.3) * (n2 > 0.45 ? 1 : 0) * Math.min(1, n2 * 1.3) * forcaMusgo; // musgo na base (uv.y baixo)
      c = mix(c, musgo, Math.min(1, m));
      return [...c, 255];
    });
    return cache[k] = textura(cv, 1);
  },
  /** Grama do chão: manchas de verdes e terra. */
  grama(cor = '#7CC24A', seed = 31) {
    const k = 'grama' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [40, 90, 30], 0.6), claro = mix(base, [220, 230, 120], 0.35);
    const cv = pintar(256, seed, (x, y, n, n2) => {
      let c = mix(escuro, base, n);
      c = mix(c, claro, Math.pow(n2, 3) * 0.9);
      return [...c, 255];
    });
    return cache[k] = textura(cv, 14);
  },
  /** Folhagem: pontinhos de folhas claras e escuras. */
  folhas(cor = '#4FA43A', seed = 41) {
    const k = 'folhas' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [20, 60, 20], 0.55), claro = mix(base, [230, 240, 140], 0.45);
    const cv = pintar(256, seed, (x, y, n, n2) => {
      const folha = Math.sin(x * 60 + n * 8) * Math.sin(y * 60 + n2 * 8);
      let c = mix(escuro, base, n);
      c = mix(c, claro, Math.max(0, folha) * 0.55 * n2);
      c = mix(c, escuro, Math.max(0, -folha) * 0.35);
      return [...c, 255];
    });
    return cache[k] = textura(cv, 2);
  },
  /** Casca de árvore: listras verticais irregulares. */
  casca(cor = '#8A5A2B', seed = 51) {
    const k = 'casca' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [30, 18, 8], 0.6), claro = mix(base, [200, 170, 120], 0.3);
    const cv = pintar(128, seed, (x, y, n, n2) => {
      const listra = Math.pow(Math.abs(Math.sin((x * 14 + n * 3) * Math.PI)), 3);
      let c = mix(base, escuro, listra * 0.8);
      c = mix(c, claro, Math.pow(n2, 4) * 0.5);
      return [...c, 255];
    });
    return cache[k] = textura(cv, 2);
  },
  /** Areia com grãos. */
  areia(cor = '#EBD9A0', seed = 61) {
    const k = 'areia' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [120, 100, 60], 0.3);
    const cv = pintar(128, seed, (x, y, n, n2) => [...mix(base, escuro, n * 0.5 + (n2 - 0.5) * 0.25), 255]);
    return cache[k] = textura(cv, 20);
  },
  /** Casa da cruzadinha: pedra clara com friso escuro nas bordas (lê como peça talhada). */
  ladrilho(cor = '#F2EADA', seed = 15) {
    const k = 'ladrilho' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [110, 95, 75], 0.5), friso = mix(base, [70, 60, 45], 0.75);
    const cv = pintar(128, seed, (x, y, n, n2) => {
      const veio = Math.pow(Math.abs(Math.sin((n * 5 + x * 2) * Math.PI)), 10) * 0.25;
      let c = mix(base, escuro, Math.min(1, veio + (n2 - 0.5) * 0.14));
      const borda = Math.min(x, 1 - x, y, 1 - y);            // distância à borda do quadrado
      c = mix(c, friso, 1 - smoothstep(0.03, 0.075, borda)); // friso escuro
      c = mix(c, [255, 255, 255], smoothstep(0.075, 0.12, borda) * (1 - smoothstep(0.12, 0.17, borda)) * 0.18); // chanfro claro
      return [...c, 255];
    });
    const t = textura(cv, 1); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return cache[k] = t;
  },
  /** Madeira: veios compridos e nós (postes, placas, lampiões). */
  madeira(cor = '#8B5E34', seed = 81) {
    const k = 'madeira' + cor + seed; if (cache[k]) return cache[k];
    const base = hex(cor), escuro = mix(base, [40, 24, 10], 0.6), claro = mix(base, [220, 180, 130], 0.35);
    const cv = pintar(128, seed, (x, y, n, n2) => {
      const veio = Math.pow(Math.abs(Math.sin((y * 9 + n * 4 + x * 0.6) * Math.PI)), 2.5);
      let c = mix(claro, base, n * 0.6 + 0.2);
      c = mix(c, escuro, veio * 0.55 + Math.pow(n2, 5) * 0.5);
      return [...c, 255];
    });
    return cache[k] = textura(cv, 1);
  },
  /** Ruído cinza em dados lineares (para perturbar a água). */
  ruido(seed = 91) {
    const k = 'ruido' + seed; if (cache[k]) return cache[k];
    const cv = pintar(128, seed, (x, y, n, n2) => { const v = 255 * (0.5 + 0.5 * Math.sin((n * 7 + n2 * 5) * Math.PI)); return [v, 255 * n2, 128, 255]; });
    const t = textura(cv, 1); t.colorSpace = THREE.NoColorSpace;
    return cache[k] = t;
  },
  /** Disco de sombra de contato (gradiente radial com alfa). */
  sombraContato() {
    const k = 'sombraContato'; if (cache[k]) return cache[k];
    const tam = 64, cv = canvas(tam), ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(20,30,15,0.55)'); g.addColorStop(0.6, 'rgba(20,30,15,0.25)'); g.addColorStop(1, 'rgba(20,30,15,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, tam, tam);
    const t = new THREE.CanvasTexture(cv);
    return cache[k] = t;
  },
  /** Tufo de grama (recorte com alfa): várias lâminas em leque. */
  tufo(seed = 71) {
    const k = 'tufo' + seed; if (cache[k]) return cache[k];
    const tam = 128, cv = canvas(tam), ctx = cv.getContext('2d');
    const rnd = criarAleatorio(seed);
    ctx.clearRect(0, 0, tam, tam);
    for (let i = 0; i < 11; i++) {
      const x0 = tam * (0.2 + rnd() * 0.6), larg = 6 + rnd() * 7;
      const inclina = (rnd() - 0.5) * 60, alt = tam * (0.55 + rnd() * 0.45);
      const g = ctx.createLinearGradient(0, tam, 0, tam - alt);
      g.addColorStop(0, '#3E7F2A'); g.addColorStop(0.6, '#6BB544'); g.addColorStop(1, '#BFE57A');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0 - larg / 2, tam); ctx.quadraticCurveTo(x0 + inclina * 0.3, tam - alt * 0.6, x0 + inclina, tam - alt);
      ctx.quadraticCurveTo(x0 + inclina * 0.5, tam - alt * 0.5, x0 + larg / 2, tam); ctx.closePath(); ctx.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return cache[k] = t;
  },
};
