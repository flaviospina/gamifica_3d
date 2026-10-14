// ============================================================
//  js/avatar.js — Tela de personalização do explorador
//  (cor da roupa, do cabelo, tom de pele e acessório).
//  A escolha é salva localmente; a fase 5 grava no perfil do aluno.
// ============================================================
import { OPCOES_AVATAR, AVATAR_PADRAO } from './personagem.js';
import { prefs } from './util.js';

const ROTULOS = {
  roupa: 'Cor da roupa', cabelo: 'Cor do cabelo', pele: 'Tom de pele', acessorio: 'Acessório',
};
const NOMES_ACESSORIO = { nenhum: 'Nenhum', chapeu: 'Chapéu de explorador', oculos: 'Óculos', mochila: 'Mochila' };
const NOMES_COR = {
  '#E0A537': 'dourado', '#286456': 'verde', '#3B7DD8': 'azul', '#D8553B': 'laranja', '#8E5BD8': 'roxo', '#2BB5A0': 'turquesa',
  '#2B1A0E': 'castanho escuro', '#6B3E1E': 'castanho', '#C98A3C': 'ruivo', '#E8D27A': 'loiro', '#8A8A8A': 'grisalho', '#D84B8E': 'rosa',
  '#F6D3B5': 'claro', '#E8B894': 'claro-médio', '#C68E63': 'médio', '#8D5A3B': 'escuro-médio', '#5C3A25': 'escuro',
};

export class TelaAvatar {
  /**
   * @param el  { raiz, opcoes, btnComecar, btnAleatorio }
   * @param cb  { aoMudar(visual), aoConfirmar(visual) }
   */
  constructor(el, visualInicial, cb) {
    this.el = el;
    this.cb = cb;
    this.visual = { ...AVATAR_PADRAO, ...(visualInicial || {}) };
    this.aberta = false;
    this._montar();
    el.btnComecar.addEventListener('click', () => this.confirmar());
    el.btnAleatorio.addEventListener('click', () => this.aleatorio());
    el.raiz.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); this.confirmar(); } });
  }

  static carregarSalvo() { return prefs.ler('avatar', null); }

  _montar() {
    const cont = this.el.opcoes;
    cont.innerHTML = '';
    for (const [chave, lista] of Object.entries(OPCOES_AVATAR)) {
      const grupo = document.createElement('fieldset');
      grupo.className = 'av-grupo';
      const leg = document.createElement('legend'); leg.textContent = ROTULOS[chave]; grupo.appendChild(leg);
      const linha = document.createElement('div'); linha.className = 'av-linha'; linha.setAttribute('role', 'radiogroup');
      for (const valor of lista) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'av-opcao' + (chave === 'acessorio' ? ' texto' : '');
        b.dataset.chave = chave; b.dataset.valor = valor;
        b.setAttribute('role', 'radio');
        if (chave === 'acessorio') b.textContent = NOMES_ACESSORIO[valor] || valor;
        else { b.style.background = valor; b.setAttribute('aria-label', NOMES_COR[valor] || valor); b.title = NOMES_COR[valor] || valor; }
        b.addEventListener('click', () => this._escolher(chave, valor));
        linha.appendChild(b);
      }
      grupo.appendChild(linha);
      cont.appendChild(grupo);
    }
    this._refletir();
  }

  _refletir() {
    this.el.opcoes.querySelectorAll('.av-opcao').forEach(b => {
      const sel = this.visual[b.dataset.chave] === b.dataset.valor;
      b.classList.toggle('selecionada', sel);
      b.setAttribute('aria-checked', sel ? 'true' : 'false');
      b.tabIndex = sel ? 0 : -1;
    });
  }

  _escolher(chave, valor) {
    this.visual[chave] = valor;
    this._refletir();
    this.cb.aoMudar?.(this.visual);
  }

  aleatorio() {
    for (const [chave, lista] of Object.entries(OPCOES_AVATAR)) this.visual[chave] = lista[Math.floor(Math.random() * lista.length)];
    this._refletir();
    this.cb.aoMudar?.(this.visual);
  }

  abrir() {
    this.aberta = true;
    this.el.raiz.hidden = false;
    this._refletir();
    this.el.opcoes.querySelector('.av-opcao.selecionada')?.focus();
  }

  confirmar() {
    if (!this.aberta) return;
    this.aberta = false;
    this.el.raiz.hidden = true;
    prefs.gravar('avatar', this.visual);
    prefs.gravar('avatarConfirmado', true);
    this.cb.aoConfirmar?.(this.visual);
  }
}
