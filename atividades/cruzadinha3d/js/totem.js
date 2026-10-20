// ============================================================
//  js/totem.js — Totem numerado que marca o início de cada palavra.
//  Acende quando o personagem se aproxima (fase 3 liga o painel da dica).
// ============================================================
import * as THREE from 'three';
import { materialSuave, caixaArredondada } from './temas/pecas.js';
import { Texturas } from './texturas.js';

const geoCache = {};
function geometriasTotem() {
  if (geoCache.ok) return geoCache;
  geoCache.poste = new THREE.CylinderGeometry(0.15, 0.24, 1.15, 12);
  geoCache.poste.translate(0, 0.575, 0);
  geoCache.cabeca = caixaArredondada(0.64, 0.64, 0.64, 0.12, 2);
  geoCache.cabeca.translate(0, 1.47, 0);
  geoCache.gema = new THREE.SphereGeometry(0.2, 12, 9);
  geoCache.gema.translate(0, 1.95, 0);
  geoCache.base = new THREE.CylinderGeometry(0.34, 0.4, 0.12, 12);
  geoCache.base.translate(0, 0.06, 0);
  geoCache.ok = true;
  return geoCache;
}

/** Textura com o número, gerada em canvas (sem arquivos externos). */
function texturaNumero(numero, corFundo, corTexto) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = corFundo; ctx.fillRect(0, 0, 256, 256);
  // Moldura suave
  ctx.strokeStyle = 'rgba(22,31,56,.18)'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.roundRect(18, 18, 220, 220, 36); ctx.stroke();
  ctx.fillStyle = corTexto;
  ctx.font = '700 150px Fraunces, Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), 128, 140);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function criarTotem({ numero, cor = '#286456', corAceso = '#E0A537' }) {
  const g = geometriasTotem();
  const grupo = new THREE.Group();
  const matPoste = materialSuave(cor, { roughness: 0.7, map: Texturas.pedraMusgo(23) });
  const poste = new THREE.Mesh(g.poste, matPoste);
  const base = new THREE.Mesh(g.base, matPoste);
  const texNum = texturaNumero(numero, '#FBF7EF', '#161F38');
  const cabeca = new THREE.Mesh(g.cabeca, new THREE.MeshStandardMaterial({ map: texNum, roughness: 0.55 }));
  const matGema = new THREE.MeshStandardMaterial({ color: cor, emissive: '#000000', roughness: 0.2, metalness: 0.1 });
  const gema = new THREE.Mesh(g.gema, matGema);
  grupo.add(base, poste, cabeca, gema);
  grupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const corAcesoObj = new THREE.Color(corAceso);
  const corBase = new THREE.Color(cor);
  let aceso = false, nivel = 0, resolvido = false, bloqueado = false;
  const corBloqueado = new THREE.Color('#8E939B');

  return {
    grupo, numero,
    get aceso() { return aceso; },
    get nivel() { return nivel; },
    acender(v) { aceso = v; },
    bloquear(v) { bloqueado = v; },
    get bloqueado() { return bloqueado; },
    marcarResolvido() { resolvido = true; matPoste.color.set(corAceso); },
    atualizar(dt, t) {
      const alvo = aceso ? 1 : 0;
      nivel += (alvo - nivel) * Math.min(1, dt * 6);
      matGema.emissive.copy(corAcesoObj).multiplyScalar(bloqueado ? nivel * 0.2 : nivel * 1.2);
      matGema.color.copy(bloqueado ? corBloqueado : corBase).lerp(corAcesoObj, bloqueado ? nivel * 0.3 : nivel);
      gema.position.y = Math.sin(t * 2.5) * 0.04 * (0.4 + nivel);
      gema.scale.setScalar(1 + nivel * 0.25 + Math.sin(t * 6) * 0.03 * nivel);
      cabeca.rotation.y = aceso ? Math.sin(t * 2) * 0.08 : 0;
      cabeca.position.y = resolvido ? Math.sin(t * 2) * 0.03 : 0;
    },
  };
}
