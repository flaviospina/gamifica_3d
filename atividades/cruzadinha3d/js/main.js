// ============================================================
//  js/main.js — Orquestra o jogo "Ilha das Palavras"
//  Fase 3: mecânica da cruzadinha (totens, painel, letras, zonas,
//  celebração), progresso parcial e pontuação.
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
import { montarLayout, EstadoCruzadinha } from './cruzadinha.js';
import { criarAtlasLetras, BlocosLetra } from './letras.js';
import { Particulas } from './particulas.js';
import { PainelDica } from './painel.js';
import { Progressao } from './progressao.js';
import { Celebracao } from './celebracao.js';
import { ArmazenamentoLocal } from './progresso.js';
import { calcularPontuacao, formatarTempo } from './pontuacao.js';
import { mensagem } from './mensagens.js';
import { ehToque, prefs } from './util.js';

const $ = (id) => document.getElementById(id);

/** Dados injetados pela página (index.php). Em demo vêm do data/*.js. */
async function obterDados() {
  const el = $('dadosJogo');
  const dados = el ? JSON.parse(el.textContent) : {};
  if (!dados.cruzadinha) {
    const qual = new URLSearchParams(location.search).get('cruzadinha') === 'portugues' ? 'portugues' : 'ciencias';
    const mod = await import(`../data/exemplo_${qual}.js`);
    dados.cruzadinha = mod.default;
  }
  dados.jogador ||= { nome: 'Visitante' };
  dados.modo ||= 'demo';
  return dados;
}

