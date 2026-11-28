// ============================================================
//  js/regras.js — Motor de regras da Cidade do Saber (lógica pura,
//  sem DOM nem 3D; roda também no Node para testes).
//
//  Princípio: o jogo só soma. Pontos e estrelas nunca diminuem,
//  ninguém perde a vez e "voltar casas" nunca tira uma volta feita.
// ============================================================
import { CONFIG } from './config.js';
import { Emissor, criarAleatorio } from './util.js';
import { distribuirCartas, TIPOS, CURIOSIDADES_PADRAO } from './cartas.js';

export class Regras extends Emissor {
  /**
   * @param {object} o
   * @param {Array<{nome:string, cor:number, ia?:boolean, nivel?:string}>} o.jogadores
   * @param {Array<{p:string,a:string[],c:number,e?:string,t?:string}>} o.perguntas
   * @param {Array<{titulo:string,texto:string}>} [o.curiosidades]
   * @param {number} [o.voltas]
   * @param {number} [o.semente]
   * @param {number} [o.xp]  XP da atividade no Gamifica
   */
  constructor({ jogadores, perguntas, curiosidades, voltas = CONFIG.voltasPadrao, semente = Date.now(), xp = 100 }) {
    super();
    if (!jogadores?.length) throw new Error('A partida precisa de pelo menos 1 jogador.');
    if (!perguntas?.length) throw new Error('O banco de perguntas está vazio.');
    this.rnd = criarAleatorio(semente);
    this.voltas = Math.max(1, Math.min(3, voltas | 0));
    this.casas = CONFIG.casas;
    this.total = this.casas * this.voltas;
    this.xp = xp;
    this.perguntas = perguntas;
    this.curiosidades = curiosidades?.length ? curiosidades : CURIOSIDADES_PADRAO;
    this.cartas = distribuirCartas(this.rnd, this.casas);
    this.reveladas = new Set([0]);
    this.jogadores = jogadores.slice(0, CONFIG.maxJogadores).map((j, id) => ({
      id, nome: j.nome || `Jogador ${id + 1}`, cor: j.cor ?? id, ia: !!j.ia, nivel: j.nivel || 'medio',
      pos: 0, maxPos: 0, estrelas: 0, estrelasGastas: 0, pontos: 0, selos: new Set(), obras: [],
      acertos: 0, erros: 0, respondidas: 0, fila: [], vistas: new Set(), porAssunto: {},
      dobro: false, terminou: false, ordem: 0, historico: [],
    }));
    this.vez = 0;
    this.rodada = 1;
    this.chegadas = 0;
    this.encerrada = false;
    this._museus = this.cartas.map((t, i) => (t === 'museu' ? i : -1)).filter((i) => i >= 0);
    this._baralhoDesafio = [];
  }

  get atual() { return this.jogadores[this.vez]; }
  ativos() { return this.jogadores.filter((j) => !j.terminou); }
  casaDe(pos) { return ((pos % this.casas) + this.casas) % this.casas; }
  voltaDe(pos) { return Math.min(this.voltas, Math.floor(pos / this.casas) + 1); }
  tipoEm(pos) { return this.cartas[this.casaDe(pos)]; }
  estrelasDisponiveis(j) { return j.estrelas - j.estrelasGastas; }

  /** Quem está em último (ganha o vento a favor). Vazio se todos empatados ou só há 1 ativo. */
  ultimos() {
    const a = this.ativos();
    if (a.length < 2) return [];
    const min = Math.min(...a.map((j) => j.pos)), max = Math.max(...a.map((j) => j.pos));
    if (min === max) return [];
    return a.filter((j) => j.pos === min).map((j) => j.id);
  }

  /** Joga o dado. `forcado` (1..6) serve para testes. */
  rolar(j, forcado) {
    const dado = forcado || this.rnd.inteiro(1, 6);
    const bonus = this.ultimos().includes(j.id) ? CONFIG.ventoAFavor : 0;
    return { dado, bonus, passos: dado + bonus };
  }

  destino(j, passos) { return Math.min(this.total, j.pos + passos); }

  /** Recuo de carta: nunca passa para trás da Largada da volta atual. */
  recuo(j, n) { return Math.max(Math.floor(j.pos / this.casas) * this.casas, j.pos - n); }

