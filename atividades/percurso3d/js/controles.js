// ============================================================
//  js/controles.js — Teclado e toque para dirigir o carrinho.
//  ↑ / W / botão Acelerar: anda · ← → / A D: muda de faixa
//  Espaço / Enter: joga o dado (tratado pela partida via aoAcao)
// ============================================================
import { $ } from './util.js';

export class Controles {
  constructor() {
    this.acelerar = false; this.re = false; this.esquerda = false; this.direita = false;
    this.aoAcao = null;       // Espaço/Enter
    this.aoVista = null;      // V
    this.aoMenu = null;       // Esc
    this.bloqueado = false;   // true quando um cartão/modal está aberto
    const mapa = { ArrowUp: 'acelerar', KeyW: 'acelerar', ArrowDown: 're', KeyS: 're', ArrowLeft: 'esquerda', KeyA: 'esquerda', ArrowRight: 'direita', KeyD: 'direita' };
    window.addEventListener('keydown', (ev) => {
      if (ev.target?.tagName === 'INPUT' || ev.target?.tagName === 'SELECT' || ev.target?.tagName === 'TEXTAREA') return;
      if (mapa[ev.code]) { if (!this.bloqueado) this[mapa[ev.code]] = true; ev.preventDefault(); return; }
      if (ev.repeat) return;
      if (ev.code === 'Escape') { this.aoMenu?.(); return; }
      if (this.bloqueado) return;
      if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); this.aoAcao?.(); }
      if (ev.code === 'KeyV') this.aoVista?.();
    });
    window.addEventListener('keyup', (ev) => { if (mapa[ev.code]) this[mapa[ev.code]] = false; });
    window.addEventListener('blur', () => this.soltar());
    // Toque: botões com pointer events (segurar = andar)
    const segurar = (id, prop) => {
      const el = $(id); if (!el) return;
      const liga = (ev) => { ev.preventDefault(); if (!this.bloqueado) this[prop] = true; el.classList.add('ativo'); };
      const desliga = () => { this[prop] = false; el.classList.remove('ativo'); };
      el.addEventListener('pointerdown', liga); el.addEventListener('pointerup', desliga); el.addEventListener('pointercancel', desliga); el.addEventListener('pointerleave', desliga);
      el.addEventListener('contextmenu', (ev) => ev.preventDefault());
    };
    segurar('btnAcelerar', 'acelerar'); segurar('btnEsq', 'esquerda'); segurar('btnDir', 'direita');
  }
  soltar() { this.acelerar = this.re = this.esquerda = this.direita = false; }
}
