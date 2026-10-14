// ============================================================
//  js/particulas.js — Partículas simples instanciadas (poeira do
//  pouso das letras, brilhos, confete). Respeita "reduzir movimento".
// ============================================================
import * as THREE from 'three';

export class Particulas {
  constructor(scene, capacidade = 240, fator = 1) {
    this.fator = fator;             // 0 = desligado
    this.capacidade = capacidade;
    this.itens = [];                // { indice, pos, vel, vida, vidaTotal, tam, giro }
    this.livres = [];
    const geo = new THREE.SphereGeometry(0.09, 6, 5);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.15 });
    this.malha = new THREE.InstancedMesh(geo, mat, capacidade);
    this.malha.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacidade; i++) { this.malha.setMatrixAt(i, zero); this.livres.push(i); }
    this.malha.instanceMatrix.needsUpdate = true;
    scene.add(this.malha);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._cor = new THREE.Color();
  }

  /** Explosão de partículas em (x, y, z). */
  explodir(x, y, z, { cores = ['#E0A537', '#FBF7EF', '#286456'], quantidade = 18, forca = 3, gravidade = 7, vida = 0.9, tamanho = 1 } = {}) {
    const n = Math.round(quantidade * this.fator);
    for (let k = 0; k < n && this.livres.length; k++) {
      const indice = this.livres.pop();
      const ang = Math.random() * Math.PI * 2, el = Math.random() * Math.PI * 0.5;
      const v = forca * (0.5 + Math.random() * 0.8);
      this.itens.push({
        indice,
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(Math.cos(ang) * Math.cos(el) * v, Math.sin(el) * v + forca * 0.4, Math.sin(ang) * Math.cos(el) * v),
        vida, vidaTotal: vida, gravidade, tam: tamanho * (0.6 + Math.random() * 0.8),
        giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(6),
      });
      this._cor.set(cores[Math.floor(Math.random() * cores.length)]);
      this.malha.setColorAt(indice, this._cor);
    }
    if (this.malha.instanceColor) this.malha.instanceColor.needsUpdate = true;
  }

  /** Chuva de confete em uma área. */
  confete(cx, cy, cz, raio = 4, quantidade = 40) {
    const n = Math.round(quantidade * this.fator);
    for (let k = 0; k < n && this.livres.length; k++) {
      const indice = this.livres.pop();
      this.itens.push({
        indice,
        pos: new THREE.Vector3(cx + (Math.random() - 0.5) * raio * 2, cy + Math.random() * 2, cz + (Math.random() - 0.5) * raio * 2),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, -0.5 - Math.random(), (Math.random() - 0.5) * 1.5),
        vida: 3.5, vidaTotal: 3.5, gravidade: 0.8, tam: 1.1 + Math.random() * 0.6, achatado: true,
        giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(5),
      });
      this._cor.setHSL(Math.random(), 0.85, 0.6);
      this.malha.setColorAt(indice, this._cor);
    }
    if (this.malha.instanceColor) this.malha.instanceColor.needsUpdate = true;
  }

  atualizar(dt) {
    if (!this.itens.length) return;
    const zero = this._s.set(0, 0, 0);
    for (let i = this.itens.length - 1; i >= 0; i--) {
      const it = this.itens[i];
      it.vida -= dt;
      if (it.vida <= 0) {
        this._m.makeScale(0, 0, 0);
        this.malha.setMatrixAt(it.indice, this._m);
        this.livres.push(it.indice);
        this.itens.splice(i, 1);
        continue;
      }
      it.vel.y -= it.gravidade * dt;
      if (it.achatado) { it.vel.x += Math.sin(it.vida * 7) * dt * 2; }
      it.pos.addScaledVector(it.vel, dt);
      const f = it.vida / it.vidaTotal;
      const esc = it.tam * (it.achatado ? 1 : Math.min(1, f * 2));
      this._q.setFromEuler(new THREE.Euler(it.giro.x * it.vida, it.giro.y * it.vida, it.giro.z * it.vida));
      this._s.set(esc, it.achatado ? esc * 0.25 : esc, esc);
      this._m.compose(it.pos, this._q, this._s);
      this.malha.setMatrixAt(it.indice, this._m);
    }
    this.malha.instanceMatrix.needsUpdate = true;
    void zero;
  }
}
