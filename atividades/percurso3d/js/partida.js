// ============================================================
//  js/partida.js — Conduz a partida: vez de cada jogador, dado,
//  direção do carrinho (teclado/toque), cartas escondidas das casas,
//  perguntas, desafios, museus, obras e chegada.
// ============================================================
import { CONFIG, CORES_JOGADORES } from './config.js';
import { TIPOS } from './cartas.js';
import { esperar, prefs, clamp, suavizar } from './util.js';

const ICONES = { pergunta: '❓', avance3: '💨', avance2: '🟢', volte1: '🎒', volte2: '🚧', bonus50: '💎', bonus20: '🪙', denovo: '🎲', desafio: '⚡', museu: '🏛️', obra: '🏗️', mutirao: '🤝', carona: '🚗', atalho: '🌉', largada: '🏁' };
const FAIXAS = [-0.95, 0.95, 0, -0.95, 0.95, 0];           // metros para o lado quando estacionado
const RECUOS = [0, 0, 0.12, -0.32, -0.32, -0.2];           // em casas

export class Partida {
  constructor({ regras, pista, visoes, ui, controles, audio, dados }) {
    Object.assign(this, { regras, pista, visoes, ui, controles, audio, dados });
    this.vis = new Map();                    // id → { s, faixa, vel }
    this.mov = null;                         // movimento em curso
    this.piloto = prefs.ler('piloto', false);
    ui.aoPiloto = (v) => { this.piloto = v; };
    this.humanos = regras.jogadores.filter((j) => !j.ia).length;
    this._ultimoHumano = null;
    for (const j of regras.jogadores) this.vis.set(j.id, { s: this._vaga(j).s, faixa: this._vaga(j).faixa, vel: 0 });
    for (const v of visoes) v.definirCarros(regras.jogadores);
    this.geral = false;
    controles.aoVista = () => this.alternarVista();
    document.getElementById('btnVista').onclick = () => this.alternarVista();
    regras.on('revelada', ({ casa, tipo }) => { for (const v of visoes) v.revelarCasa(casa, tipo); });
    this._empurrar();
  }

  alternarVista(forcar) { this.geral = forcar ?? !this.geral; for (const v of this.visoes) v.visaoGeral(this.geral); }

  /** Onde o carrinho descansa quando não está andando. */
  _vaga(j) {
    if (j.terminou) return { s: j.pos + 0.55 + 0.34 * Math.floor((j.ordem - 1) / 2), faixa: (j.ordem % 2 ? -1 : 1) * 1.35 };
    return { s: j.pos + RECUOS[j.id % 6], faixa: FAIXAS[j.id % 6] };
  }

  _empurrar() { for (const [id, v] of this.vis) for (const visao of this.visoes) visao.posicionar(id, v.s, v.faixa, v.vel); }

  /** Chamado a cada quadro pelo laço principal. `desenhar` = false avança só a lógica (modo rápido de teste). */
  atualizar(dt, desenhar = true) {
    const m = this.mov;
    for (const j of this.regras.jogadores) {
      const v = this.vis.get(j.id);
      if (m && m.id === j.id) continue;
      // Estacionados: deslizam suavemente para a vaga
      const alvo = this._vaga(j), k = suavizar(5, dt);
      v.s += (alvo.s - v.s) * k; v.faixa += (alvo.faixa - v.faixa) * k; v.vel = 0;
    }
    if (m) {
      const v = this.vis.get(m.id), resta = (m.alvo - v.s) * m.dir;
      const humano = !m.auto && !this.piloto;
      const acelerando = humano ? this.controles.acelerar : true;
      const vmax = m.auto ? (m.rapido ? 7 : 5) : (humano ? 3.2 : 4.2);
      const alvoV = acelerando ? Math.min(vmax, Math.max(0.9, resta * 3.2)) : 0;
      m.v += clamp(alvoV - m.v, -11 * dt, 7 * dt);
      if (humano) {
        const lado = (this.controles.direita ? 1 : 0) - (this.controles.esquerda ? 1 : 0);
        v.faixa = clamp(v.faixa + lado * 2.6 * dt, -1.35, 1.35);
        if (m.v < 0.05) { m.parado += dt; if (m.parado > 5 && !m.dica) { m.dica = true; this.ui.aviso('Segure ↑ (ou o botão ▲) para o carrinho andar', 3200); } } else m.parado = 0;
      } else v.faixa += (0 - v.faixa) * suavizar(3, dt);
      const antes = v.s;
      v.s += m.dir * m.v * dt;
      if ((m.alvo - v.s) * m.dir <= 0.001) v.s = m.alvo;
      v.vel = m.dir * m.v;
      if (Math.floor(v.s + 1e-6) !== Math.floor(antes + 1e-6)) { this.audio.passo(); m.aoPasso?.(Math.max(0, Math.round((m.alvo - v.s) * m.dir))); }
      if (v.s === m.alvo) { v.vel = 0; this.mov = null; m.resolve(); }
    }
    if (!desenhar) return;
    this._empurrar();
    for (const visao of this.visoes) visao.render(dt);
  }

