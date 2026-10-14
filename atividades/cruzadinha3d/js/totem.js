// ============================================================
//  js/totem.js — Totem numerado que marca o início de cada palavra.
//  Acende quando o personagem se aproxima (fase 3 liga o painel da dica).
// ============================================================
import * as THREE from 'three';
import { materialChapado } from './temas/pecas.js';

const geoCache = {};
function geometriasTotem() {
  if (geoCache.ok) return geoCache;
  geoCache.poste = new THREE.CylinderGeometry(0.16, 0.22, 1.1, 7);
  geoCache.poste.translate(0, 0.55, 0);
  geoCache.cabeca = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  geoCache.cabeca.translate(0, 1.45, 0);
  geoCache.topo = new THREE.ConeGeometry(0.47, 0.4, 4);
  geoCache.topo.translate(0, 1.96, 0);
  geoCache.ok = true;
  return geoCache;
}

/** Textura com o número, gerada em canvas (sem arquivos externos). */
function texturaNumero(numero, corFundo, corTexto) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = corFundo; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = corTexto;
  ctx.font = 'bold 84px Fraunces, Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

export function criarTotem({ numero, cor = '#286456', corAceso = '#E0A537' }) {
  const g = geometriasTotem();
  const grupo = new THREE.Group();
  const matPoste = materialChapado(cor);
  const poste = new THREE.Mesh(g.poste, matPoste);
  const texNum = texturaNumero(numero, '#FBF7EF', '#161F38');
  // Um único material com o número em todas as faces (1 draw call)
  const matFace = new THREE.MeshLambertMaterial({ map: texNum });
  const matLado = matPoste;
  const cabeca = new THREE.Mesh(g.cabeca, matFace);
  const matTopo = new THREE.MeshLambertMaterial({ color: cor, emissive: '#000000' });
  const topo = new THREE.Mesh(g.topo, matTopo);
  topo.rotation.y = Math.PI / 4;
  grupo.add(poste, cabeca, topo);
  grupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const corAcesoObj = new THREE.Color(corAceso);
  const corBase = new THREE.Color(cor);
  let aceso = false, nivel = 0, resolvido = false;

  return {
    grupo, numero,
    get aceso() { return aceso; },
    get nivel() { return nivel; },
    acender(v) { aceso = v; },
    marcarResolvido() { resolvido = true; matPoste.color.set(corAceso); matLado.color.set(corAceso); },
    atualizar(dt, t) {
      const alvo = aceso ? 1 : 0;
      nivel += (alvo - nivel) * Math.min(1, dt * 6);
      matTopo.emissive.copy(corAcesoObj).multiplyScalar(nivel * 0.9);
      matTopo.color.copy(corBase).lerp(corAcesoObj, nivel);
      topo.rotation.y = Math.PI / 4 + (aceso ? t * 1.5 : 0);
      cabeca.position.y = resolvido ? Math.sin(t * 2) * 0.03 : 0;
    },
  };
}
