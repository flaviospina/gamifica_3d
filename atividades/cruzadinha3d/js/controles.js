// ============================================================
//  js/controles.js — Teclado, mouse e toque (joystick + botões)
//  Expõe um estado único lido a cada frame:
//    eixo {x, y}  (bruto: x = direita, y = frente, ambos -1..1)
//    pular, interagir (edge: verdadeiro só no frame em que acionou)
//  e eventos de câmera (girar/zoom) e de menu (Esc).
// ============================================================
import { ehToque, clamp } from './util.js';
import { CONFIG } from './config.js';

export class Controles {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui; // { joystick, joystickPino, btnPular, btnInteragir, areaToque }
    this.teclas = new Set();
    this.eixoJoystick = { x: 0, y: 0 };
    this._pularPendente = false;
    this._interagirPendente = false;
    this.pular = false;
    this.interagir = false;
    this.ouvintes = { girar: [], zoom: [], menu: [], interagir: [] };
    this.ativo = true;          // falso quando um campo de texto está em foco
    this.toque = ehToque();

    this._teclado();
    this._ponteiro();
    this._joystick();
    this._botoes();
  }

  on(nome, fn) { this.ouvintes[nome].push(fn); }
  _emitir(nome, ...args) { for (const f of this.ouvintes[nome]) f(...args); }

  get eixo() {
    let x = 0, y = 0;
    if (this.ativo) {
      if (this.teclas.has('KeyA') || this.teclas.has('ArrowLeft'))  x -= 1;
      if (this.teclas.has('KeyD') || this.teclas.has('ArrowRight')) x += 1;
      if (this.teclas.has('KeyW') || this.teclas.has('ArrowUp'))    y += 1;
      if (this.teclas.has('KeyS') || this.teclas.has('ArrowDown'))  y -= 1;
    }
    x += this.eixoJoystick.x; y += this.eixoJoystick.y;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  /** Chamar uma vez por frame: converte "pendentes" em flags de um frame. */
  iniciarFrame() {
    this.pular = this._pularPendente; this._pularPendente = false;
    this.interagir = this._interagirPendente; this._interagirPendente = false;
  }

  // ── Teclado ─────────────────────────────────────────────────
  _teclado() {
    const emCampo = (ev) => /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target?.tagName || '') || ev.target?.isContentEditable;
    window.addEventListener('keydown', (ev) => {
      if (ev.code === 'Escape') { this._emitir('menu'); return; }
      if (emCampo(ev)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) ev.preventDefault();
      if (ev.repeat) return;
      this.teclas.add(ev.code);
      if (ev.code === 'Space') this._pularPendente = true;
      if (ev.code === 'KeyE' || ev.code === 'Enter') { this._interagirPendente = true; this._emitir('interagir'); }
    });
    window.addEventListener('keyup', (ev) => this.teclas.delete(ev.code));
    window.addEventListener('blur', () => this.teclas.clear());
  }

  // ── Mouse / toque na tela: girar e zoom ─────────────────────
  _ponteiro() {
    const C = CONFIG.camera;
    const ativos = new Map(); // pointerId → {x, y}
    let distPinch = 0;
    const el = this.canvas;

    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === 'mouse') return;
      ativos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      el.setPointerCapture?.(ev.pointerId);
      if (ativos.size === 2) {
        const [a, b] = [...ativos.values()];
        distPinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    el.addEventListener('pointermove', (ev) => {
      const p = ativos.get(ev.pointerId);
      if (!p) return;
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
      p.x = ev.clientX; p.y = ev.clientY;
      if (ativos.size === 1) {
        const s = ev.pointerType === 'mouse' ? C.sensMouse : C.sensToque;
        this._emitir('girar', dx * s, -dy * s);
      } else if (ativos.size === 2) {
        const [a, b] = [...ativos.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distPinch) this._emitir('zoom', (distPinch - d) * 0.02);
        distPinch = d;
      }
    });
    const soltar = (ev) => { ativos.delete(ev.pointerId); distPinch = 0; };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    el.addEventListener('wheel', (ev) => { ev.preventDefault(); this._emitir('zoom', Math.sign(ev.deltaY) * 0.6); }, { passive: false });
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  // ── Joystick virtual ────────────────────────────────────────
  _joystick() {
    const { joystick, joystickPino } = this.ui;
    if (!joystick) return;
    let idAtivo = null, cx = 0, cy = 0;
    const raio = 42;
    const mover = (ev) => {
      const dx = clamp(ev.clientX - cx, -raio, raio), dy = clamp(ev.clientY - cy, -raio, raio);
      const m = Math.hypot(dx, dy);
      const k = m > raio ? raio / m : 1;
      joystickPino.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      this.eixoJoystick.x = (dx * k) / raio;
      this.eixoJoystick.y = -(dy * k) / raio;
    };
    joystick.addEventListener('pointerdown', (ev) => {
      if (idAtivo !== null) return;
      idAtivo = ev.pointerId;
      joystick.setPointerCapture(ev.pointerId);
      const r = joystick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      joystick.classList.add('ativo');
      mover(ev);
      ev.preventDefault();
    });
    joystick.addEventListener('pointermove', (ev) => { if (ev.pointerId === idAtivo) mover(ev); });
    const soltar = (ev) => {
      if (ev.pointerId !== idAtivo) return;
      idAtivo = null;
      this.eixoJoystick.x = 0; this.eixoJoystick.y = 0;
      joystickPino.style.transform = '';
      joystick.classList.remove('ativo');
    };
    joystick.addEventListener('pointerup', soltar);
    joystick.addEventListener('pointercancel', soltar);
  }

  _botoes() {
    const { btnPular, btnInteragir } = this.ui;
    const liga = (btn, fn) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); btn.classList.add('ativo'); fn(); });
      const off = () => btn.classList.remove('ativo');
      btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off);
    };
    liga(btnPular, () => { this._pularPendente = true; });
    liga(btnInteragir, () => { this._interagirPendente = true; this._emitir('interagir'); });
  }
}