  /** Anima o carrinho de onde está até a posição `para` (em casas acumuladas). */
  _andar(j, para, { auto = false, rapido = false, aoPasso = null } = {}) {
    const v = this.vis.get(j.id);
    v.s = j.pos; // parte do centro da casa atual
    if (para === j.pos) return Promise.resolve();
    return new Promise((resolve) => { this.mov = { id: j.id, alvo: para, dir: Math.sign(para - j.pos), auto: auto || j.ia, rapido, v: 0, parado: 0, aoPasso, resolve }; });
  }

  _focar(j) { this.alternarVista(false); for (const v of this.visoes) v.focar(j.id); }
  _cor(j) { return CORES_JOGADORES[j.cor % CORES_JOGADORES.length]; }

  /** Move e credita voltas/chegada; comemora quando for o caso. */
  async _chegarEm(j, para) {
    const r = this.regras.mover(j, para);
    this.ui.placar(this.regras);
    if (r.voltas > 0) {
      this.audio.volta(); for (const v of this.visoes) v.comemorar(j.id);
      if (!r.terminou) this.ui.aviso(`🏁 ${j.nome} completou a volta: +${CONFIG.estrelas.volta} estrelas e +${CONFIG.pontos.volta} pontos!`, 3200);
    }
    if (r.terminou) {
      await this.ui.cartao({
        icone: r.primeiro ? '🔑' : '🏁', etiqueta: `${j.ordem}º a chegar`, titulo: `${j.nome} chegou!`,
        texto: r.primeiro ? 'Primeiro a completar o percurso: a Chave da Cidade é sua!' : 'Percurso completo. Agora é torcer pelos outros e responder aos desafios.',
        extra: `<span class="ganho">+${CONFIG.estrelas.volta} ⭐</span><span class="ganho">+${CONFIG.pontos.volta} pontos</span>`,
        auto: j.ia ? 2200 : 0,
      });
    }
    return r;
  }

  // ── Laço da partida ─────────────────────────────────────────
  async rodar() {
    const { regras, ui } = this;
    this.alternarVista(true);
    ui.vez(null);
    await esperar(ui._t(1400));
    while (!regras.encerrada) {
      await this._turno(regras.atual);
      if (!regras.proximaVez()) break;
    }
    for (const v of this.visoes) v.destacarCasa(null);
    this.alternarVista(true);
    ui.vez(null); ui.guia(null); ui.toque(false);
    this.audio.fim();
    return regras.resultado();
  }

  async _turno(j) {
    const { regras, ui } = this;
    this._focar(j);
    ui.placar(regras);
    if (!j.ia && this.humanos > 1 && this._ultimoHumano !== j.id) {
      await ui.cartao({ icone: '🎮', titulo: `Vez de ${j.nome}`, texto: 'Passe o aparelho para quem vai jogar agora.', botoes: [{ rotulo: 'Estou pronto!' }] });
    }
    if (!j.ia) this._ultimoHumano = j.id;
    let denovo = true, repeticoes = 0;
    while (denovo && repeticoes++ < 3 && !j.terminou) {
      denovo = false;
      ui.vez(j, j.ia ? `${j.nome} vai jogar o dado…` : `Vez de ${j.nome}: jogue o dado`);
      await ui.esperarDado(j);
      const dado = regras.rolar(j);
      await ui.animarDado(dado);
      const destino = regras.destino(j, dado.passos);
      const casaAlvo = regras.casaDe(destino);
      for (const v of this.visoes) v.destacarCasa(casaAlvo);
      const humano = !j.ia && !this.piloto;
      const tecla = document.body.classList.contains('toque') ? 'o botão <kbd>▲</kbd>' : '<kbd>↑</kbd>';
      const texto = (n) => (humano ? `Faltam <b>${n}</b> ${n === 1 ? 'casa' : 'casas'} · segure ${tecla} para andar` : `Faltam <b>${n}</b> ${n === 1 ? 'casa' : 'casas'}`);
      ui.vez(j, `${j.nome} tirou ${dado.passos}${dado.bonus ? ' (com o vento a favor)' : ''}`);
      ui.guia(texto(destino - j.pos)); ui.toque(humano);
      await this._andar(j, destino, { aoPasso: (n) => ui.guia(texto(n)) });
      ui.guia(null); ui.toque(false);
      for (const v of this.visoes) v.destacarCasa(null);
      const r = await this._chegarEm(j, destino);
      if (r.terminou) break;
      denovo = await this._casa(j);
      ui.placar(regras);
    }
  }

