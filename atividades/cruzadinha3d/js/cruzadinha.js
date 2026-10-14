// ============================================================
//  js/cruzadinha.js — Modelo da cruzadinha: layout da grade e
//  estado do jogo (palavras resolvidas, letras conhecidas, dicas).
//  Sem Three.js e sem DOM: funciona no navegador e em testes.
//
//  Formato do JSON de uma cruzadinha:
//  {
//    "titulo": "...", "disciplina": "Ciências", "ano": "3º ano", "tema": "ciencias",
//    "xp": 100,                                   (opcional; vem da atividade no Gamifica)
//    "desafioTempo": { "ativo": false, "segundos": 600 },   (opcional)
//    "palavras": [ { "dica": "...", "resposta": "ÁGUA", "linha": 1, "coluna": 3, "direcao": "v" }, ... ]
//  }
//  linha/coluna começam em 0; direcao "h" (horizontal) ou "v" (vertical).
// ============================================================

/** Remove acentos/cedilha e põe em maiúsculas: "Água" → "AGUA". */
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '');
}

/** Letras da resposta como exibidas (com acento), uma por casa. */
export function letrasExibidas(resposta) {
  return [...String(resposta).toUpperCase()].filter(ch => /\p{L}/u.test(ch));
}

export const chaveCelula = (l, c) => `${l},${c}`;

/**
 * Calcula as células ocupadas, a numeração dos totens e os limites da grade.
 * Palavras que começam na mesma casa dividem o mesmo número (padrão de cruzadinha).
 */
export function montarLayout(cruzadinha) {
  const palavras = (cruzadinha.palavras || []).map((p, i) => ({
    ...p,
    indice: i,
    normal: normalizar(p.resposta),
    letras: letrasExibidas(p.resposta),
    direcao: p.direcao === 'v' ? 'v' : 'h',
  }));

  const celulas = new Map(); // "l,c" → { l, c, letra, palavras: [indices] }
  for (const p of palavras) {
    p.celulas = [];
    p.letras.forEach((letra, k) => {
      const l = p.linha + (p.direcao === 'v' ? k : 0);
      const c = p.coluna + (p.direcao === 'h' ? k : 0);
      const chave = chaveCelula(l, c);
      const cel = celulas.get(chave) || { l, c, letra, palavras: [] };
      cel.palavras.push(p.indice);
      celulas.set(chave, cel);
      p.celulas.push(chave);
    });
  }

  // Numeração por ordem de leitura (linha, depois coluna)
  const inicios = [...palavras].sort((a, b) => a.linha - b.linha || a.coluna - b.coluna);
  const numeroPorInicio = new Map();
  let n = 0;
  for (const p of inicios) {
    const chave = chaveCelula(p.linha, p.coluna);
    if (!numeroPorInicio.has(chave)) numeroPorInicio.set(chave, ++n);
    p.numero = numeroPorInicio.get(chave);
  }

  let linhas = 0, colunas = 0;
  for (const cel of celulas.values()) { linhas = Math.max(linhas, cel.l + 1); colunas = Math.max(colunas, cel.c + 1); }

  const totens = palavras.map(p => ({ l: p.linha, c: p.coluna, numero: p.numero, direcao: p.direcao, palavra: p.indice }));

  return { linhas, colunas, celulas: [...celulas.values()], totens, palavras };
}

/**
 * Estado de uma partida. Regras "sem punição":
 *  · errar não muda nada no estado;
 *  · revelar letra (dica) nunca tira pontos — só marca que a palavra usou dica;
 *  · palavras cujas letras ficaram todas visíveis (por cruzamentos/dicas) são
 *    concluídas automaticamente.
 */
export class EstadoCruzadinha {
  constructor(layout) {
    this.layout = layout;
    this.palavras = layout.palavras;
    this.celulas = new Map(layout.celulas.map(c => [chaveCelula(c.l, c.c), c]));
    this.reveladas = new Set();        // chaves de células com letra visível
    this.resolvidas = new Set();       // índices de palavras concluídas
    this.dicas = new Map();            // índice → Set(posições reveladas por dica)
    this.tentativas = 0;               // respostas enviadas (só estatística)
    this.ouvintes = {};
  }

  on(nome, fn) { (this.ouvintes[nome] ||= []).push(fn); }
  _emitir(nome, dados) { for (const fn of this.ouvintes[nome] || []) fn(dados); }

