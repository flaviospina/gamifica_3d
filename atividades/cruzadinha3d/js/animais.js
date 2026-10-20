// ============================================================
//  js/animais.js — Vida na ilha: pássaros, coelhos, cervo e borboletas.
//  Poucos e discretos. Fogem suavemente do personagem, nunca bloqueiam.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { materialSuave, caixaArredondada, fundirMalhas } from './temas/pecas.js';
import { lerp, lerpAngulo, suavizar } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Animais {
  /**
   * @param ctx { scene, rnd, qualidade, areaLivre(x,z,raio), raioIlha, audio }
   */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.rnd = ctx.rnd;
    this.areaLivre = ctx.areaLivre;
    this.raioIlha = ctx.raioIlha;
    this.audio = ctx.audio;
    this.itens = [];
    const fator = ctx.qualidade.animais ?? 1;
    if (fator <= 0) return;
    this._passaros(Math.round(4 * fator) || 2);
    this._coelhos(fator >= 1 ? 2 : 1);
    if (fator >= 1) this._cervo();
    this._borboletas(Math.round(3 * fator) || 2);
    this._tChilrear = 4 + this.rnd() * 6;
  }

  /** Ponto livre na grama, longe da grade e do início. */
  _pontoLivre(dMin = 4, dMax = this.raioIlha - 3, raio = 1.2) {
    for (let t = 0; t < 40; t++) {
      const a = this.rnd() * Math.PI * 2, d = this.rnd.entre(dMin, dMax);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.areaLivre(x, z, raio)) return V(x, 0, z);
    }
    return V(0, 0, this.raioIlha - 4);
  }

  // ── Pássaros (gaivotas) ────────────────────────────────────
  _passaros(n) {
    const matCorpo = materialSuave('#FFFFFF', { roughness: 0.6 });
    const matAsa = materialSuave('#F2F2F2', { roughness: 0.7, side: THREE.DoubleSide });
    const matBico = materialSuave('#F2B233');
    const geoCorpo = new THREE.SphereGeometry(0.16, 10, 8); geoCorpo.scale(1.6, 0.8, 0.8);
    const geoCabeca = new THREE.SphereGeometry(0.1, 8, 6);
    const geoBico = new THREE.ConeGeometry(0.035, 0.14, 6); geoBico.rotateX(Math.PI / 2);
    const geoAsa = caixaArredondada(0.62, 0.03, 0.22, 0.015, 1); geoAsa.translate(0.31, 0, 0);
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(geoCorpo, matCorpo);
      const cabeca = new THREE.Mesh(geoCabeca, matCorpo); cabeca.position.set(0.22, 0.07, 0);
      const bico = new THREE.Mesh(geoBico, matBico); bico.position.set(0.32, 0.06, 0); bico.rotation.y = -Math.PI / 2;
      const asaE = new THREE.Mesh(geoAsa, matAsa); asaE.position.set(0, 0.03, 0.08); asaE.rotation.y = Math.PI / 2;
      const asaD = new THREE.Mesh(geoAsa, matAsa); asaD.position.set(0, 0.03, -0.08); asaD.rotation.y = -Math.PI / 2;
      g.add(fundirMalhas([corpo, cabeca], matCorpo), bico, asaE, asaD);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(g);
      const centro = V(this.rnd.entre(-6, 6), this.rnd.entre(7, 11), this.rnd.entre(-6, 6));
      this.itens.push({
        tipo: 'passaro', g, asaE, asaD, centro, raio: this.rnd.entre(7, 13), fase: this.rnd() * 6.28,
        vel: this.rnd.entre(0.18, 0.3) * (this.rnd() < 0.5 ? 1 : -1), bater: this.rnd.entre(5, 7), sobe: this.rnd() * 6.28,
      });
    }
  }

  // ── Coelhos ────────────────────────────────────────────────
  _coelhos(n) {
    for (let i = 0; i < n; i++) {
      const cor = i % 2 ? '#D9C7A9' : '#F3EBDD';
      const mat = materialSuave(cor, { roughness: 0.85 });
      const matRosa = materialSuave('#F3B3C0', { roughness: 0.8 });
      const matOlho = materialSuave('#2A2A2A', { roughness: 0.3 });
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat); corpo.scale.set(1.25, 0.9, 1); corpo.position.y = 0.22;
      let cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), mat); cabeca.position.set(0.24, 0.4, 0);
      const geoOrelha = new THREE.CapsuleGeometry(0.035, 0.18, 4, 8);
      const orE = new THREE.Mesh(geoOrelha, mat); orE.position.set(0.2, 0.62, 0.06); orE.rotation.z = -0.15; orE.rotation.x = 0.2;
      const orD = new THREE.Mesh(geoOrelha, mat); orD.position.set(0.2, 0.62, -0.06); orD.rotation.z = -0.15; orD.rotation.x = -0.2;
      const orIE = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.12, 3, 6), matRosa); orIE.position.set(0.215, 0.62, 0.06); orIE.rotation.copy(orE.rotation);
      const orID = orIE.clone(); orID.position.z = -0.06; orID.rotation.copy(orD.rotation);
      const rabo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), materialSuave('#FFFFFF')); rabo.position.set(-0.28, 0.26, 0);
      const olhoE = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), matOlho); olhoE.position.set(0.35, 0.44, 0.08);
      const olhoD = olhoE.clone(); olhoD.position.z = -0.08;
      const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), matRosa); nariz.position.set(0.39, 0.39, 0);
      // Cabeça com orelhas, olhos e nariz num grupo (balança ao mordiscar); corpo e rabo fundidos
      const cab = new THREE.Group();
      cab.add(fundirMalhas([cabeca, orE, orD], mat), fundirMalhas([orIE, orID, nariz], matRosa), fundirMalhas([olhoE, olhoD], matOlho));
      g.add(fundirMalhas([corpo], mat), rabo, cab);
      cabeca = cab; cabeca.position.set(0, 0, 0);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      const pos = this._pontoLivre();
      g.position.copy(pos);
      this.scene.add(g);
      this.itens.push({ tipo: 'coelho', g, cabeca, pos, alvo: pos.clone(), estado: 'parado', t: this.rnd.entre(1, 3), ang: this.rnd() * 6.28, pulo: 0, puloT: 0 });
    }
  }

  // ── Cervo ──────────────────────────────────────────────────
  _cervo() {
    const mat = materialSuave('#B07A4A', { roughness: 0.85 });
    const matClaro = materialSuave('#E8D2B5', { roughness: 0.85 });
    const matChifre = materialSuave('#6B4A2B', { roughness: 0.7 });
    const matOlho = materialSuave('#2A2A2A', { roughness: 0.3 });
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 6, 12), mat); corpo.rotation.z = Math.PI / 2; corpo.position.y = 0.78;
    const barriga = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), matClaro); barriga.scale.set(1.8, 0.7, 0.9); barriga.position.y = 0.66;
    const pescoco = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 5, 10), mat); pescoco.position.set(0.45, 1.05, 0); pescoco.rotation.z = -0.65;
    const cabeca = new THREE.Group(); cabeca.position.set(0.68, 1.32, 0);
    const cr = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), mat); cr.scale.set(1.3, 1, 0.9);
    const focinho = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), matClaro); focinho.position.set(0.17, -0.04, 0);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), matOlho); nariz.position.set(0.24, -0.03, 0);
    const oE = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), matOlho); oE.position.set(0.05, 0.06, 0.12);
    const oD = oE.clone(); oD.position.z = -0.12;
    const geoOr = new THREE.CapsuleGeometry(0.03, 0.12, 3, 6);
    const orE = new THREE.Mesh(geoOr, mat); orE.position.set(-0.05, 0.14, 0.12); orE.rotation.x = 0.8;
    const orD = new THREE.Mesh(geoOr, mat); orD.position.set(-0.05, 0.14, -0.12); orD.rotation.x = -0.8;
    // Chifres (galhada)
    const chifres = [];
    for (const lado of [1, -1]) {
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.32, 6), matChifre); haste.position.set(-0.02, 0.28, lado * 0.07); haste.rotation.z = -0.2; haste.rotation.x = lado * 0.35;
      const ramo = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.18, 6), matChifre); ramo.position.set(0.04, 0.36, lado * 0.11); ramo.rotation.z = -0.9; ramo.rotation.x = lado * 0.5;
      const ramo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.14, 6), matChifre); ramo2.position.set(-0.07, 0.4, lado * 0.1); ramo2.rotation.z = 0.7;
      chifres.push(haste, ramo, ramo2);
    }
    cabeca.add(fundirMalhas([cr, orE, orD], mat), fundirMalhas([focinho], matClaro), fundirMalhas([nariz, oE, oD], matOlho), fundirMalhas(chifres, matChifre));
    const rabo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), matClaro); rabo.position.set(-0.6, 0.86, 0);
    const pernas = [];
    const geoPerna = new THREE.CapsuleGeometry(0.05, 0.42, 4, 8); geoPerna.translate(0, -0.25, 0);
    for (const [x, z] of [[0.32, 0.14], [0.32, -0.14], [-0.32, 0.14], [-0.32, -0.14]]) {
      const p = new THREE.Mesh(geoPerna, mat); p.position.set(x, 0.62, z); g.add(p); pernas.push(p);
    }
    g.add(fundirMalhas([corpo, pescoco], mat), fundirMalhas([barriga, rabo], matClaro), cabeca);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const pos = this._pontoLivre(6, this.raioIlha - 4, 1.8);
    g.position.copy(pos);
    this.scene.add(g);
    this.itens.push({ tipo: 'cervo', g, cabeca, pernas, pos, alvo: pos.clone(), estado: 'pastando', t: this.rnd.entre(2, 5), ang: this.rnd() * 6.28, fase: 0 });
  }

  // ── Borboletas ─────────────────────────────────────────────
  _borboletas(n) {
    const cores = ['#F7B500', '#7AC8FF', '#FF8AB3'];
    const geoAsa = new THREE.CircleGeometry(0.09, 8); geoAsa.scale(1, 1.3, 1); geoAsa.translate(0.08, 0, 0);
    for (let i = 0; i < n; i++) {
      const mat = materialSuave(cores[i % cores.length], { side: THREE.DoubleSide, roughness: 0.6 });
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.1, 3, 6), materialSuave('#333333')); corpo.rotation.x = Math.PI / 2;
      const aE = new THREE.Mesh(geoAsa, mat); aE.rotation.x = -Math.PI / 2;
      const aD = new THREE.Mesh(geoAsa, mat); aD.rotation.x = -Math.PI / 2; aD.rotation.z = Math.PI;
      g.add(corpo, aE, aD);
      const pos = this._pontoLivre(3, this.raioIlha - 2, 0.6); pos.y = 0.9;
      g.position.copy(pos);
      this.scene.add(g);
      this.itens.push({ tipo: 'borboleta', g, aE, aD, centro: pos.clone(), fase: this.rnd() * 6.28, vel: this.rnd.entre(0.6, 1), raio: this.rnd.entre(0.8, 2) });
    }
  }

  /** Destino válido próximo, de preferência longe do personagem. */
  _novoAlvo(item, dist, personagem) {
    for (let t = 0; t < 12; t++) {
      let ang = this.rnd() * Math.PI * 2;
      if (personagem && item.pos.distanceTo(personagem) < 3.5) {
        ang = Math.atan2(item.pos.z - personagem.z, item.pos.x - personagem.x) + this.rnd.entre(-0.6, 0.6);
      }
      const x = item.pos.x + Math.cos(ang) * dist, z = item.pos.z + Math.sin(ang) * dist;
      if (Math.hypot(x, z) < this.raioIlha - 2.5 && this.areaLivre(x, z, 1)) return V(x, 0, z);
    }
    return null;
  }

  atualizar(dt, t, personagem) {
    // Chilreio ocasional
    this._tChilrear -= dt;
    if (this._tChilrear < 0) { this.audio?.passaro(); this._tChilrear = 6 + this.rnd() * 10; }

    for (const it of this.itens) {
      if (it.tipo === 'passaro') {
        it.fase += dt * it.vel;
        const x = it.centro.x + Math.cos(it.fase) * it.raio, z = it.centro.z + Math.sin(it.fase) * it.raio;
        const y = it.centro.y + Math.sin(t * 0.5 + it.sobe) * 0.8;
        const dx = -Math.sin(it.fase) * it.vel, dz = Math.cos(it.fase) * it.vel;
        it.g.position.set(x, y, z);
        it.g.rotation.y = Math.atan2(-dz, dx) + (it.vel < 0 ? Math.PI : 0);
        it.g.rotation.z = (it.vel > 0 ? -0.25 : 0.25);
        const bat = Math.sin(t * it.bater) * 0.6;
        it.asaE.rotation.x = bat; it.asaD.rotation.x = -bat;
      } else if (it.tipo === 'coelho') {
        it.t -= dt;
        const perto = personagem && it.pos.distanceTo(personagem) < 2.2;
        if (it.estado === 'parado') {
          it.cabeca.position.y = -Math.abs(Math.sin(t * 4)) * 0.04; // mordiscando
          if (it.t < 0 || perto) {
            const alvo = this._novoAlvo(it, this.rnd.entre(1.5, 3.5), personagem);
            if (alvo) { it.alvo = alvo; it.estado = 'pulando'; it.ang = Math.atan2(alvo.z - it.pos.z, alvo.x - it.pos.x); it.puloT = 0; }
            else it.t = 1;
          }
        } else {
          const vel = perto ? 3.2 : 2.2;
          const dir = V(it.alvo.x - it.pos.x, 0, it.alvo.z - it.pos.z);
          const dist = dir.length();
          if (dist < 0.1) { it.estado = 'parado'; it.t = this.rnd.entre(1.5, 4); it.g.position.y = 0; it.g.scale.set(1, 1, 1); }
          else {
            dir.normalize();
            it.pos.addScaledVector(dir, Math.min(dist, vel * dt));
            it.puloT += dt * 6;
            const h = Math.abs(Math.sin(it.puloT)) * 0.28;
            it.g.position.set(it.pos.x, h, it.pos.z);
            const esticar = 1 + Math.cos(it.puloT * 2) * 0.08;
            it.g.scale.set(1 / esticar, esticar, 1);
          }
        }
        it.g.rotation.y = lerpAngulo(it.g.rotation.y, -it.ang, suavizar(8, dt));
        if (it.estado === 'parado') it.g.position.set(it.pos.x, 0, it.pos.z);
      } else if (it.tipo === 'cervo') {
        it.t -= dt;
        const perto = personagem && it.pos.distanceTo(personagem) < 3;
        if (it.estado === 'pastando') {
          it.cabeca.position.y = lerp(it.cabeca.position.y, 0.75 + Math.sin(t * 1.3) * 0.03, suavizar(2, dt));
          it.cabeca.position.x = lerp(it.cabeca.position.x, 0.95, suavizar(2, dt));
          if (it.t < 0 || perto) {
            const alvo = this._novoAlvo(it, this.rnd.entre(3, 6), personagem);
            if (alvo) { it.alvo = alvo; it.estado = 'andando'; }
            it.t = this.rnd.entre(4, 8);
          }
        } else {
          it.cabeca.position.y = lerp(it.cabeca.position.y, 1.32, suavizar(3, dt));
          it.cabeca.position.x = lerp(it.cabeca.position.x, 0.68, suavizar(3, dt));
          const dir = V(it.alvo.x - it.pos.x, 0, it.alvo.z - it.pos.z);
          const dist = dir.length();
          if (dist < 0.15) { it.estado = 'pastando'; it.t = this.rnd.entre(4, 9); }
          else {
            dir.normalize();
            const vel = perto ? 2.6 : 1.1;
            it.pos.addScaledVector(dir, Math.min(dist, vel * dt));
            it.ang = Math.atan2(dir.z, dir.x);
            it.fase += dt * (perto ? 11 : 6);
            it.pernas.forEach((p, k) => { p.rotation.z = Math.sin(it.fase + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.45; });
          }
        }
        it.g.position.set(it.pos.x, 0, it.pos.z);
        it.g.rotation.y = lerpAngulo(it.g.rotation.y, -it.ang, suavizar(4, dt));
      } else if (it.tipo === 'borboleta') {
        it.fase += dt * it.vel;
        const x = it.centro.x + Math.cos(it.fase * 1.3) * it.raio, z = it.centro.z + Math.sin(it.fase) * it.raio;
        const y = it.centro.y + Math.sin(it.fase * 2.1) * 0.3;
        it.g.position.set(x, y, z);
        it.g.rotation.y = -it.fase * 1.3 + Math.PI / 2;
        const bat = Math.abs(Math.sin(t * 14 + it.fase)) * 1.1;
        it.aE.rotation.y = bat; it.aD.rotation.y = -bat;
      }
    }
  }
}
