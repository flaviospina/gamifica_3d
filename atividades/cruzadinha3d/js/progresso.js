// ============================================================
//  js/progresso.js — Salvar/carregar progresso e enviar resultados.
//   · ArmazenamentoLocal    → demo e teste do professor (localStorage, nada no banco)
//   · ArmazenamentoServidor → aluno logado (api.php com token CSRF)
// ============================================================

export class ArmazenamentoLocal {
  constructor(chave) { this.chave = 'cruz3d_progresso_' + chave; }
  carregar() {
    try { const v = localStorage.getItem(this.chave); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  salvar(dados) {
    try { localStorage.setItem(this.chave, JSON.stringify(dados)); } catch { /* modo privado */ }
  }
  salvarAgora(dados) { this.salvar(dados); }
  limpar() { try { localStorage.removeItem(this.chave); } catch { /* ignora */ } }
  /** Resultado final: no modo demo não vai a lugar nenhum. */
  async enviarResultado() { return { ok: true, demo: true }; }
  async salvarAvatar() { return { ok: true }; }
}

export class ArmazenamentoServidor {
  /**
   * @param cfg { api, csrf, atividadeId, progressoInicial, intervaloMs }
   */
  constructor(cfg) {
    this.api = cfg.api || 'api.php';
    this.csrf = cfg.csrf;
    this.atividadeId = cfg.atividadeId;
    this.inicial = cfg.progressoInicial || null;
    this.intervaloMs = cfg.intervaloMs || 2500;
    this._pendente = null;
    this._timer = null;
    this._ultimoEnvio = 0;
    this.erroRede = false;
  }

  carregar() { return this.inicial; }

  _corpo(acao, extra) {
    return JSON.stringify({ acao, csrf: this.csrf, atividade_id: this.atividadeId, ...extra });
  }

  async _post(acao, extra) {
    const r = await fetch(this.api, {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: this._corpo(acao, extra),
    });
    const json = await r.json().catch(() => ({ ok: false, erro: 'Resposta inválida do servidor' }));
    if (!r.ok || !json.ok) { this.erroRede = true; throw new Error(json.erro || ('HTTP ' + r.status)); }
    this.erroRede = false;
    return json;
  }

  /** Salva com um pequeno atraso para não enviar a cada letra. */
  salvar(dados) {
    this._pendente = dados;
    if (this._timer) return;
    const espera = Math.max(0, this.intervaloMs - (Date.now() - this._ultimoEnvio));
    this._timer = setTimeout(() => { this._timer = null; this._despachar(); }, espera);
  }

  _despachar() {
    if (!this._pendente) return;
    const d = this._pendente; this._pendente = null;
    this._ultimoEnvio = Date.now();
    this._post('progresso', { estado: d.estado, tempoSeg: d.tempoSeg, modo: d.modo }).catch(e => console.warn('[progresso]', e.message));
  }

  /** Envio imediato, próprio para o fechamento da aba (sendBeacon). */
  salvarAgora(dados) {
    clearTimeout(this._timer); this._timer = null; this._pendente = null;
    const corpo = this._corpo('progresso', { estado: dados.estado, tempoSeg: dados.tempoSeg, modo: dados.modo });
    if (navigator.sendBeacon) navigator.sendBeacon(this.api, new Blob([corpo], { type: 'application/json' }));
    else this._post('progresso', { estado: dados.estado, tempoSeg: dados.tempoSeg, modo: dados.modo }).catch(() => {});
  }

  limpar() {
    return this._post('progresso', { estado: { resolvidas: [], dicas: {}, reveladas: [], tentativas: 0 }, tempoSeg: 0, modo: '3d' }).catch(() => {});
  }

  /**
   * Envia o resultado para o servidor recalcular e creditar o XP.
   * @param resumo   { resolvidas, dicas, reveladas, tentativas, tempoSeg, modo }
   * @param opcoes   { parcial, beacon }
   */
  async enviarResultado(resumo, { parcial = false, beacon = false } = {}) {
    const extra = { estado: { resolvidas: resumo.resolvidas, dicas: resumo.dicas, reveladas: resumo.reveladas, tentativas: resumo.tentativas }, tempoSeg: resumo.tempoSeg, modo: resumo.modo, parcial: parcial ? 1 : 0 };
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(this.api, new Blob([this._corpo('resultado', extra)], { type: 'application/json' }));
      return { ok: true, beacon: true };
    }
    return this._post('resultado', extra);
  }

  salvarAvatar(visual) {
    return this._post('avatar', visual).catch(e => console.warn('[avatar]', e.message));
  }
}