  /**
   * Leva o jogador até `novaPos`, creditando voltas completas e a chegada.
   * @returns {{voltas:number, terminou:boolean, primeiro:boolean}}
   */
  mover(j, novaPos) {
    const antes = Math.floor(j.pos / this.casas);
    novaPos = Math.max(0, Math.min(this.total, novaPos));
    j.pos = novaPos;
    let voltas = 0;
    if (novaPos > j.maxPos) {
      voltas = Math.floor(novaPos / this.casas) - Math.floor(j.maxPos / this.casas);
      j.maxPos = novaPos;
    }
    void antes;
    for (let v = 0; v < voltas; v++) { j.estrelas += CONFIG.estrelas.volta; j.pontos += CONFIG.pontos.volta; }
    let primeiro = false;
    if (novaPos >= this.total && !j.terminou) {
      j.terminou = true;
      j.ordem = ++this.chegadas;
      primeiro = j.ordem === 1;
      this.emitir('chegou', { jogador: j, primeiro });
    }
    return { voltas, terminou: j.terminou, primeiro };
  }

  /** Revela a carta da casa. Devolve true se era a primeira vez. */
  revelar(casa) {
    if (this.reveladas.has(casa)) return false;
    this.reveladas.add(casa);
    this.emitir('revelada', { casa, tipo: this.cartas[casa] });
    return true;
  }

  // ── Perguntas ───────────────────────────────────────────────
  /** Próxima pergunta do jogador: primeiro as que ele errou (segunda chance), depois as inéditas. */
  sortearPergunta(j) {
    let indice, repetida = false;
    if (j.fila.length) { indice = j.fila[0]; repetida = true; }
    else {
      let livres = this.perguntas.map((_, i) => i).filter((i) => !j.vistas.has(i));
      if (!livres.length) { j.vistas.clear(); livres = this.perguntas.map((_, i) => i); }
      indice = this.rnd.escolher(livres);
    }
    j.vistas.add(indice);
    return { indice, repetida, ...this.perguntas[indice] };
  }

  /** Registra a resposta. `alt` < 0 = tempo esgotado. */
  responder(j, q, alt) {
    const certa = alt === q.c;
    j.respondidas++;
    const assunto = q.t || 'Geral';
    const a = (j.porAssunto[assunto] ||= { certas: 0, erradas: 0 });
    let estrelas = 0, pontos = 0;
    if (certa) {
      j.acertos++; a.certas++;
      estrelas = CONFIG.estrelas.acerto * (j.dobro ? 2 : 1);
      pontos = CONFIG.pontos.acerto;
      j.estrelas += estrelas; j.pontos += pontos; j.dobro = false;
      j.fila = j.fila.filter((i) => i !== q.indice);
    } else {
      j.erros++; a.erradas++;
      if (!j.fila.includes(q.indice)) j.fila.push(q.indice);
    }
    return { certa, estrelas, pontos, correta: q.c, explicacao: q.e || '' };
  }

  iaResponde(j, q) {
    const taxa = CONFIG.ia[j.nivel] ?? CONFIG.ia.medio;
    if (this.rnd() < taxa) return q.c;
    const erradas = q.a.map((_, i) => i).filter((i) => i !== q.c);
    return this.rnd.escolher(erradas);
  }

  perguntaDesafio() {
    if (!this._baralhoDesafio.length) this._baralhoDesafio = this.rnd.embaralhar(this.perguntas.map((_, i) => i));
    const indice = this._baralhoDesafio.pop();
    return { indice, ...this.perguntas[indice] };
  }

  /**
   * Desafio-relâmpago: todos respondem. Quem acerta avança 1 casa; se todos acertam, +1 estrela e bônus.
   * @param {Map<number, number>} respostas id → alternativa
   * @returns {{acertaram:number[], todos:boolean}}
   */
  resolverDesafio(q, respostas) {
    const acertaram = [];
    for (const j of this.jogadores) {
      const alt = respostas.get(j.id);
      if (alt === undefined) continue;
      j.respondidas++;
      const a = (j.porAssunto[q.t || 'Geral'] ||= { certas: 0, erradas: 0 });
      if (alt === q.c) { j.acertos++; a.certas++; j.pontos += CONFIG.pontos.acerto; acertaram.push(j.id); }
      else { j.erros++; a.erradas++; }
    }
    const todos = acertaram.length === respostas.size && respostas.size > 0;
    if (todos) for (const id of acertaram) { const j = this.jogadores[id]; j.estrelas += CONFIG.estrelas.desafioTodos; j.pontos += CONFIG.pontos.desafioTodos; }
    return { acertaram, todos };
  }

