// ============================================================
//  js/celebracao.js — Cena final: a grade se ergue e vira um
//  monumento com o nome do aluno, câmera gira, confete.
// ============================================================
import * as THREE from 'three';
import { materialSuave, materialBrilho } from './temas/pecas.js';

function texturaPlaca(nome, titulo) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 384;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#161F38'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = '#E0A537'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.roundRect(28, 28, cv.width - 56, cv.height - 56, 40); ctx.stroke();
  ctx.fillStyle = '#FBF7EF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 54px Inter, system-ui, sans-serif';
  ctx.fillText('Ilha das Palavras · ' + titulo, cv.width / 2, 110);
  ctx.fillStyle = '#E0A537';
  ctx.font = '700 150px Fraunces, Georgia, serif';
  let nomeTxt = nome;
  while (ctx.measureText(nomeTxt).width > cv.width - 120 && nomeTxt.length > 3) nomeTxt = nomeTxt.slice(0, -1);
  ctx.fillText(nomeTxt, cv.width / 2, 245);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Celebracao {
  constructor({ scene, mundo, blocos, personagem, cameraJogo, particulas, nome, titulo, reduzirMovimento }) {
    Object.assign(this, { scene, mundo, blocos, personagem, cameraJogo, particulas, nome, titulo, reduzirMovimento });
    this.ativa = false;
    this.t = 0;
    this.elevacaoFinal = 1.4;
    this.aoTerminar = null;
    this._terminou = false;
  }

  iniciar(aoTerminar) {
    this.ativa = true;
    this.t = 0;
    this.aoTerminar = aoTerminar;
    const g = this.mundo.grade;
    const lim = g.limites;
    const cx = (lim.minX + lim.maxX) / 2, cz = (lim.minZ + lim.maxZ) / 2;
    const largura = lim.maxX - lim.minX, profundidade = lim.maxZ - lim.minZ;
    this.centro = new THREE.Vector3(cx, 0, cz);

    // Pedestal que sobe do chão
    const raio = Math.max(largura, profundidade) / 2 + 0.6;
    this.raioPedestal = raio;
    const pedestal = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio + 0.5, this.elevacaoFinal, 48), materialSuave('#E9DFC6', { roughness: 0.7 }));
    corpo.position.y = this.elevacaoFinal / 2;
    const faixa = new THREE.Mesh(new THREE.TorusGeometry(raio + 0.1, 0.12, 10, 48), materialBrilho('#E0A537', { metalness: 0.4 }));
    faixa.rotation.x = Math.PI / 2; faixa.position.y = this.elevacaoFinal - 0.15;
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6, raio * 1.6), Math.min(6, raio * 1.6) * 0.375), new THREE.MeshStandardMaterial({ map: texturaPlaca(this.nome, this.titulo), roughness: 0.5 }));
    placa.position.set(0, this.elevacaoFinal * 0.5, raio + 0.52);
    const placa2 = placa.clone(); placa2.position.set(0, this.elevacaoFinal * 0.5, -raio - 0.52); placa2.rotation.y = Math.PI;
    pedestal.add(corpo, faixa, placa, placa2);
    pedestal.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    pedestal.position.set(cx, -this.elevacaoFinal - 0.3, cz);
    this.scene.add(pedestal);
    this.pedestal = pedestal;

    // Câmera em órbita
    this.cameraJogo.orbita = { centro: new THREE.Vector3(cx, this.elevacaoFinal + 1, cz), distancia: raio * 1.9 + 5, pitch: 0.5 };
    this.personagem.comemorar(true);
    // Totens sobem junto
    this._totemY0 = this.mundo.totens.map(t => t.grupo.position.y);
    this._proximoConfete = 0;
  }

  atualizar(dt) {
    if (!this.ativa) return;
    this.t += dt;
    const f = Math.min(1, this.t / 2.4);
    const e = 1 - Math.pow(1 - f, 3);
    const y = this.elevacaoFinal * e;
    this.mundo.grade.malha.position.y = y;
    this.blocos.elevacao = y;
    this.blocos.reposicionar();
    this.pedestal.position.y = -this.elevacaoFinal - 0.3 + (this.elevacaoFinal + 0.3) * e;
    this.mundo.totens.forEach((t, i) => { t.grupo.position.y = this._totemY0[i] + y; });
    // O personagem sobe junto se estiver sobre a grade
    const p = this.personagem.posicao, lim = this.mundo.grade.limites;
    if (p.x > lim.minX && p.x < lim.maxX && p.z > lim.minZ && p.z < lim.maxZ) {
      this.personagem.posicao.y = Math.max(this.personagem.posicao.y, 0.35 + y);
    }
    if (!this.reduzirMovimento && this.t > this._proximoConfete && this.t < 7) {
      this._proximoConfete = this.t + 0.35;
      this.particulas.confete(this.centro.x, this.elevacaoFinal + 5, this.centro.z, 5, 30);
    }
    if (this.t >= 6.5 && !this._terminou) { this._terminou = true; this.aoTerminar?.(); }
  }

  /** Mantém a elevação (depois do resultado o aluno pode continuar explorando). */
  encerrar() {
    this.ativa = false;
    this.cameraJogo.orbita = null;
    this.personagem.comemorar(false);
    // Plataformas da grade passam a ficar no topo do monumento; o pedestal vira chão
    for (const pl of this.mundo.colisao.plataformas) pl.topo += this.elevacaoFinal;
    const r = this.raioPedestal;
    this.mundo.colisao.adicionarPlataforma({ minX: this.centro.x - r, maxX: this.centro.x + r, minZ: this.centro.z - r, maxZ: this.centro.z + r, topo: this.elevacaoFinal, base: 0 });
    this.mundo.colisao.malhasCamera.push(this.pedestal);
  }
}
