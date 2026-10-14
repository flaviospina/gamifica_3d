// ============================================================
//  js/personagem.js — Personagem low-poly feito de primitivas,
//  movimento, pulo, animações por código e visual personalizável.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, lerp, lerpAngulo, suavizar } from './util.js';
import { materialChapado } from './temas/pecas.js';

/** Opções de personalização (fase 4 mostra a tela; aqui já funciona). */
export const OPCOES_AVATAR = {
  roupa:     ['#E0A537', '#286456', '#3B7DD8', '#D8553B', '#8E5BD8', '#2BB5A0'],
  cabelo:    ['#2B1A0E', '#6B3E1E', '#C98A3C', '#E8D27A', '#8A8A8A', '#D84B8E'],
  pele:      ['#F6D3B5', '#E8B894', '#C68E63', '#8D5A3B', '#5C3A25'],
  acessorio: ['nenhum', 'chapeu', 'oculos', 'mochila'],
};

export const AVATAR_PADRAO = { roupa: '#E0A537', cabelo: '#2B1A0E', pele: '#E8B894', acessorio: 'nenhum' };

export class Personagem {
  constructor(scene, visual = {}) {
    this.scene = scene;
    this.visual = { ...AVATAR_PADRAO, ...visual };
    this.posicao = new THREE.Vector3();
    this.velocidade = new THREE.Vector3();
    this.angulo = 0;            // rotação Y (direção que olha)
    this.noChao = false;
    this.tempoNoAr = 0;
    this.tempoAgua = 0;
    this.estado = 'parado';     // parado | andando | pulando | comemorando | agua
    this.ultimoSeguro = new THREE.Vector3();
    this._tSeguro = 0;
    this.relogio = 0;
    this.faseAndar = 0;
    this.squash = 0;            // -1 esmagado … +1 esticado
    this.eventos = {};          // nome → [callbacks]

    this._montar();
    scene.add(this.raiz);
  }

  on(nome, fn) { (this.eventos[nome] ||= []).push(fn); }
  _emitir(nome, dados) { for (const fn of this.eventos[nome] || []) fn(dados); }

