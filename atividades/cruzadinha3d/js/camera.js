// ============================================================
//  js/camera.js — Câmera em terceira pessoa (orbital, suave, com
//  ajuste de distância para não atravessar obstáculos)
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, suavizar } from './util.js';

export class CameraJogo {
  constructor(aspecto) {
    const C = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(C.fov, aspecto, 0.1, 160);
    this.yaw = 0;                // atrás do personagem (que olha para -Z, rumo à grade)
    this.pitch = C.pitch;
    this.distancia = C.distancia;
    this.distanciaAtual = C.distancia;
    this.alvo = new THREE.Vector3();
    this.posicaoSuave = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.reduzirMovimento = false;
    this._primeiro = true;
    this._tmp = new THREE.Vector3();
  }

  girar(dx, dy) {
    const C = CONFIG.camera;
    this.yaw -= dx;
    this.pitch = clamp(this.pitch + dy, C.pitchMin, C.pitchMax);
  }

  zoom(delta) {
    const C = CONFIG.camera;
    this.distancia = clamp(this.distancia + delta, C.distMin, C.distMax);
  }

  redimensionar(largura, altura) {
    this.camera.aspect = largura / altura;
    this.camera.updateProjectionMatrix();
  }

  /** Direção "frente" no plano XZ (para o movimento relativo à câmera). */
  frente() {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  atualizar(dt, posicaoPersonagem, malhasColisao) {
    const C = CONFIG.camera;
    const alvoDesejado = this._tmp.set(posicaoPersonagem.x, posicaoPersonagem.y + C.alturaAlvo, posicaoPersonagem.z);
    if (this._primeiro) { this.alvo.copy(alvoDesejado); }
    else this.alvo.lerp(alvoDesejado, suavizar(C.suavidade, dt));

    // Posição ideal na esfera ao redor do alvo
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    // Encurta se houver obstáculo entre o alvo e a câmera
    let dist = this.distancia;
    if (malhasColisao && malhasColisao.length) {
      this.raycaster.set(this.alvo, dir);
      this.raycaster.far = this.distancia;
      const hits = this.raycaster.intersectObjects(malhasColisao, true);
      if (hits.length) dist = Math.max(C.distMin * 0.5, hits[0].distance - C.margemColisao);
    }
    // Não deixa a câmera entrar no chão/água
    const yMin = 0.5;
    const yCam = this.alvo.y + dir.y * dist;
    if (yCam < yMin) dist = Math.max(C.distMin * 0.5, (yMin - this.alvo.y) / Math.max(0.05, dir.y));

    this.distanciaAtual = this._primeiro ? dist
      : (dist < this.distanciaAtual ? dist : this.distanciaAtual + (dist - this.distanciaAtual) * suavizar(4, dt));

    const posDesejada = dir.multiplyScalar(this.distanciaAtual).add(this.alvo);
    if (this._primeiro) { this.posicaoSuave.copy(posDesejada); this._primeiro = false; }
    else this.posicaoSuave.lerp(posDesejada, suavizar(this.reduzirMovimento ? 30 : C.suavidade * 1.6, dt));

    this.camera.position.copy(this.posicaoSuave);
    this.camera.lookAt(this.alvo);
  }
}
