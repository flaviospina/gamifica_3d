// ============================================================
//  js/totem.js — Totem numerado que marca o início de cada palavra.
//  Forma autoral: base de pedras, poste de madeira com braço, placa
//  com o número e um lampião que acende quando o explorador chega.
//  Estados: fechado (cadeado, lampião apagado) · disponível (lampião
//  dourado ao aproximar) · resolvido (lampião verde aceso).
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { caixaArredondada, pedraFacetada } from './temas/pecas.js';
import { Texturas } from './texturas.js';

const cache = {};
/** Pinta um atributo de cor por vértice (para fundir pedra e madeira num só material). */
function colorir(geo, cor) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(cor);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function geometriasTotem() {
  if (cache.ok) return cache;
  const partes = [];
  // Base: três pedras achatadas
  const pedras = [[0, 0, 0, 0.32, 0.2], [0.26, 0, 0.14, 0.19, 0.14], [-0.23, 0, -0.15, 0.17, 0.12]];
  pedras.forEach(([x, y, z, r, h], i) => {
    const p = pedraFacetada(7 + i, r, 1); p.scale(1, h / r, 1); p.translate(x, y, z);
    partes.push(colorir(p, i === 0 ? '#9AA0A6' : '#8B9398'));
  });
  // Poste de madeira com dois anéis e braço
  const poste = new THREE.CylinderGeometry(0.11, 0.16, 1.55, 10); poste.translate(0, 0.95, 0);
  partes.push(colorir(poste, '#8B5E34'));
  for (const y of [0.55, 1.35]) { const anel = new THREE.TorusGeometry(0.14, 0.03, 6, 12); anel.rotateX(Math.PI / 2); anel.translate(0, y, 0); partes.push(colorir(anel, '#5E3C1E')); }
  const braco = new THREE.BoxGeometry(0.5, 0.07, 0.07); braco.translate(0.2, 1.68, 0);
  partes.push(colorir(braco, '#8B5E34'));
  const gancho = new THREE.TorusGeometry(0.035, 0.012, 5, 10); gancho.translate(0.42, 1.6, 0);
  partes.push(colorir(gancho, '#4A4A50'));
  // Tampa e fundo do lampião entram na mesma malha (metal escuro)
  const tampaL = new THREE.ConeGeometry(0.15, 0.1, 6); tampaL.translate(0.42, 1.6, 0);
  const fundoL = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 6); fundoL.translate(0.42, 1.28, 0);
  partes.push(colorir(tampaL, '#3B3F47'), colorir(fundoL, '#3B3F47'));
  cache.estrutura = mergeGeometries(partes, false); partes.forEach(p => p.dispose());
  // Placa com o número (pendurada no poste, de frente para o sul)
  cache.placa = caixaArredondada(0.74, 0.6, 0.08, 0.06, 2); cache.placa.translate(0, 1.2, 0.17);
  // Lampião: vidro em prisma + núcleo
  cache.vidro = new THREE.CylinderGeometry(0.11, 0.09, 0.26, 6); cache.vidro.translate(0.42, 1.42, 0);
  cache.nucleo = new THREE.SphereGeometry(0.055, 8, 6); cache.nucleo.translate(0.42, 1.42, 0);
  // Cadeado (estado fechado): corpo + arco
  const corpo = caixaArredondada(0.16, 0.14, 0.06, 0.03, 1); corpo.translate(0, 0.98, 0.26);
  const arco = new THREE.TorusGeometry(0.05, 0.015, 6, 10, Math.PI); arco.translate(0, 1.05, 0.26);
  cache.cadeado = mergeGeometries([corpo.toNonIndexed(), arco.toNonIndexed()], false);
  cache.matEstrutura = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  cache.matVidro = new THREE.MeshPhysicalMaterial({ color: '#FFF6DC', roughness: 0.15, transmission: 0, transparent: true, opacity: 0.45, clearcoat: 0.6 });
  cache.matCadeado = new THREE.MeshStandardMaterial({ color: '#C9A227', roughness: 0.35, metalness: 0.7 });
  cache.ok = true;
  return cache;
}