  get total() { return this.palavras.length; }
  get concluida() { return this.resolvidas.size === this.total; }

  /** Palavras resolvidas sem nenhuma letra revelada: "Estrela de autonomia". */
  get estrelas() {
    let n = 0;
    for (const i of this.resolvidas) if (!this.dicas.get(i)?.size) n++;
    return n;
  }

  get totalDicas() {
    let n = 0;
    for (const s of this.dicas.values()) n += s.size;
    return n;
  }

  letraConhecida(l, c) {
    const chave = chaveCelula(l, c);
    return this.reveladas.has(chave) ? this.celulas.get(chave).letra : null;
  }

  /** Letras da palavra como o painel deve mostrar: { letra|null, fixa, l, c }. */
  letrasDaPalavra(indice) {
    const p = this.palavras[indice];
    return p.celulas.map((chave) => {
      const cel = this.celulas.get(chave);
      const conhecida = this.reveladas.has(chave);
      return { letra: conhecida ? cel.letra : null, fixa: conhecida, l: cel.l, c: cel.c };
    });
  }

  /**
   * Compara uma tentativa com a resposta. Nunca altera o estado quando erra.
   * @param tentativa  string ou array de caracteres (uma letra por casa)
   * @returns { certa, posicoes: boolean[] }  posicoes[k] = letra k está certa
   */
  verificar(indice, tentativa) {
    const p = this.palavras[indice];
    const letras = Array.isArray(tentativa) ? tentativa : letrasExibidas(tentativa);
    const posicoes = p.letras.map((_, k) => normalizar(letras[k] || '') === p.normal[k]);
    const certa = posicoes.length === p.letras.length && posicoes.every(Boolean);
    this.tentativas++;
    if (certa) this.resolver(indice);
    return { certa, posicoes };
  }

  /** Marca a palavra como concluída e revela suas células. Retorna as células novas. */
  resolver(indice, origem = 'resposta') {
    if (this.resolvidas.has(indice)) return [];
    this.resolvidas.add(indice);
    const novas = this._revelarCelulas(this.palavras[indice].celulas);
    this._emitir('palavraResolvida', { indice, origem, novas });
    this._verificarAutomaticas();
    if (this.concluida) this._emitir('concluida', {});
    return novas;
  }

  /** Dica: revela a primeira letra ainda desconhecida da palavra. Não desconta nada. */
  revelarLetra(indice) {
    const p = this.palavras[indice];
    if (this.resolvidas.has(indice)) return null;
    const k = p.celulas.findIndex(ch => !this.reveladas.has(ch));
    if (k < 0) return null;
    if (!this.dicas.has(indice)) this.dicas.set(indice, new Set());
    this.dicas.get(indice).add(k);
    const cel = this.celulas.get(p.celulas[k]);
    this._revelarCelulas([p.celulas[k]]);
    this._emitir('letraRevelada', { indice, posicao: k, l: cel.l, c: cel.c, letra: cel.letra });
    this._verificarAutomaticas();
    return { posicao: k, l: cel.l, c: cel.c, letra: cel.letra };
  }

  _revelarCelulas(chaves) {
    const novas = [];
    for (const ch of chaves) {
      if (this.reveladas.has(ch)) continue;
      this.reveladas.add(ch);
      novas.push(this.celulas.get(ch));
    }
    return novas;
  }

  /** Palavras com todas as letras visíveis ficam concluídas sozinhas. */
  _verificarAutomaticas() {
    for (const p of this.palavras) {
      if (this.resolvidas.has(p.indice)) continue;
      if (p.celulas.every(ch => this.reveladas.has(ch))) this.resolver(p.indice, 'automatica');
    }
  }

  // ── Persistência (progresso parcial) ────────────────────────
  serializar() {
    const dicas = {};
    for (const [i, s] of this.dicas) dicas[i] = [...s];
    return { resolvidas: [...this.resolvidas], dicas, reveladas: [...this.reveladas], tentativas: this.tentativas };
  }

  restaurar(dados) {
    if (!dados) return;
    for (const [i, lista] of Object.entries(dados.dicas || {})) this.dicas.set(+i, new Set(lista));
    for (const ch of dados.reveladas || []) if (this.celulas.has(ch)) this.reveladas.add(ch);
    for (const i of dados.resolvidas || []) if (this.palavras[i]) this.resolvidas.add(i);
    this.tentativas = dados.tentativas || 0;
    this._verificarAutomaticas();
  }
}
