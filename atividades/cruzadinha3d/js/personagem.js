// ============================================================
//  js/personagem.js — Personagem low-poly feito de primitivas,
//  movimento, pulo, animações por código e visual personalizável.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, lerp, lerpAngulo, suavizar } from './util.js';
import { materialSuave, caixaArredondada, fundirMalhas } from './temas/pecas.js';

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

  // ── Modelo: proporções de animação (cabeça grande, olhos expressivos,
  //    formas arredondadas e sombreamento suave) ───────────────────────
  _montar() {
    const v = this.visual;
    this.mat = {
      roupa:  materialSuave(v.roupa, { roughness: 0.7 }),
      pele:   materialSuave(v.pele, { roughness: 0.55 }),
      cabelo: materialSuave(v.cabelo, { roughness: 0.6 }),
      escuro: materialSuave('#2A2A2A', { roughness: 0.5 }),
      calca:  materialSuave('#2E3A5C', { roughness: 0.8 }),
      branco: materialSuave('#FFFFFF', { roughness: 0.25 }),
      iris:   materialSuave('#3B2A1A', { roughness: 0.2 }),
      brilho: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
      bochecha: new THREE.MeshStandardMaterial({ color: '#FF8FA3', roughness: 0.9, transparent: true, opacity: 0.45 }),
    };
    const M = this.mat;

    this.raiz = new THREE.Group();
    this.corpo = new THREE.Group();          // recebe squash & stretch
    this.raiz.add(this.corpo);

    // Tronco (cápsula levemente em forma de pera)
    const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.3, 8, 20), M.roupa);
    tronco.position.y = 0.78; tronco.scale.set(1.05, 1, 0.92);
    // Golinha
    const gola = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 20), M.branco);
    gola.position.y = 1.05; gola.rotation.x = Math.PI / 2;

    // Cabeça grande e redonda
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), M.pele);
    cabeca.position.y = 1.4; cabeca.scale.set(1, 1.04, 0.96);
    // Orelhas
    const geoOrelha = new THREE.SphereGeometry(0.07, 12, 10);
    const orelhaE = new THREE.Mesh(geoOrelha, M.pele); orelhaE.position.set(-0.35, 1.4, 0);
    const orelhaD = new THREE.Mesh(geoOrelha, M.pele); orelhaD.position.set(0.35, 1.4, 0);
    // Cabelo: calota com volume + franja
    const cabelo = new THREE.Mesh(new THREE.SphereGeometry(0.385, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.4), M.cabelo);
    cabelo.position.y = 1.44;
    const franja = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M.cabelo);
    franja.position.set(0.1, 1.7, 0.2); franja.scale.set(1.1, 0.5, 0.8);
    const franja2 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M.cabelo);
    franja2.position.set(-0.15, 1.69, 0.19); franja2.scale.set(1.0, 0.5, 0.8);
    // Olhos: esclera + íris + brilho
    const olhos = new THREE.Group();
    const partes = { branco: [], iris: [], brilho: [], boch: [], sobr: [] };
    for (const sx of [-1, 1]) {
      const branco = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), M.branco);
      branco.position.set(sx * 0.13, 1.42, 0.3); branco.scale.set(1, 1.15, 0.6);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 12), M.iris);
      iris.position.set(sx * 0.13, 1.42, 0.345); iris.scale.set(1, 1.1, 0.5);
      const brilho = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), M.brilho);
      brilho.position.set(sx * 0.13 + 0.018, 1.445, 0.368);
      // Sobrancelha
      const sobr = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), M.cabelo);
      sobr.position.set(sx * 0.13, 1.54, 0.31); sobr.rotation.z = Math.PI / 2 + sx * 0.18;
      // Bochecha corada
      const boch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.bochecha);
      boch.position.set(sx * 0.2, 1.33, 0.28); boch.scale.set(1.2, 0.8, 0.4);
      partes.branco.push(branco); partes.iris.push(iris); partes.brilho.push(brilho); partes.boch.push(boch); partes.sobr.push(sobr);
    }
    olhos.add(fundirMalhas(partes.branco, M.branco), fundirMalhas(partes.iris, M.iris), fundirMalhas(partes.brilho, M.brilho));
    // Nariz e sorriso
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.pele);
    nariz.position.set(0, 1.36, 0.36);
    const sorriso = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 14, Math.PI), M.escuro);
    sorriso.position.set(0, 1.29, 0.335); sorriso.rotation.z = Math.PI; sorriso.rotation.x = -0.3;

    // Braços (pivô no ombro) com mãos
    const geoBraco = new THREE.CapsuleGeometry(0.08, 0.28, 6, 14);
    geoBraco.translate(0, -0.2, 0);
    this.bracoE = new THREE.Group(); this.bracoE.position.set(-0.33, 1.0, 0);
    this.bracoD = new THREE.Group(); this.bracoD.position.set(0.33, 1.0, 0);
    this.bracoE.add(new THREE.Mesh(geoBraco, M.roupa));
    this.bracoD.add(new THREE.Mesh(geoBraco, M.roupa));
    const geoMao = new THREE.SphereGeometry(0.095, 14, 12);
    const maoE = new THREE.Mesh(geoMao, M.pele); maoE.position.y = -0.43;
    const maoD = new THREE.Mesh(geoMao, M.pele); maoD.position.y = -0.43;
    this.bracoE.add(maoE); this.bracoD.add(maoD);

    // Pernas (pivô no quadril) com sapatos arredondados
    const geoPerna = new THREE.CapsuleGeometry(0.105, 0.24, 6, 14);
    geoPerna.translate(0, -0.18, 0);
    this.pernaE = new THREE.Group(); this.pernaE.position.set(-0.14, 0.5, 0);
    this.pernaD = new THREE.Group(); this.pernaD.position.set(0.14, 0.5, 0);
    this.pernaE.add(new THREE.Mesh(geoPerna, M.calca));
    this.pernaD.add(new THREE.Mesh(geoPerna, M.calca));
    const geoPe = new THREE.SphereGeometry(0.12, 14, 10);
    const peE = new THREE.Mesh(geoPe, M.escuro); peE.position.set(0, -0.42, 0.05); peE.scale.set(1, 0.65, 1.35);
    const peD = new THREE.Mesh(geoPe, M.escuro); peD.position.set(0, -0.42, 0.05); peD.scale.set(1, 0.65, 1.35);
    this.pernaE.add(peE); this.pernaD.add(peD);

    // Partes estáticas fundidas por material (menos draw calls)
    const cabecaFundida = fundirMalhas([cabeca, orelhaE, orelhaD, nariz], M.pele);
    const cabeloFundido = fundirMalhas([cabelo, franja, franja2, ...partes.sobr], M.cabelo);
    const bochechas = fundirMalhas(partes.boch, M.bochecha);
    this.corpo.add(tronco, gola, cabecaFundida, cabeloFundido, olhos, bochechas, sorriso,
      this.bracoE, this.bracoD, this.pernaE, this.pernaD);
    this.cabeca = new THREE.Group(); // pivô lógico (as partes já estão na posição final)
    this.olhos = olhos;
    this._tPiscar = 2 + Math.random() * 3;

    // Acessório
    this.acessorio = new THREE.Group();
    this.corpo.add(this.acessorio);
    this._montarAcessorio(v.acessorio);

    // Sombra "blob" (funciona em qualquer qualidade e ajuda a ler o pulo)
    this.sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.2, depthWrite: false })
    );
    this.sombra.rotation.x = -Math.PI / 2;
    this.scene.add(this.sombra);

    this.raiz.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  _montarAcessorio(tipo) {
    this.acessorio.clear();
    const M = this.mat;
    if (tipo === 'chapeu') {
      const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 28), M.cabelo);
      aba.position.y = 1.64;
      const copa = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.cabelo);
      copa.position.y = 1.66; copa.scale.set(1, 0.9, 1);
      const fita = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.31, 0.08, 28), M.roupa);
      fita.position.y = 1.7;
      this.acessorio.add(aba, copa, fita);
    } else if (tipo === 'oculos') {
      const geoAro = new THREE.TorusGeometry(0.095, 0.014, 8, 24);
      const aroE = new THREE.Mesh(geoAro, M.escuro); aroE.position.set(-0.13, 1.42, 0.34);
      const aroD = new THREE.Mesh(geoAro, M.escuro); aroD.position.set(0.13, 1.42, 0.34);
      const ponte = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 8), M.escuro);
      ponte.position.set(0, 1.42, 0.34); ponte.rotation.z = Math.PI / 2;
      this.acessorio.add(aroE, aroD, ponte);
    } else if (tipo === 'mochila') {
      const corpo = new THREE.Mesh(caixaArredondada(0.36, 0.42, 0.2, 0.08), M.roupa);
      corpo.position.set(0, 0.85, -0.3);
      const bolso = new THREE.Mesh(caixaArredondada(0.24, 0.18, 0.1, 0.05), M.calca);
      bolso.position.set(0, 0.74, -0.42);
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
      const antes = Math.floor(this.faseAndar / Math.PI);
      this.faseAndar += dt * 9 * (0.5 + mag * 0.5);
      if (Math.floor(this.faseAndar / Math.PI) !== antes && this.noChao) this._emitir('passo');
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
    // Piscar de vez em quando
    this._tPiscar -= dt;
    const piscando = this._tPiscar < 0.12;
    this.olhos.scale.y = piscando ? 0.12 : 1;
    if (this._tPiscar < 0) this._tPiscar = 2.5 + Math.random() * 3.5;
  }
}