class Jogo {
  constructor(dados, nivelQualidade) {
    this.dados = dados;
    this.cruzadinha = dados.cruzadinha;
    this.nivelQualidade = nivelQualidade;
    this.qualidade = parametrosQualidade(nivelQualidade);
    this.pausado = false;
    this.ultimo = performance.now();
    this.fps = { quadros: 0, tempo: 0, valor: 0 };
    this.totemAtivo = null;
    this.tempoJogo = 0;              // segundos jogando (pausa quando a aba some)
    this.reduzirMovimento = prefs.ler('reduzirMovimento', matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.xp = Number(this.cruzadinha.xp) || 100;
    this.desafio = this.cruzadinha.desafioTempo || { ativo: false, segundos: 0 };
    this.terminada = false;
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

    const tema = obterTema(this.cruzadinha.tema || this.cruzadinha.disciplina);
    this.tema = tema;
    this.layout = montarLayout(this.cruzadinha);
    this.estado = new EstadoCruzadinha(this.layout);
    await this._respirar();

    carregamento.progresso(58, 'Construindo a cruzadinha…');
    this.mundo = new Mundo(this.scene, tema, this.qualidade, this.layout, this.cruzadinha.titulo || 'ilha', this.renderer);
    await this._respirar();

    carregamento.progresso(70, 'Desenhando as letras…');
    const atlas = await criarAtlasLetras();
    this.blocos = new BlocosLetra(this.scene, this.mundo.grade, atlas, this.qualidade, { bloco: tema.cores.ladrilho });
    this.particulas = new Particulas(this.scene, 260, this.reduzirMovimento ? 0 : this.qualidade.particulas);
    this.blocos.on('pousou', ({ x, y, z }) => this.particulas.explodir(x, y, z, { quantidade: 12, forca: 2.2, cores: ['#E0A537', '#FBF7EF', tema.cores.copa] }));

    carregamento.progresso(80, 'Chamando o explorador…');
    this.personagem = new Personagem(this.scene, this.dados.avatar || {});
    this.personagem.colocarEm(this.mundo.pontoInicial, Math.PI);
    this.personagem.on('agua', () => this._aviso(mensagem('agua')));

    this.cameraJogo = new CameraJogo(window.innerWidth / window.innerHeight);
    this.cameraJogo.reduzirMovimento = this.reduzirMovimento;

    this.controles = new Controles(canvas, {
      joystick: $('joystick'), joystickPino: $('joystickPino'),
      btnPular: $('btnPular'), btnInteragir: $('btnInteragir'),
    });
    this.controles.on('girar', (dx, dy) => { if (!this.cameraJogo.orbita) this.cameraJogo.girar(dx, dy); });
    this.controles.on('zoom', (d) => this.cameraJogo.zoom(d));
    this.controles.on('menu', () => { if (this.painel.aberto) this.painel.fechar(); else this._alternarMenu(); });
    this.controles.on('interagir', () => this._interagir());

    // Progressão por zonas (pilares) e celebração
    this.progressao = new Progressao({ scene: this.scene, mundo: this.mundo, estado: this.estado, colisao: this.mundo.colisao, cores: tema.cores });
    this.progressao.on('zonaAberta', ({ totens }) => {
      this._aviso(mensagem('zonaAberta') + ' (' + totens.map(t => t.numero).join(', ') + ')', 3800);
      for (const t of totens) this.particulas.explodir(t.grupo.position.x, 2.4, t.grupo.position.z, { quantidade: 24, forca: 3, cores: ['#E0A537', '#FBF7EF'] });
    });
    this.celebracao = new Celebracao({
      scene: this.scene, mundo: this.mundo, blocos: this.blocos, personagem: this.personagem, cameraJogo: this.cameraJogo,
      particulas: this.particulas, nome: this.dados.jogador.nome, titulo: this.cruzadinha.titulo || '', reduzirMovimento: this.reduzirMovimento,
    });

    // Painel da dica
    this.painel = new PainelDica({
      raiz: $('painelDica'), numero: $('dicaNumero'), texto: $('dicaTexto'), casinhas: $('casinhas'), entrada: $('entradaResposta'),
      mensagem: $('dicaMensagem'), btnResponder: $('btnResponder'), btnDica: $('btnRevelar'), btnFechar: $('btnFecharDica'), btnOuvir: $('btnOuvir'),
    }, this.estado, {
      aoResponder: (i, letras) => this._responder(i, letras),
      aoDica: (i) => this._revelar(i),
      aoFechar: () => { this.controles.ativo = true; canvas.focus({ preventScroll: true }); },
      aoOuvir: (txt) => this._falar(txt),
    });

    // Eventos do estado → mundo 3D
    this.estado.on('palavraResolvida', ({ indice, origem, novas }) => this._aoResolver(indice, origem, novas));
    this.estado.on('letraRevelada', ({ l, c, letra }) => { this.blocos.mostrar(l, c, letra, { atraso: 0 }); this._salvarProgresso(); });
    this.estado.on('concluida', () => setTimeout(() => this._concluir(), 1400));

    // Progresso parcial
    this.armazenamento = new ArmazenamentoLocal((this.cruzadinha.titulo || 'demo').replace(/\W+/g, '_'));
    this._restaurarProgresso();
    window.addEventListener('pagehide', () => this._salvarProgresso());
    window.addEventListener('beforeunload', () => this._salvarProgresso());

    this._hud(tema);
    window.addEventListener('resize', () => this._redimensionar());
    document.addEventListener('visibilitychange', () => { this.pausado = document.hidden; this.ultimo = performance.now(); if (document.hidden) this._salvarProgresso(); });

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

  // ── Mecânica ────────────────────────────────────────────────
  _responder(indice, letras) {
    const antesEstrelas = this.estado.estrelas;
    const r = this.estado.verificar(indice, letras);
    if (r.certa) {
      const ganhouEstrela = this.estado.estrelas > antesEstrelas;
      r.mensagem = ganhouEstrela ? mensagem('acertoEstrela') : mensagem('acerto');
    }
    this._salvarProgresso();
    return r;
  }

  _revelar(indice) {
    const r = this.estado.revelarLetra(indice);
    this._salvarProgresso();
    return r;
  }

  _aoResolver(indice, origem, novas) {
    // Letras caem do céu em sequência, do início para o fim da palavra
    const p = this.layout.palavras[indice];
    const ordem = new Map(p.celulas.map((ch, k) => [ch, k]));
    for (const cel of novas) {
      const k = ordem.get(`${cel.l},${cel.c}`) ?? 0;
      this.blocos.mostrar(cel.l, cel.c, cel.letra, { atraso: 0.12 * k + 0.1 });
    }
    const totem = this.mundo.totens.find(t => t.dados.palavra === indice);
    if (totem) totem.marcarResolvido();
    if (origem === 'automatica') this._aviso(mensagem('automatica'));
    this.progressao.verificar(true);
    this._atualizarHud();
    this._salvarProgresso();
    if (this.painel.aberto && this.painel.indice !== indice) this.painel.atualizarFixas();
  }

  _interagir() {
    if (this.painel.aberto || this.terminada && this.celebracao.ativa) return;
    const t = this.mundo.totemProximo(this.personagem.posicao); // recalcula na hora (não depende do cache do frame)
    if (!t) return;
    if (t.bloqueado) { this._aviso(mensagem('totemFechado', this.progressao.faltam(t)), 3200); return; }
    // Precisa estar na mesma altura do totem (não vale "de baixo" do pilar)
    if (Math.abs(this.personagem.posicao.y - t.grupo.position.y) > 1.2) return;
    const indice = t.dados.palavra;
    if (this.estado.resolvidas.has(indice)) { this._aviso('Essa palavra já está no lugar! ✅ Procure outro totem.', 2600); return; }
    this.controles.ativo = false;
    this.painel.abrir(indice);
  }

  _atualizarTotens() {
    const proximo = this.mundo.totemProximo(this.personagem.posicao);
    if (proximo !== this.totemAtivo) {
      if (this.totemAtivo) this.totemAtivo.acender(false);
      this.totemAtivo = proximo;
      if (proximo) proximo.acender(true);
      const dica = $('dicaInteracao');
      dica.hidden = !proximo;
      if (proximo) {
        const resolvida = this.estado.resolvidas.has(proximo.dados.palavra);
        dica.innerHTML = proximo.bloqueado
          ? `🔒 Totem ${proximo.numero} ainda fechado — <kbd>E</kbd> para saber como abrir`
          : resolvida ? `✅ Palavra ${proximo.numero} já resolvida`
          : `Totem ${proximo.numero}! <kbd>E</kbd> para ver a dica`;
      }
    }
  }

  _concluir() {
    if (this.terminada) return;
    this.terminada = true;
    this.painel.fechar();
    this.controles.ativo = false;
    $('dicaInteracao').hidden = true;
    this._salvarProgresso();
    this._aviso(mensagem('final', this.dados.jogador.nome), 5000);
    this.celebracao.iniciar(() => this._mostrarResultado());
  }

  _mostrarResultado() {
    const pts = this._pontuacao();
    $('resNome').textContent = `Parabéns, ${this.dados.jogador.nome}!`;
    $('resPalavras').textContent = `${this.estado.resolvidas.size}/${this.estado.total}`;
    $('resEstrelas').textContent = `${this.estado.estrelas}`;
    $('resDicas').textContent = `${this.estado.totalDicas}`;
    $('resTempo').textContent = formatarTempo(this.tempoJogo);
    $('resBase').textContent = `${pts.base}`;
    $('resBonusEstrelas').textContent = `+${pts.estrelas}`;
    $('resBonusTempo').textContent = `+${pts.tempo}`;
    $('resBonusTempoLinha').hidden = !this.desafio.ativo;
    $('resTotal').textContent = `${pts.total}`;
    $('resDemo').hidden = this.dados.modo !== 'demo';
    $('resultado').hidden = false;
    $('btnContinuarExplorando').focus();
    this.armazenamento.enviarResultado(this._resumo());
  }

  _resumo() {
    return { ...this.estado.serializar(), tempoSeg: Math.round(this.tempoJogo), pontuacao: this._pontuacao(), modo: '3d' };
  }

  _pontuacao() {
    return calcularPontuacao({
      total: this.estado.total, resolvidas: this.estado.resolvidas.size, estrelas: this.estado.estrelas, xp: this.xp,
      desafioTempo: !!this.desafio.ativo, tempoSeg: this.tempoJogo, tempoAlvoSeg: Number(this.desafio.segundos) || 0,
    });
  }

  _salvarProgresso() {
    this.armazenamento.salvar({ estado: this.estado.serializar(), tempoSeg: Math.round(this.tempoJogo), salvoEm: Date.now() });
  }

  _restaurarProgresso() {
    const dados = this.armazenamento.carregar();
    if (!dados?.estado) { this.progressao.verificar(false); return; }
    this.estado.restaurar(dados.estado);
    this.tempoJogo = Number(dados.tempoSeg) || 0;
    // Recoloca as letras já reveladas sem animação
    for (const ch of this.estado.reveladas) {
      const cel = this.estado.celulas.get(ch);
      this.blocos.mostrar(cel.l, cel.c, cel.letra, { queda: false });
    }
    for (const t of this.mundo.totens) if (this.estado.resolvidas.has(t.dados.palavra)) t.marcarResolvido();
    this.progressao.verificar(false);
    if (this.estado.resolvidas.size > 0) this._aviso(`Bem-vindo(a) de volta! ${this.estado.resolvidas.size} palavra(s) já no lugar. 🧭`, 3600);
    if (this.estado.concluida) { this.terminada = true; this.celebracao.iniciar(null); this.celebracao.atualizar(10); this.celebracao.encerrar(); }
  }

  _reiniciar() {
    this.armazenamento.limpar();
    location.reload();
  }

  _falar(texto) {
    if (!('speechSynthesis' in window)) { this._aviso('Este navegador não tem leitura em voz alta.'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR'; u.rate = 0.95;
    const voz = speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('pt-br')) || speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('pt'));
    if (voz) u.voice = voz;
    speechSynthesis.speak(u);
  }

  // ── HUD ─────────────────────────────────────────────────────
  _hud(tema) {
    $('hudTitulo').textContent = this.cruzadinha.titulo || 'Ilha das Palavras';
    $('hudTema').textContent = `${tema.nome} · ${this.cruzadinha.disciplina || ''} ${this.cruzadinha.ano ? '· ' + this.cruzadinha.ano : ''}`;
    $('hudTempo').hidden = !this.desafio.ativo;
    document.body.classList.toggle('toque', ehToque());
    this._atualizarHud();

    const sel = $('selQualidade');
    sel.value = this.nivelQualidade;
    sel.addEventListener('change', () => { salvarQualidade(sel.value); this._salvarProgresso(); location.reload(); });
    $('chkMovimento').checked = this.reduzirMovimento;
    $('chkMovimento').addEventListener('change', (ev) => {
      this.reduzirMovimento = ev.target.checked;
      this.cameraJogo.reduzirMovimento = this.reduzirMovimento;
      this.particulas.fator = this.reduzirMovimento ? 0 : this.qualidade.particulas;
      prefs.gravar('reduzirMovimento', this.reduzirMovimento);
    });
    $('chkToque').checked = ehToque();
    $('chkToque').addEventListener('change', (ev) => document.body.classList.toggle('toque', ev.target.checked));
    $('btnMenu').addEventListener('click', () => this._alternarMenu());
    $('btnFecharMenu').addEventListener('click', () => this._alternarMenu(false));
    $('btnVoltarInicio').addEventListener('click', () => { this.personagem.colocarEm(this.mundo.pontoInicial, Math.PI); this._alternarMenu(false); });
    $('btnReiniciar').addEventListener('click', () => { if (confirm('Começar esta cruzadinha do zero? Seu melhor resultado já salvo não muda.')) this._reiniciar(); });
    $('btnContinuarExplorando').addEventListener('click', () => { $('resultado').hidden = true; this.celebracao.encerrar(); this.controles.ativo = true; });
    $('btnJogarDeNovo').addEventListener('click', () => this._reiniciar());
    if (new URLSearchParams(location.search).has('debug')) $('hudFps').hidden = false;
  }

  _atualizarHud() {
    $('hudPalavras').textContent = `${this.estado.resolvidas.size}/${this.estado.total} palavras`;
    $('hudEstrelas').textContent = `⭐ ${this.estado.estrelas}`;
    $('hudPontos').textContent = `${this._pontuacao().total} pts`;
  }

  _alternarMenu(forcar) {
    const menu = $('menu');
    const abrir = forcar ?? menu.hidden;
    menu.hidden = !abrir;
    this.controles.ativo = !abrir && !this.painel.aberto;
    if (abrir) $('btnFecharMenu').focus();
  }

  _aviso(texto, ms = 2600) {
    const el = $('aviso');
    el.textContent = texto;
    el.hidden = false;
    el.classList.remove('mostrar');
    void el.offsetWidth;
    el.classList.add('mostrar');
    clearTimeout(this._tAviso);
    this._tAviso = setTimeout(() => { el.hidden = true; }, ms);
  }

  // ── Loop ────────────────────────────────────────────────────
  _quadro() {
    const agora = performance.now();
    const dtReal = (agora - this.ultimo) / 1000;
    this.ultimo = agora;
    if (this.pausado) return;
    const dt = Math.min(dtReal, 0.05); // evita "saltos" quando a aba fica lenta

    const menuAberto = !$('menu').hidden;
    const bloqueado = menuAberto || this.painel.aberto || this.celebracao.ativa;
    if (!bloqueado && !this.terminada) {
      this.tempoJogo += dt;
      if (this.desafio.ativo) $('hudTempo').textContent = `⏱ ${formatarTempo(Math.max(0, this.desafio.segundos - this.tempoJogo))}`;
    }

    this.controles.iniciarFrame();
    const e = this.controles.eixo;
    const f = this.cameraJogo.frente();
    const eixo = { x: e.y * f.x + e.x * -f.z, y: -(e.y * f.z + e.x * f.x) };

    this.personagem.atualizar(dt, { eixo, pular: this.controles.pular }, this.mundo.colisao, bloqueado);
    this.mundo.atualizar(dt);
    this.blocos.atualizar(dt);
    this.particulas.atualizar(dt);
    this.progressao.atualizar(dt);
    this.celebracao.atualizar(dt);
    if (!this.celebracao.ativa) this._atualizarTotens();
    this.cameraJogo.atualizar(dt, this.personagem.posicao, this.mundo.colisao.malhasCamera);
    this.renderer.render(this.scene, this.cameraJogo.camera);

    const fps = this.fps;
    fps.quadros++; fps.tempo += dtReal;
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
