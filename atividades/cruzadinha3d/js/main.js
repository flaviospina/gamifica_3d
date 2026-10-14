// ============================================================
//  js/main.js — Orquestra o jogo "Ilha das Palavras"
//  Fase 2: mundo, personagem, câmera, controles, colisão, HUD mínimo.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { carregamento } from './carregamento.js';
import { detectarQualidade, parametrosQualidade, salvarQualidade } from './qualidade.js';
import { obterTema } from './temas/index.js';
import { Mundo } from './mundo.js';
import { Personagem } from './personagem.js';
import { CameraJogo } from './camera.js';
import { Controles } from './controles.js';
import { montarLayout } from './cruzadinha.js';
import { ehToque, prefs } from './util.js';

const $ = (id) => document.getElementById(id);

/** Dados injetados pela página (index.php). Em demo vêm do data/*.js. */
async function obterDados() {
  const el = $('dadosJogo');
  const dados = el ? JSON.parse(el.textContent) : {};
  if (!dados.cruzadinha) {
    const mod = await import('../data/exemplo_ciencias.js');
    dados.cruzadinha = mod.default;
  }
  dados.jogador ||= { nome: 'Visitante' };
  return dados;
}

const MENSAGENS_AGUA = [
  'Opa, um mergulho! De volta ao caminho seguro.',
  'Água fresquinha! Vamos continuar a explorar.',
  'Escorregou? Sem problema, nada se perde por aqui.',
];

class Jogo {
  constructor(dados, nivelQualidade) {
    this.dados = dados;
    this.nivelQualidade = nivelQualidade;
    this.qualidade = parametrosQualidade(nivelQualidade);
    this.pausado = false;
    this.ultimo = performance.now();
    this.fps = { quadros: 0, tempo: 0, valor: 0 };
    this.totemAtivo = null;
    this.reduzirMovimento = prefs.ler('reduzirMovimento', matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  async iniciar() {
    carregamento.progresso(45, 'Preparando a ilha…');
    const canvas = $('cena');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.qualidade.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.qualidade.pixelRatioMax));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    if (this.qualidade.sombras > 0) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.scene = new THREE.Scene();

    const tema = obterTema(this.dados.cruzadinha.tema || this.dados.cruzadinha.disciplina);
    this.layout = montarLayout(this.dados.cruzadinha);
    await this._respirar();
    carregamento.progresso(60, 'Construindo a cruzadinha…');
    this.mundo = new Mundo(this.scene, tema, this.qualidade, this.layout, this.dados.cruzadinha.titulo || 'ilha', this.renderer);
    await this._respirar();

    carregamento.progresso(78, 'Chamando o explorador…');
    this.personagem = new Personagem(this.scene, this.dados.avatar || {});
    this.personagem.colocarEm(this.mundo.pontoInicial, Math.PI);
    this.personagem.on('agua', () => this._aviso(MENSAGENS_AGUA[Math.floor(Math.random() * MENSAGENS_AGUA.length)]));

    this.cameraJogo = new CameraJogo(window.innerWidth / window.innerHeight);
    this.cameraJogo.reduzirMovimento = this.reduzirMovimento;

    this.controles = new Controles(canvas, {
      joystick: $('joystick'), joystickPino: $('joystickPino'),
      btnPular: $('btnPular'), btnInteragir: $('btnInteragir'),
    });
    this.controles.on('girar', (dx, dy) => this.cameraJogo.girar(dx, dy));
    this.controles.on('zoom', (d) => this.cameraJogo.zoom(d));
    this.controles.on('menu', () => this._alternarMenu());
    this.controles.on('interagir', () => this._interagir());

    this._hud(tema);
    window.addEventListener('resize', () => this._redimensionar());
    document.addEventListener('visibilitychange', () => { this.pausado = document.hidden; this.ultimo = performance.now(); });

    carregamento.progresso(92, 'Ajustando a câmera…');
    await this._respirar();
    this.renderer.compile(this.scene, this.cameraJogo.camera);
    carregamento.concluir();
    this.renderer.setAnimationLoop(() => this._quadro());
  }

  _respirar() { return new Promise(r => setTimeout(r, 30)); }