  /** Revela e resolve a carta da casa em que o jogador parou. Devolve true se ele joga de novo. */
  async _casa(j) {
    const { regras, ui, audio } = this;
    const casa = regras.casaDe(j.pos), tipo = regras.tipoEm(j.pos), def = TIPOS[tipo];
    const nova = regras.revelar(casa);
    if (tipo === 'largada') return false;
    audio.carta();
    const e = regras.efeito(j, tipo);
    ui.placar(regras);
    const auto = j.ia ? 1900 : 0;
    const etiqueta = `Casa ${casa}${nova ? ' · descoberta!' : ''}`;

    if (e.pergunta) { await this._pergunta(j, casa, etiqueta); return false; }

    if (e.obra) { await this._obra(j, casa, etiqueta); return false; }

    if (e.museu) {
      const m = regras.visitarMuseu(j, casa);
      await ui.cartao({ icone: ICONES.museu, etiqueta, titulo: m.curiosidade.titulo, texto: m.curiosidade.texto, falar: j.ia ? '' : `${m.curiosidade.titulo}. ${m.curiosidade.texto}`,
        extra: m.novo ? `<span class="ganho">🏅 Selo novo</span><span class="ganho">+${m.pontos} pontos</span>` : '<span class="ganho">Você já tem este selo</span>', auto: j.ia ? 2600 : 0 });
      if (m.novo) audio.estrela();
      return false;
    }

    if (e.desafio) { await ui.cartao({ icone: ICONES.desafio, etiqueta, titulo: def.titulo, texto: def.texto, auto: j.ia && this.humanos === 0 ? 1500 : 0, botoes: [{ rotulo: 'Vamos lá!' }] }); await this._desafio(); return false; }

    // Cartas de efeito direto
    let extra = '';
    if (e.pontos) extra += `<span class="ganho">+${e.pontos} pontos</span>`;
    if (tipo === 'carona') extra += e.alvo ? `<span class="ganho">até ${e.alvo.nome}</span>` : '';
    await ui.cartao({ icone: ICONES[tipo] || '✨', etiqueta, titulo: def.titulo, texto: tipo === 'carona' && !e.alvo ? 'Ninguém está à sua frente: em vez da carona, ganhe 20 pontos.' : def.texto, extra, auto });
    if (e.pontos) audio.pontos();
    if (e.para !== undefined && e.para !== j.pos) {
      if (e.para < j.pos) audio.recuo();
      await this._andar(j, e.para, { auto: true });
      await this._chegarEm(j, e.para);
    }
    if (e.todos) {
      this.alternarVista(true);
      for (const o of regras.ativos()) { const para = regras.destino(o, e.todos); await this._andar(o, para, { auto: true, rapido: true }); await this._chegarEm(o, para); }
      this._focar(j);
    }
    return !!e.denovo;
  }