/** Textura da placa: tábua de madeira com número queimado e borda. */
function texturaPlaca(numero, corBorda = '#E0A537') {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 208;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 208);
  g.addColorStop(0, '#C9955A'); g.addColorStop(0.5, '#B07A42'); g.addColorStop(1, '#9A6636');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 208);
  // Veios
  ctx.strokeStyle = 'rgba(70,40,15,.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); const y = 14 + i * 22; ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 3); ctx.stroke(); }
  // Borda
  ctx.strokeStyle = corBorda; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(12, 12, 232, 184, 22); ctx.stroke();
  // Número "queimado"
  ctx.fillStyle = '#2B1A0E';
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6;
  ctx.font = '700 128px Fraunces, Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), 128, 110);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function criarTotem({ numero, cor = '#286456', corAceso = '#E0A537', corResolvido = '#5CF28A' }) {
  const g = geometriasTotem();
  const grupo = new THREE.Group();
  const estrutura = new THREE.Mesh(g.estrutura, g.matEstrutura);
  const matPlaca = new THREE.MeshStandardMaterial({ map: texturaPlaca(numero), roughness: 0.7 });
  const placa = new THREE.Mesh(g.placa, matPlaca);
  const vidro = new THREE.Mesh(g.vidro, g.matVidro);
  const matNucleo = new THREE.MeshStandardMaterial({ color: '#6B6F77', emissive: '#000000', roughness: 0.3 });
  const nucleo = new THREE.Mesh(g.nucleo, matNucleo);
  const cadeado = new THREE.Mesh(g.cadeado, g.matCadeado);
  cadeado.visible = false;
  grupo.add(estrutura, placa, vidro, nucleo, cadeado);
  grupo.traverse(o => { if (o.isMesh) { o.castShadow = o !== vidro; o.receiveShadow = true; } });
  vidro.castShadow = false;

  const corAcesoObj = new THREE.Color(corAceso);
  const corResolvidoObj = new THREE.Color(corResolvido);
  const corApagado = new THREE.Color('#6B6F77');
  let aceso = false, nivel = 0, resolvido = false, bloqueado = false;

  return {
    grupo, numero,
    get aceso() { return aceso; },
    get nivel() { return nivel; },
    acender(v) { aceso = v; },
    bloquear(v) { bloqueado = v; cadeado.visible = v; },
    get bloqueado() { return bloqueado; },
    marcarResolvido() {
      resolvido = true;
      matPlaca.map = texturaPlaca(numero, corResolvido); matPlaca.needsUpdate = true;
    },
    atualizar(dt, t) {
      const alvo = aceso ? 1 : 0;
      nivel += (alvo - nivel) * Math.min(1, dt * 6);
      if (resolvido) {
        // Resolvido: lampião verde sempre aceso, respirando devagar
        const resp = 0.85 + 0.15 * Math.sin(t * 1.8);
        matNucleo.color.copy(corResolvidoObj);
        matNucleo.emissive.copy(corResolvidoObj).multiplyScalar(1.6 * resp);
      } else {
        const forca = bloqueado ? nivel * 0.25 : nivel;
        const tremula = 1 + Math.sin(t * 9) * 0.08 * forca + Math.sin(t * 23) * 0.04 * forca;
        matNucleo.color.copy(corApagado).lerp(corAcesoObj, forca);
        matNucleo.emissive.copy(corAcesoObj).multiplyScalar(2.2 * forca * tremula);
      }
      // Lampião balança de leve no gancho quando aceso; placa oscila ao abrir
      vidro.rotation.z = nucleo.rotation.z = Math.sin(t * 1.7) * 0.05 * (0.3 + nivel);
      placa.rotation.y = aceso ? Math.sin(t * 2) * 0.05 : 0;
      cadeado.rotation.y = bloqueado ? Math.sin(t * 2.3) * 0.1 * nivel : 0;
    },
  };
}
