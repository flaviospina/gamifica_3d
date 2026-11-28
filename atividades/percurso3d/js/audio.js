// ============================================================
//  js/audio.js — Sons sintetizados (Web Audio), sem arquivos.
// ============================================================
import { prefs } from './util.js';

export class Audio {
  constructor() { this.ligado = prefs.ler('som', true); this.ctx = null; }
  _ctx() {
    if (!this.ligado) return null;
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  ligar(v) { this.ligado = v; prefs.gravar('som', v); }
  _nota(freq, dur = 0.12, tipo = 'sine', vol = 0.12, atraso = 0, desliza = 0) {
    const c = this._ctx(); if (!c) return;
    const t = c.currentTime + atraso, o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    if (desliza) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * desliza), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  clique() { this._nota(520, 0.05, 'triangle', 0.06); }
  dado() { for (let i = 0; i < 7; i++) this._nota(180 + Math.random() * 240, 0.05, 'square', 0.04, i * 0.08); }
  dadoFim(n) { this._nota(440 + n * 40, 0.16, 'triangle', 0.12); }
  passo() { this._nota(300, 0.05, 'triangle', 0.05, 0, 1.4); }
  carta() { this._nota(660, 0.09, 'triangle', 0.1); this._nota(880, 0.12, 'triangle', 0.1, 0.08); }
  acerto() { [523, 659, 784].forEach((f, i) => this._nota(f, 0.14, 'triangle', 0.12, i * 0.09)); }
  quase() { this._nota(330, 0.16, 'sine', 0.09); this._nota(294, 0.2, 'sine', 0.09, 0.12); }
  estrela() { this._nota(1175, 0.1, 'sine', 0.1); this._nota(1568, 0.18, 'sine', 0.1, 0.07); }
  pontos() { this._nota(784, 0.07, 'square', 0.05); this._nota(988, 0.1, 'square', 0.05, 0.06); }
  recuo() { this._nota(392, 0.14, 'sine', 0.08, 0, 0.75); }
  obra() { [262, 330, 392, 523].forEach((f, i) => this._nota(f, 0.12, 'square', 0.05, i * 0.07)); }
  volta() { [523, 659, 784, 1047, 1319].forEach((f, i) => this._nota(f, 0.2, 'triangle', 0.12, i * 0.1)); }
  fim() { [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => this._nota(f, 0.24, 'triangle', 0.13, i * 0.14)); }
}
