// ============================================================
//  js/carrinho.js — O peão de cada jogador: um carrinho conversível
//  com um boneco ao volante e a bandeirinha com a inicial do nome.
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Texturas } from './texturas.js';

const PELES = ['#E8B894', '#C68E5E', '#8D5A3B', '#F1C9A5', '#A9714B', '#5E3A26'];
const CABELOS = ['#2B1A0E', '#5A3A1E', '#111111', '#8A5A2B', '#2B1A0E', '#3A2A1E'];
const geo = {};
function geometrias() {
  if (geo.ok) return geo;
  geo.corpo = new RoundedBoxGeometry(1.15, 0.5, 2.1, 3, 0.2); geo.corpo.translate(0, 0.5, 0);
  const banco = new THREE.BoxGeometry(0.85, 0.28, 0.75); banco.translate(0, 0.72, -0.2);
  const painel = new THREE.BoxGeometry(0.95, 0.2, 0.25); painel.translate(0, 0.82, 0.42);
  const paraLama = [];
  for (const [x, z] of [[-0.6, 0.65], [0.6, 0.65], [-0.6, -0.65], [0.6, -0.65]]) { const p = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12, 1, false, 0, Math.PI); p.rotateZ(Math.PI / 2); p.rotateX(Math.PI / 2); p.translate(x, 0.34, z); paraLama.push(p); }
  geo.escuro = mergeGeometries([banco.toNonIndexed(), painel.toNonIndexed()], false);
  geo.vidro = new THREE.BoxGeometry(0.95, 0.42, 0.06); geo.vidro.rotateX(-0.35); geo.vidro.translate(0, 1.0, 0.5);
  const roda = (z) => { const lista = []; for (const x of [-0.6, 0.6]) { const r = new THREE.CylinderGeometry(0.26, 0.26, 0.2, 14); r.rotateZ(Math.PI / 2); r.translate(x, 0, 0); lista.push(r.toNonIndexed()); const c = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8); c.rotateZ(Math.PI / 2); c.translate(x, 0, 0); lista.push(c.toNonIndexed()); } void z; return mergeGeometries(lista, false); };
  geo.eixo = roda();
  geo.cabeca = new THREE.SphereGeometry(0.27, 16, 12);
  geo.cabelo = new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geo.tronco = new THREE.CapsuleGeometry(0.2, 0.2, 4, 10);
  geo.olho = new THREE.SphereGeometry(0.04, 8, 6);
  geo.mastro = new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6);
  geo.bandeira = new THREE.PlaneGeometry(0.75, 0.47);
  geo.farol = new THREE.BoxGeometry(0.9, 0.12, 0.05);
  geo.ok = true;
  return geo;
}

/**
 * @param {string} cor     hex do jogador
 * @param {string} inicial letra da bandeira
 * @param {number} indice  varia pele/cabelo do boneco
 */
export function criarCarrinho(cor, inicial, indice = 0) {
  const g = geometrias();
  const grupo = new THREE.Group();
  const m = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...extra });
  const corpo = new THREE.Mesh(g.corpo, m(cor, { roughness: 0.35, metalness: 0.15 }));
  const escuro = new THREE.Mesh(g.escuro, m('#2A2F3A', { roughness: 0.8 }));
  const vidro = new THREE.Mesh(g.vidro, new THREE.MeshStandardMaterial({ color: '#BFE3FF', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 }));
  const eixoF = new THREE.Mesh(g.eixo, m('#1B1D22', { roughness: 0.9 })); eixoF.position.set(0, 0.26, 0.65);
  const eixoT = new THREE.Mesh(g.eixo, eixoF.material); eixoT.position.set(0, 0.26, -0.65);
  // Boneco ao volante
  const boneco = new THREE.Group(); boneco.position.set(0, 0.92, -0.18);
  const pele = m(PELES[indice % PELES.length], { roughness: 0.6 });
  const tronco = new THREE.Mesh(g.tronco, m('#FBF7EF', { roughness: 0.7 })); tronco.position.y = 0.05;
  const cabeca = new THREE.Mesh(g.cabeca, pele); cabeca.position.y = 0.52;
  const cabelo = new THREE.Mesh(g.cabelo, m(CABELOS[indice % CABELOS.length], { roughness: 0.9 })); cabelo.position.y = 0.55;
  const olhos = new THREE.Group();
  for (const x of [-0.1, 0.1]) { const o = new THREE.Mesh(g.olho, m('#161F38')); o.position.set(x, 0.55, 0.24); olhos.add(o); }
  boneco.add(tronco, cabeca, cabelo, olhos);
  const mastro = new THREE.Mesh(g.mastro, m('#F5EAD3')); mastro.position.set(0.45, 1.35, -0.85);
  // Bandeira com duas faces (a letra lê certo de frente e de trás)
  const matBandeira = new THREE.MeshBasicMaterial({ map: Texturas.bandeira(cor, inicial) });
  const bandeira = new THREE.Group(); bandeira.position.set(0.84, 1.85, -0.85);
  const frente = new THREE.Mesh(g.bandeira, matBandeira), verso = new THREE.Mesh(g.bandeira, matBandeira); verso.rotation.y = Math.PI;
  bandeira.add(frente, verso);
  const farol = new THREE.Mesh(g.farol, new THREE.MeshStandardMaterial({ color: '#FFF6CC', emissive: '#FFE9A0', emissiveIntensity: 1.2 })); farol.position.set(0, 0.55, 1.06);
  grupo.add(corpo, escuro, vidro, eixoF, eixoT, boneco, mastro, bandeira, farol);
  grupo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  vidro.castShadow = false; frente.castShadow = false; verso.castShadow = false;

  let fase = Math.random() * 6, alegria = 0;
  return {
    grupo, bandeira,
    /** vel em casas/s (sinal = sentido); dt em segundos */
    atualizar(dt, vel = 0) {
      fase += dt;
      const giro = vel * 3.4 * dt * 4;
      eixoF.rotation.x += giro; eixoT.rotation.x += giro;
      const rapido = Math.min(1, Math.abs(vel) / 3);
      corpo.position.y = Math.sin(fase * 18) * 0.012 * rapido;
      boneco.position.y = 0.92 + Math.sin(fase * 18 + 1) * 0.015 * rapido + (alegria > 0 ? Math.abs(Math.sin(alegria * 10)) * 0.18 : 0);
      cabeca.rotation.y = Math.sin(fase * 0.9) * 0.25 * (1 - rapido);
      bandeira.rotation.y = Math.sin(fase * 5) * 0.18 - rapido * 0.5;
      if (alegria > 0) alegria = Math.max(0, alegria - dt);
    },
    comemorar() { alegria = 1.2; },
  };
}