  // ── Efeitos das cartas ──────────────────────────────────────
  /**
   * Descreve o que a carta faz para o jogador (sem aplicar movimento: quem anima é a partida).
   * @returns {{tipo:string, andar?:number, para?:number, pontos?:number, denovo?:boolean, todos?:number, alvo?:object}}
   */
  efeito(j, tipo) {
    const def = TIPOS[tipo] || {};
    const e = def.efeito || {};
    const r = { tipo };
    if (e.pontos) { j.pontos += e.pontos; r.pontos = e.pontos; }
    if (e.andar > 0) r.para = this.destino(j, e.andar);
    if (e.andar < 0) r.para = this.recuo(j, -e.andar);
    if (e.denovo) r.denovo = true;
    if (e.todos) r.todos = e.todos;
    if (e.carona) {
      const frente = this.ativos().filter((o) => o.id !== j.id && o.pos > j.pos).sort((a, b) => a.pos - b.pos)[0];
      if (frente) { r.para = frente.pos; r.alvo = frente; }
      else { j.pontos += 20; r.pontos = (r.pontos || 0) + 20; }
    }
    if (e.desafio) r.desafio = true;
    if (e.museu) r.museu = true;
    if (e.obra) r.obra = true;
    if (tipo === 'pergunta') r.pergunta = true;
    return r;
  }

  visitarMuseu(j, casa) {
    const novo = !j.selos.has(casa);
    if (novo) { j.selos.add(casa); j.pontos += CONFIG.pontos.selo; }
    const k = Math.max(0, this._museus.indexOf(casa));
    return { novo, pontos: novo ? CONFIG.pontos.selo : 0, curiosidade: this.curiosidades[k % this.curiosidades.length] };
  }

  podeConstruir(j) { return this.estrelasDisponiveis(j) >= CONFIG.obra.custoEstrelas; }
  construir(j, casa) {
    if (!this.podeConstruir(j)) return null;
    j.estrelasGastas += CONFIG.obra.custoEstrelas;
    j.pontos += CONFIG.pontos.obra;
    const nivel = j.obras.filter((o) => o.casa === casa).length + 1;
    const obra = { casa, nivel, jogador: j.id };
    j.obras.push(obra);
    this.emitir('obra', obra);
    return obra;
  }

  // ── Vez ─────────────────────────────────────────────────────
  /** Passa para o próximo que ainda não chegou. Devolve false quando a partida acabou. */
  proximaVez() {
    if (this.ativos().length === 0) { this.encerrada = true; this.emitir('fim', this.resultado()); return false; }
    const n = this.jogadores.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.vez + k) % n;
      if (i <= this.vez && k <= n) { /* deu a volta na mesa */ }
      if (!this.jogadores[i].terminou) {
        if (i <= this.vez) this.rodada++;
        this.vez = i;
        return true;
      }
    }
    this.encerrada = true;
    return false;
  }

  // ── Pontuação / XP ──────────────────────────────────────────
  xpDe(j) {
    const participacao = Math.round(this.xp * Math.min(1, j.maxPos / this.total));
    const acertos = j.respondidas ? Math.round(this.xp * 0.25 * j.acertos / j.respondidas) : 0;
    return { participacao, acertos, total: participacao + acertos };
  }

  resultado() {
    return this.jogadores
      .map((j) => ({
        id: j.id, nome: j.nome, cor: j.cor, ia: j.ia, ordem: j.ordem, casas: j.maxPos, pontos: j.pontos,
        estrelas: j.estrelas, selos: j.selos.size, obras: j.obras.length, acertos: j.acertos, erros: j.erros,
        porAssunto: j.porAssunto, xp: this.xpDe(j), terminou: j.terminou,
      }))
      .sort((a, b) => (a.ordem || 99) - (b.ordem || 99) || b.casas - a.casas);
  }

  /** Estado serializável (salvar/retomar e, depois, sincronizar online). */
  serializar() {
    return {
      v: 1, voltas: this.voltas, cartas: this.cartas, reveladas: [...this.reveladas], vez: this.vez, rodada: this.rodada, chegadas: this.chegadas,
      jogadores: this.jogadores.map((j) => ({ ...j, selos: [...j.selos], vistas: [...j.vistas], historico: undefined })),
    };
  }
}