  _redimensionar() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.cameraJogo.redimensionar(window.innerWidth, window.innerHeight);
  }

  // ── HUD ─────────────────────────────────────────────────────
  _hud(tema) {
    $('hudTitulo').textContent = this.dados.cruzadinha.titulo || 'Ilha das Palavras';
    $('hudTema').textContent = `${tema.nome} · ${this.dados.cruzadinha.disciplina || ''} ${this.dados.cruzadinha.ano ? '· ' + this.dados.cruzadinha.ano : ''}`;
    $('hudPalavras').textContent = `0/${this.layout.palavras.length} palavras`;
    document.body.classList.toggle('toque', ehToque());

    const sel = $('selQualidade');
    sel.value = this.nivelQualidade;
    sel.addEventListener('change', () => { salvarQualidade(sel.value); location.reload(); });
    $('chkMovimento').checked = this.reduzirMovimento;
    $('chkMovimento').addEventListener('change', (ev) => {
      this.reduzirMovimento = ev.target.checked;
      this.cameraJogo.reduzirMovimento = this.reduzirMovimento;
      prefs.gravar('reduzirMovimento', this.reduzirMovimento);
    });
    $('chkToque').checked = ehToque();
    $('chkToque').addEventListener('change', (ev) => document.body.classList.toggle('toque', ev.target.checked));
    $('btnMenu').addEventListener('click', () => this._alternarMenu());
    $('btnFecharMenu').addEventListener('click', () => this._alternarMenu(false));
    $('btnVoltarInicio').addEventListener('click', () => {
      this.personagem.colocarEm(this.mundo.pontoInicial, Math.PI);
      this._alternarMenu(false);
    });
    if (new URLSearchParams(location.search).has('debug')) $('hudFps').hidden = false;
  }

  _alternarMenu(forcar) {
    const menu = $('menu');
    const abrir = forcar ?? menu.hidden;
    menu.hidden = !abrir;
    this.controles.ativo = !abrir;
    if (abrir) $('btnFecharMenu').focus();
  }

  _aviso(texto, ms = 2600) {
    const el = $('aviso');
    el.textContent = texto;
    el.hidden = false;
    el.classList.remove('mostrar');
    void el.offsetWidth; // reinicia a animação
    el.classList.add('mostrar');
    clearTimeout(this._tAviso);
    this._tAviso = setTimeout(() => { el.hidden = true; }, ms);
  }

  _interagir() {
    if (!this.totemAtivo) return;
    const t = this.totemAtivo;
    const p = this.layout.palavras[t.dados.palavra];
    // Fase 3: aqui abre o painel da dica. Por enquanto, mostra a dica no aviso.
    this._aviso(`${t.numero} ${p.direcao === 'h' ? '→' : '↓'} ${p.dica}`, 4500);
  }

  _atualizarTotens(dt) {
    const proximo = this.mundo.totemProximo(this.personagem.posicao);
    if (proximo !== this.totemAtivo) {
      if (this.totemAtivo) this.totemAtivo.acender(false);
      this.totemAtivo = proximo;
      if (proximo) proximo.acender(true);
      $('dicaInteracao').hidden = !proximo;
    }
  }

  // ── Loop ────────────────────────────────────────────────────
  _quadro() {
    const agora = performance.now();
    let dt = (agora - this.ultimo) / 1000;
    this.ultimo = agora;
    if (this.pausado) return;
    dt = Math.min(dt, 0.05);

    this.controles.iniciarFrame();
    // Eixo relativo à câmera
    const e = this.controles.eixo;
    const f = this.cameraJogo.frente();
    const eixo = { x: e.y * f.x + e.x * -f.z, y: -(e.y * f.z + e.x * f.x) };
    const menuAberto = !$('menu').hidden;

    this.personagem.atualizar(dt, { eixo, pular: this.controles.pular }, this.mundo.colisao, menuAberto);
    this.mundo.atualizar(dt);
    this._atualizarTotens(dt);
    this.cameraJogo.atualizar(dt, this.personagem.posicao, this.mundo.colisao.malhasCamera);
    this.renderer.render(this.scene, this.cameraJogo.camera);

    // FPS (debug)
    const fps = this.fps;
    fps.quadros++; fps.tempo += dt;
    if (fps.tempo >= 0.5) {
      fps.valor = Math.round(fps.quadros / fps.tempo);
      fps.quadros = 0; fps.tempo = 0;
      if (!$('hudFps').hidden) $('hudFps').textContent = `${fps.valor} fps · ${this.renderer.info.render.calls} draw calls · ${this.nivelQualidade}`;
    }
  }
}

// ── Inicialização ─────────────────────────────────────────────
(async () => {
  try {
    carregamento.progresso(30, 'Motor 3D carregado. Lendo a cruzadinha…');
    const dados = await obterDados();
    const nivel = detectarQualidade();
    const jogo = new Jogo(dados, nivel);
    window.__jogo = jogo; // facilita depuração no console
    await jogo.iniciar();
  } catch (err) {
    console.error(err);
    carregamento.erro('Não foi possível iniciar o jogo. ' + (err?.message || ''));
  }
})();