  async _pergunta(j, casa, etiqueta) {
    const { regras, ui, audio } = this;
    const q = regras.sortearPergunta(j);
    const titulo = `${etiqueta} · Pergunta de ${this.dados.disciplina || 'conhecimentos'}${q.repetida ? ' · segunda chance' : ''}${j.dobro ? ' · vale 2 estrelas' : ''} · ${j.nome}`;
    const alt = await ui.pergunta(q, { titulo, altIA: j.ia ? regras.iaResponde(j, q) : null });
    const r = regras.responder(j, q, alt);
    ui.placar(regras);
    if (r.certa) {
      audio.acerto(); audio.estrela();
      await ui.retornoPergunta(q, alt, `<b>Isso mesmo!</b> +${r.estrelas} ⭐ e +${r.pontos} pontos. ${j.nome} avança 2 casas. ${q.e ? '<br>' + q.e : ''}`, { auto: j.ia ? 2200 : 0 });
      const para = regras.destino(j, 2);
      await this._andar(j, para, { auto: true });
      await this._chegarEm(j, para);
    } else {
      audio.quase();
      const inicio = alt < 0 ? '<b>O tempo acabou.</b>' : '<b>Quase!</b>';
      await ui.retornoPergunta(q, alt, `${inicio} A resposta certa é <b>${q.a[q.c]}</b>. ${q.e || ''}<br>Você fica na casa ${casa} e esta pergunta volta para uma segunda chance.`, { auto: j.ia ? 2600 : 0 });
    }
  }

  async _obra(j, casa, etiqueta) {
    const { regras, ui, audio } = this;
    const def = TIPOS.obra, tem = regras.estrelasDisponiveis(j), custo = CONFIG.obra.custoEstrelas;
    if (j.ia) { await ui.cartao({ icone: ICONES.obra, etiqueta, titulo: def.titulo, texto: 'A cidade é construída só pelos alunos: o computador deixa o terreno para vocês.', auto: 1900 }); return; }
    if (tem < custo) { await ui.cartao({ icone: ICONES.obra, etiqueta, titulo: def.titulo, texto: `Um prédio custa ${custo} estrelas e você tem ${tem} para usar. Acerte mais perguntas e volte aqui!` }); return; }
    const quer = await ui.cartao({ icone: ICONES.obra, etiqueta, titulo: def.titulo, texto: def.texto, extra: `<span class="ganho">Você tem ${tem} ⭐ para usar</span>`, botoes: [{ rotulo: 'Agora não', valor: false }, { rotulo: `Construir (${custo} ⭐)`, valor: true }] });
    if (!quer) return;
    const obra = regras.construir(j, casa);
    if (!obra) return;
    audio.obra();
    for (const v of this.visoes) v.adicionarObra(obra, j.nome, j.cor);
    ui.placar(regras);
    ui.aviso(`🏠 ${j.nome} construiu na cidade: +${CONFIG.pontos.obra} pontos!`, 3000);
    await esperar(ui._t(1600));
  }

  /** Desafio-relâmpago: todos respondem a mesma pergunta; o resultado só aparece no fim. */
  async _desafio() {
    const { regras, ui, audio } = this;
    const q = regras.perguntaDesafio();
    const respostas = new Map();
    for (const o of regras.jogadores) {
      if (o.ia) { respostas.set(o.id, regras.iaResponde(o, q)); continue; }
      if (this.humanos > 1) await ui.cartao({ icone: '🙈', titulo: `Desafio: vez de ${o.nome}`, texto: 'Só quem vai responder olha a tela agora.', botoes: [{ rotulo: 'Estou pronto!' }] });
      const alt = await ui.pergunta(q, { titulo: `Desafio-relâmpago · ${o.nome} responde`, tempo: CONFIG.tempoDesafio });
      respostas.set(o.id, alt);
      ui.fecharPergunta();
    }
    const d = regras.resolverDesafio(q, respostas);
    ui.placar(regras);
    if (d.acertaram.length) audio.acerto(); else audio.quase();
    const linhas = regras.jogadores.map((o) => `<li><span>${o.nome}</span><b>${d.acertaram.includes(o.id) ? 'acertou · +1 casa' : 'ainda não'}</b></li>`).join('');
    await ui.cartao({
      icone: d.todos ? '🌟' : '⚡', titulo: d.todos ? 'Todos acertaram!' : 'Resultado do desafio',
      texto: `Resposta certa: ${q.a[q.c]}. ${q.e || ''}`,
      extra: `<ul class="lista">${linhas}</ul>${d.todos ? `<span class="ganho">+${CONFIG.estrelas.desafioTodos} ⭐ para cada um</span><span class="ganho">+${CONFIG.pontos.desafioTodos} pontos</span>` : ''}`,
      auto: this.humanos === 0 ? 1500 : 0,
    });
    this.alternarVista(true);
    for (const id of d.acertaram) { const o = regras.jogadores[id]; if (o.terminou) continue; const para = regras.destino(o, 1); await this._andar(o, para, { auto: true, rapido: true }); await this._chegarEm(o, para); }
    this._focar(regras.atual);
  }
}
