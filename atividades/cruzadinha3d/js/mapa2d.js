// ============================================================
//  js/mapa2d.js — Modo mapa 2D: cruzadinha tradicional, clicável,
//  totalmente navegável por teclado. Mesma lógica e pontuação do 3D.
// ============================================================
import { chaveCelula } from './cruzadinha.js';
import { mensagem } from './mensagens.js';

export class Mapa2D {
  /**
   * @param el  { raiz, grade, pistasH, pistasV, btnFechar, status }
   * @param cb  { aoAbrirPalavra(indice), faltam(indice) → número (0 = liberada), aoFechar() }
   */
  constructor(el, estado, layout, cb) {
    this.el = el; this.estado = estado; this.layout = layout; this.cb = cb;
    this.aberto = false;
    this._ultimaCelula = null;
    this._alternar = false;
    el.btnFechar.addEventListener('click', () => this.fechar());
    el.raiz.addEventListener('keydown', (ev) => this._teclado(ev));
    this._montar();
  }

  _montar() {
    const { linhas, colunas } = this.layout;
    const tabela = this.el.grade;
    tabela.innerHTML = '';
    tabela.setAttribute('aria-label', 'Grade da cruzadinha');
    const inicios = new Map();
    for (const p of this.layout.palavras) {
      const ch = chaveCelula(p.linha, p.coluna);
      if (!inicios.has(ch)) inicios.set(ch, p.numero);
    }
    this.botoes = new Map();
    for (let l = 0; l < linhas; l++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < colunas; c++) {
        const td = document.createElement('td');
        const ch = chaveCelula(l, c);
        const cel = this.estado.celulas.get(ch);
        if (cel) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'cel2d'; b.dataset.l = l; b.dataset.c = c; b.tabIndex = -1;
          if (inicios.has(ch)) { const n = document.createElement('sup'); n.textContent = inicios.get(ch); b.appendChild(n); }
          const span = document.createElement('span'); span.className = 'letra'; b.appendChild(span);
          b.addEventListener('click', () => this._clicar(l, c));
          td.appendChild(b);
          this.botoes.set(ch, b);
        } else td.className = 'vazia';
        tr.appendChild(td);
      }
      tabela.appendChild(tr);
    }
    // Pistas
    const monta = (cont, dir) => {
      cont.innerHTML = '';
      const lista = this.layout.palavras.filter(p => p.direcao === dir).sort((a, b) => a.numero - b.numero);
      for (const p of lista) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pista2d'; b.dataset.indice = p.indice;
        b.addEventListener('click', () => this._abrirPalavra(p.indice));
        cont.appendChild(b);
      }
    };
    monta(this.el.pistasH, 'h'); monta(this.el.pistasV, 'v');
    this.atualizar();
  }

  /** Reflete o estado atual (letras conhecidas, resolvidas, trancadas). */
  atualizar() {
    for (const [ch, b] of this.botoes) {
      const cel = this.estado.celulas.get(ch);
      const letra = this.estado.reveladas.has(ch) ? cel.letra : '';
      b.querySelector('.letra').textContent = letra;
      const resolvida = cel.palavras.every(i => this.estado.resolvidas.has(i));
      b.classList.toggle('revelada', !!letra);
      b.classList.toggle('resolvida', resolvida);
      const pal = cel.palavras.map(i => this.layout.palavras[i]).map(p => `${p.numero} ${p.direcao === 'h' ? 'horizontal' : 'vertical'}`).join(' e ');
      b.setAttribute('aria-label', `Linha ${cel.l + 1}, coluna ${cel.c + 1}${letra ? ', letra ' + letra : ', vazia'}. Palavra ${pal}.`);
    }
    for (const b of this.el.raiz.querySelectorAll('.pista2d')) {
      const p = this.layout.palavras[+b.dataset.indice];
      const resolvida = this.estado.resolvidas.has(p.indice);
      const faltam = this.cb.faltam(p.indice);
      const estado = resolvida ? '✅ ' : faltam > 0 ? '🔒 ' : '';
      b.innerHTML = `<b>${p.numero}.</b> ${estado}<span>${escapar(p.dica)}</span> <small>(${p.letras.length} letras)</small>`;
      b.classList.toggle('resolvida', resolvida);
      b.classList.toggle('trancada', faltam > 0 && !resolvida);
      b.setAttribute('aria-label', `${p.numero} ${p.direcao === 'h' ? 'horizontal' : 'vertical'}: ${p.dica}. ${p.letras.length} letras.${resolvida ? ' Resolvida.' : faltam > 0 ? ` Faltam ${faltam} palavras para liberar.` : ''}`);
    }
    // Foco inicial (roving tabindex)
    const primeiro = [...this.botoes.values()][0];
    if (primeiro && ![...this.botoes.values()].some(b => b.tabIndex === 0)) primeiro.tabIndex = 0;
    const r = this.estado.resolvidas.size, t = this.estado.total;
    this.el.status.textContent = `${r} de ${t} palavras resolvidas · ${this.estado.estrelas} estrelas`;
  }

  _clicar(l, c) {
    const cel = this.estado.celulas.get(chaveCelula(l, c));
    const candidatas = cel.palavras.filter(i => !this.estado.resolvidas.has(i));
    let indice;
    if (candidatas.length === 0) indice = cel.palavras[0];
    else if (candidatas.length === 1) indice = candidatas[0];
    else {
      // Célula de cruzamento: alterna entre as duas palavras a cada clique
      const mesma = this._ultimaCelula === chaveCelula(l, c);
      this._alternar = mesma ? !this._alternar : false;
      const h = candidatas.find(i => this.layout.palavras[i].direcao === 'h');
      const v = candidatas.find(i => this.layout.palavras[i].direcao === 'v');
      indice = this._alternar ? (v ?? h) : (h ?? v);
    }
    this._ultimaCelula = chaveCelula(l, c);
    this._focar(l, c);
    this._abrirPalavra(indice);
  }

  _abrirPalavra(indice) {
    if (this.estado.resolvidas.has(indice)) { this._status('Essa palavra já está no lugar! ✅'); return; }
    const faltam = this.cb.faltam(indice);
    if (faltam > 0) { this._status(mensagem('totemFechado', faltam).replace('este totem descer', 'liberar esta palavra')); return; }
    this.cb.aoAbrirPalavra(indice);
  }

  _status(txt) { this.el.status.textContent = txt; }

  _focar(l, c) {
    const b = this.botoes.get(chaveCelula(l, c));
    if (!b) return false;
    for (const x of this.botoes.values()) x.tabIndex = -1;
    b.tabIndex = 0; b.focus();
    return true;
  }

  /** Setas movem entre células (pulando as vazias); Enter/Espaço ativam. */
  _teclado(ev) {
    const alvo = ev.target;
    if (!alvo.classList?.contains('cel2d')) return;
    const dl = { ArrowUp: -1, ArrowDown: 1 }[ev.key] ?? 0;
    const dc = { ArrowLeft: -1, ArrowRight: 1 }[ev.key] ?? 0;
    if (!dl && !dc) return;
    ev.preventDefault();
    let l = +alvo.dataset.l, c = +alvo.dataset.c;
    for (let k = 0; k < Math.max(this.layout.linhas, this.layout.colunas); k++) {
      l += dl; c += dc;
      if (l < 0 || c < 0 || l >= this.layout.linhas || c >= this.layout.colunas) return;
      if (this._focar(l, c)) return;
    }
  }

  abrir() {
    this.aberto = true;
    this.el.raiz.hidden = false;
    this.atualizar();
    this._ajustarTamanho();
    (this.el.raiz.querySelector('.cel2d[tabindex="0"]') || this.el.btnFechar).focus();
  }

  /** Casas menores quando a grade não cabe na largura (celular). */
  _ajustarTamanho() {
    const painel = this.el.raiz.querySelector('.painel');
    const estreito = matchMedia('(max-width: 760px)').matches;
    const largura = estreito ? (painel.clientWidth || window.innerWidth - 40) - 48 : 480;
    const cel = Math.max(24, Math.min(40, Math.floor((largura - 3 * (this.layout.colunas + 1)) / this.layout.colunas)));
    painel.style.setProperty('--cel2d', cel + 'px');
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    this.el.raiz.hidden = true;
    this.cb.aoFechar?.();
  }
}

function escapar(t) { return String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
