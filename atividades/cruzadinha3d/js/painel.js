// ============================================================
//  js/painel.js — Painel da dica: casinhas da palavra, digitação,
//  resposta, dica extra e mensagens de incentivo.
//  Acessível: foco gerenciado, teclado completo, aria-live.
// ============================================================
import { mensagem } from './mensagens.js';
import { letrasExibidas } from './cruzadinha.js';

export class PainelDica {
  /**
   * @param el     { raiz, numero, texto, casinhas, entrada, mensagem, btnResponder, btnDica, btnFechar, btnOuvir }
   * @param cb     { aoResponder(indice, letras) → {certa, posicoes}, aoDica(indice), aoFechar(), aoOuvir(texto) }
   */
  constructor(el, estado, cb) {
    this.el = el;
    this.estado = estado;
    this.cb = cb;
    this.indice = null;
    this.posicoes = [];        // [{ letra, fixa }] por casa
    this.aberto = false;
    this.bloqueado = false;    // durante a animação de acerto

    el.entrada.addEventListener('input', () => this._lerEntrada());
    el.entrada.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); this.responder(); }
      if (ev.key === 'Escape') { ev.preventDefault(); this.fechar(); }
    });
    el.casinhas.addEventListener('click', () => el.entrada.focus());
    el.btnResponder.addEventListener('click', () => this.responder());
    el.btnDica.addEventListener('click', () => this.pedirDica());
    el.btnFechar.addEventListener('click', () => this.fechar());
    if (el.btnOuvir) el.btnOuvir.addEventListener('click', () => this.cb.aoOuvir?.(this._textoParaOuvir()));
    el.raiz.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); this.fechar(); } });
  }

  abrir(indice) {
    const p = this.estado.palavras[indice];
    this.indice = indice;
    this.aberto = true;
    this.bloqueado = false;
    this.el.raiz.hidden = false;
    this.el.numero.textContent = `${p.numero} ${p.direcao === 'h' ? '→' : '↓'}`;
    this.el.numero.setAttribute('aria-label', `Palavra ${p.numero}, ${p.direcao === 'h' ? 'horizontal' : 'vertical'}`);
    this.el.texto.textContent = p.dica;
    this.el.mensagem.textContent = '';
    this.el.btnDica.disabled = false;
    this.posicoes = this.estado.letrasDaPalavra(indice).map(x => ({ letra: x.letra, fixa: x.fixa, certa: false }));
    this.el.entrada.value = '';
    this._renderizar();
    // Foca depois que a tecla que abriu o painel (E/Enter) terminar de ser processada,
    // senão a letra "E" entraria na primeira casinha.
    setTimeout(() => { if (this.aberto) { this.el.entrada.value = ''; this.el.entrada.focus({ preventScroll: true }); } }, 40);
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    this.el.raiz.hidden = true;
    this.cb.aoFechar?.();
  }

  /** Atualiza as casas fixas (ex.: cruzamento revelado enquanto o painel está aberto). */
  atualizarFixas() {
    if (!this.aberto) return;
    const atual = this.estado.letrasDaPalavra(this.indice);
    this.posicoes.forEach((pos, k) => { if (atual[k].fixa) { pos.letra = atual[k].letra; pos.fixa = true; pos.certa = false; } });
    this._sincronizarEntrada();
    this._renderizar();
  }

  _editaveis() { return this.posicoes.filter(p => !p.fixa); }

  /** Distribui o texto digitado nas casas editáveis. */
  _lerEntrada() {
    const letras = letrasExibidas(this.el.entrada.value);
    const edit = this._editaveis();
    edit.forEach((pos, k) => { pos.letra = letras[k] || null; if (!letras[k]) pos.certa = false; });
    // Mantém o campo só com letras válidas (sem números/símbolos)
    const limpo = letras.slice(0, edit.length).join('');
    if (this.el.entrada.value !== limpo) this.el.entrada.value = limpo;
    this._renderizar();
  }

  _sincronizarEntrada() {
    this.el.entrada.value = this._editaveis().map(p => p.letra || '').join('');
  }

  _renderizar() {
    const cont = this.el.casinhas;
    cont.innerHTML = '';
    let cursorFeito = false;
    this.posicoes.forEach((pos, k) => {
      const d = document.createElement('div');
      d.className = 'casinha' + (pos.fixa ? ' fixa' : '') + (pos.certa ? ' certa' : '');
      if (!pos.fixa && !pos.letra && !cursorFeito) { d.classList.add('cursor'); cursorFeito = true; }
      d.textContent = pos.letra || '';
      d.setAttribute('aria-label', pos.fixa ? `Casa ${k + 1}: ${pos.letra}, já preenchida` : `Casa ${k + 1}${pos.letra ? ': ' + pos.letra : ', vazia'}`);
      cont.appendChild(d);
    });
  }

  responder() {
    if (!this.aberto || this.bloqueado) return;
    const faltam = this.posicoes.filter(p => !p.letra).length;
    if (faltam > 0) { this._mensagem(mensagem('incompleto')); this.el.entrada.focus({ preventScroll: true }); return; }
    const letras = this.posicoes.map(p => p.letra);
    const r = this.cb.aoResponder(this.indice, letras);
    if (r.certa) {
      this.bloqueado = true;
      this.posicoes.forEach(p => { p.certa = true; });
      this._renderizar();
      this.el.casinhas.classList.add('acertou');
      this._mensagem(r.mensagem || mensagem('acerto'));
      setTimeout(() => { this.el.casinhas.classList.remove('acertou'); this.fechar(); }, 1100);
    } else {
      // Letras na posição certa ficam (douradas); as outras "quicam" de volta
      this.posicoes.forEach((p, k) => {
        if (p.fixa) return;
        if (r.posicoes[k]) p.certa = true;
        else { p.certa = false; p.letra = null; }
      });
      this._sincronizarEntrada();
      this._renderizar();
      this.el.casinhas.classList.remove('quicar');
      void this.el.casinhas.offsetWidth;
      this.el.casinhas.classList.add('quicar');
      this._mensagem(mensagem('quase'));
      this.el.entrada.focus({ preventScroll: true });
    }
  }

  pedirDica() {
    if (!this.aberto || this.bloqueado) return;
    const r = this.cb.aoDica(this.indice);
    if (!r) return;
    this._mensagem(mensagem('dica'));
    this.atualizarFixas();
    if (this.estado.resolvidas.has(this.indice)) {
      this.bloqueado = true;
      this.el.casinhas.classList.add('acertou');
      setTimeout(() => { this.el.casinhas.classList.remove('acertou'); this.fechar(); }, 1100);
    } else {
      this.el.entrada.focus({ preventScroll: true });
    }
  }

  _mensagem(txt) { this.el.mensagem.textContent = txt; }

  _textoParaOuvir() {
    const p = this.estado.palavras[this.indice];
    const n = p.letras.length;
    return `Palavra ${p.numero}, ${p.direcao === 'h' ? 'horizontal' : 'vertical'}, ${n} letras. ${p.dica}`;
  }
}