  // ── Modelo ─────────────────────────────────────────────────
  _montar() {
    const v = this.visual;
    this.mat = {
      roupa: materialChapado(v.roupa),
      pele: materialChapado(v.pele),
      cabelo: materialChapado(v.cabelo),
      escuro: materialChapado('#2A2A2A'),
      calca: materialChapado('#2E3A5C'),
    };
    const M = this.mat;

    this.raiz = new THREE.Group();
    this.corpo = new THREE.Group();          // recebe squash & stretch
    this.raiz.add(this.corpo);

    // Tronco
    const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.32, 3, 8), M.roupa);
    tronco.position.y = 0.78;
    // Cabeça
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), M.pele);
    cabeca.position.y = 1.3;
    // Cabelo: calota
    const cabelo = new THREE.Mesh(new THREE.SphereGeometry(0.285, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), M.cabelo);
    cabelo.position.y = 1.33;
    // Olhos
    const geoOlho = new THREE.SphereGeometry(0.045, 6, 5);
    const olhoE = new THREE.Mesh(geoOlho, M.escuro); olhoE.position.set(-0.1, 1.33, 0.23);
    const olhoD = new THREE.Mesh(geoOlho, M.escuro); olhoD.position.set(0.1, 1.33, 0.23);
    // Sorriso (torus fino)
    const sorriso = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 5, 10, Math.PI), M.escuro);
    sorriso.position.set(0, 1.22, 0.24); sorriso.rotation.z = Math.PI;

    // Braços (pivô no ombro)
    const geoBraco = new THREE.CapsuleGeometry(0.075, 0.3, 3, 6);
    geoBraco.translate(0, -0.2, 0);
    this.bracoE = new THREE.Group(); this.bracoE.position.set(-0.34, 1.0, 0);
    this.bracoD = new THREE.Group(); this.bracoD.position.set(0.34, 1.0, 0);
    this.bracoE.add(new THREE.Mesh(geoBraco, M.roupa));
    this.bracoD.add(new THREE.Mesh(geoBraco, M.roupa));
    const geoMao = new THREE.SphereGeometry(0.08, 6, 5);
    const maoE = new THREE.Mesh(geoMao, M.pele); maoE.position.y = -0.42;
    const maoD = new THREE.Mesh(geoMao, M.pele); maoD.position.y = -0.42;
    this.bracoE.add(maoE); this.bracoD.add(maoD);

    // Pernas (pivô no quadril)
    const geoPerna = new THREE.CapsuleGeometry(0.1, 0.28, 3, 6);
    geoPerna.translate(0, -0.2, 0);
    this.pernaE = new THREE.Group(); this.pernaE.position.set(-0.14, 0.52, 0);
    this.pernaD = new THREE.Group(); this.pernaD.position.set(0.14, 0.52, 0);
    this.pernaE.add(new THREE.Mesh(geoPerna, M.calca));
    this.pernaD.add(new THREE.Mesh(geoPerna, M.calca));
    const geoPe = new THREE.BoxGeometry(0.18, 0.1, 0.26);
    const peE = new THREE.Mesh(geoPe, M.escuro); peE.position.set(0, -0.47, 0.04);
    const peD = new THREE.Mesh(geoPe, M.escuro); peD.position.set(0, -0.47, 0.04);
    this.pernaE.add(peE); this.pernaD.add(peD);

    this.corpo.add(tronco, cabeca, cabelo, olhoE, olhoD, sorriso, this.bracoE, this.bracoD, this.pernaE, this.pernaD);
    this.cabeca = cabeca;

    // Acessório
    this.acessorio = new THREE.Group();
    this.corpo.add(this.acessorio);
    this._montarAcessorio(v.acessorio);

    // Sombra "blob" (funciona em qualquer qualidade e ajuda a ler o pulo)
    this.sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 14),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.sombra.rotation.x = -Math.PI / 2;
    this.scene.add(this.sombra);

    this.raiz.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  _montarAcessorio(tipo) {
    this.acessorio.clear();
    const M = this.mat;
    if (tipo === 'chapeu') {
      const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), M.cabelo);
      aba.position.y = 1.5;
      const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.26, 10), M.cabelo);
      copa.position.y = 1.64;
      const fita = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.27, 0.07, 10), M.roupa);
      fita.position.y = 1.55;
      this.acessorio.add(aba, copa, fita);
    } else if (tipo === 'oculos') {
      const geoAro = new THREE.TorusGeometry(0.075, 0.014, 5, 12);
      const aroE = new THREE.Mesh(geoAro, M.escuro); aroE.position.set(-0.1, 1.33, 0.25);
      const aroD = new THREE.Mesh(geoAro, M.escuro); aroD.position.set(0.1, 1.33, 0.25);
      const ponte = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.014), M.escuro); ponte.position.set(0, 1.33, 0.25);
      this.acessorio.add(aroE, aroD, ponte);
    } else if (tipo === 'mochila') {
      const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.18), M.roupa);
      corpo.position.set(0, 0.85, -0.3);
      const bolso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.08), M.calca);
      bolso.position.set(0, 0.75, -0.42);
      this.acessorio.add(corpo, bolso);
    }
    this.acessorio.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  /** Aplica cores/acessório (usado pela tela de personalização). */
  aplicarVisual(visual) {
    this.visual = { ...this.visual, ...visual };
    this.mat.roupa.color.set(this.visual.roupa);
    this.mat.pele.color.set(this.visual.pele);
    this.mat.cabelo.color.set(this.visual.cabelo);
    this._montarAcessorio(this.visual.acessorio);
  }

  // ── Posição ────────────────────────────────────────────────
  colocarEm(vetor, angulo = Math.PI) {
    this.posicao.copy(vetor);
    this.velocidade.set(0, 0, 0);
    this.angulo = angulo;
    this.ultimoSeguro.copy(vetor);
    this.noChao = true;
    this.estado = 'parado';
    this.tempoAgua = 0;
    this.raiz.position.copy(vetor);
    this.raiz.rotation.y = angulo;
  }

  comemorar(ligado = true) { this.estado = ligado ? 'comemorando' : 'parado'; }

  // ── Física + animação ──────────────────────────────────────
  /**
   * @param dt        segundos
   * @param entrada   { eixo: {x, y}, pular: bool }  (eixo já relativo à câmera: x = direita, y = frente)
   * @param colisao   js/colisao.js
   * @param bloqueado quando true (painel aberto), não se move
   */
  atualizar(dt, entrada, colisao, bloqueado = false) {
    const P = CONFIG.personagem;
    this.relogio += dt;
    const pos = this.posicao;

    if (this.estado === 'agua') {
      this.tempoAgua += dt;
      pos.y = lerp(pos.y, CONFIG.mundo.nivelAgua - 0.6, suavizar(4, dt));
      if (this.tempoAgua >= CONFIG.agua.tempoAteVoltar) {
        this.colocarEm(this.ultimoSeguro, this.angulo);
        this._emitir('voltou');
      }
      this._animar(dt, 0);
      return;
    }

    // Direção desejada
    let ex = bloqueado ? 0 : entrada.eixo.x, ey = bloqueado ? 0 : entrada.eixo.y;
    const mag = Math.min(1, Math.hypot(ex, ey));
    const alvoVx = ex * P.velocidade, alvoVz = -ey * P.velocidade;
    const a = suavizar(P.aceleracao, dt);
    this.velocidade.x = lerp(this.velocidade.x, alvoVx, a);
    this.velocidade.z = lerp(this.velocidade.z, alvoVz, a);

    // Rotação para onde anda
    if (mag > 0.05) {
      const alvo = Math.atan2(this.velocidade.x, this.velocidade.z);
      this.angulo = lerpAngulo(this.angulo, alvo, suavizar(P.giro, dt));
    }

    // Pulo (com coyote time)
    this.tempoNoAr = this.noChao ? 0 : this.tempoNoAr + dt;
    if (!bloqueado && entrada.pular && (this.noChao || this.tempoNoAr < P.coyote) && this.velocidade.y <= 0.01) {
      this.velocidade.y = P.pulo;
      this.noChao = false;
      this.tempoNoAr = P.coyote;
      this.squash = 1;
      this._emitir('pulo');
    }

    // Gravidade
    this.velocidade.y -= P.gravidade * dt;

    // Movimento horizontal com colisão
    const novo = colisao.moverHorizontal(pos, this.velocidade.x * dt, this.velocidade.z * dt, P.raio, P.altura);
    pos.x = novo.x; pos.z = novo.z;

    // Vertical + superfície
    pos.y += this.velocidade.y * dt;
    const sup = colisao.superficie(pos.x, pos.z, this.noChao ? pos.y : pos.y);
    if (this.velocidade.y <= 0 && pos.y <= sup.altura + 0.001) {
      if (!this.noChao) { this.squash = -1; this._emitir('pouso', { velocidade: -this.velocidade.y }); }
      pos.y = sup.altura;
      this.velocidade.y = 0;
      this.noChao = true;
    } else if (this.noChao && pos.y > sup.altura + 0.02) {
      // Saiu de uma borda sem pular
      this.noChao = false;
    }
    // Degrau: no chão e a superfície subiu (entrou num bloco)
    if (this.noChao && sup.altura > pos.y) pos.y = lerp(pos.y, sup.altura, suavizar(22, dt));

    // Água
    if (sup.agua && pos.y <= CONFIG.mundo.nivelAgua + 0.05) {
      this.estado = 'agua';
      this.tempoAgua = 0;
      this.velocidade.set(0, 0, 0);
      this._emitir('agua');
      return;
    }

    // Ponto seguro (no chão, longe da água)
    this._tSeguro += dt;
    if (this.noChao && !sup.agua && this._tSeguro > 0.4 && Math.hypot(pos.x, pos.z) < CONFIG.mundo.raioAreia - 1.2) {
      this.ultimoSeguro.copy(pos);
      this._tSeguro = 0;
    }

    // Estado
    if (this.estado !== 'comemorando') {
      this.estado = !this.noChao ? 'pulando' : mag > 0.05 ? 'andando' : 'parado';
    }

    this.raiz.position.copy(pos);
    this.raiz.rotation.y = this.angulo;
    this.sombra.position.set(pos.x, sup.altura + 0.012, pos.z);
    const alt = clamp(pos.y - sup.altura, 0, 3);
    this.sombra.scale.setScalar(1 - alt * 0.18);
    this.sombra.material.opacity = 0.22 * (1 - alt * 0.2);

    this._animar(dt, mag);
  }

  _animar(dt, mag) {
    const t = this.relogio;
    const E = this.estado;
    // Squash & stretch decai para zero
    this.squash = lerp(this.squash, 0, suavizar(9, dt));
    let sy = 1 + this.squash * 0.18, sxz = 1 - this.squash * 0.12;

    let swing = 0, bracoAlvo = 0, bracoLateral = 0, bob = 0, inclinar = 0;
    if (E === 'andando') {
      this.faseAndar += dt * 9 * (0.5 + mag * 0.5);
      swing = Math.sin(this.faseAndar) * 0.75 * mag;
      bob = Math.abs(Math.sin(this.faseAndar)) * 0.05 * mag;
      inclinar = 0.08 * mag;
    } else if (E === 'pulando') {
      swing = 0;
      bracoAlvo = -2.4; // braços para cima
      this.pernaE.rotation.x = lerp(this.pernaE.rotation.x, 0.5, suavizar(10, dt));
      this.pernaD.rotation.x = lerp(this.pernaD.rotation.x, -0.3, suavizar(10, dt));
    } else if (E === 'comemorando') {
      bracoAlvo = -2.6 + Math.sin(t * 10) * 0.3;
      bracoLateral = 0.5;
      bob = Math.abs(Math.sin(t * 7)) * 0.12;
      this.raiz.rotation.y = this.angulo + t * 2.5;
    } else if (E === 'agua') {
      bracoAlvo = -2.2 + Math.sin(t * 8) * 0.4;
    } else {
      // Parado: respiração leve
      sy *= 1 + Math.sin(t * 2.2) * 0.012;
      bracoAlvo = Math.sin(t * 2.2) * 0.04;
    }

    if (E === 'andando' || E === 'parado') {
      this.pernaE.rotation.x = lerp(this.pernaE.rotation.x, swing, suavizar(14, dt));
      this.pernaD.rotation.x = lerp(this.pernaD.rotation.x, -swing, suavizar(14, dt));
      this.bracoE.rotation.x = lerp(this.bracoE.rotation.x, -swing * 0.9 + bracoAlvo, suavizar(14, dt));
      this.bracoD.rotation.x = lerp(this.bracoD.rotation.x, swing * 0.9 + bracoAlvo, suavizar(14, dt));
    } else {
      this.bracoE.rotation.x = lerp(this.bracoE.rotation.x, bracoAlvo, suavizar(10, dt));
      this.bracoD.rotation.x = lerp(this.bracoD.rotation.x, bracoAlvo, suavizar(10, dt));
    }
    this.bracoE.rotation.z = lerp(this.bracoE.rotation.z, 0.12 + bracoLateral, suavizar(10, dt));
    this.bracoD.rotation.z = lerp(this.bracoD.rotation.z, -0.12 - bracoLateral, suavizar(10, dt));

    this.corpo.scale.set(sxz, sy, sxz);
    this.corpo.position.y = bob;
    this.corpo.rotation.x = lerp(this.corpo.rotation.x, inclinar, suavizar(8, dt));
    this.cabeca.rotation.y = Math.sin(t * 0.8) * 0.12;
  }
}
