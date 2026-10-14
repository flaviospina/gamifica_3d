// ============================================================
//  js/audio.js — Sons gerados por Web Audio API (sem arquivos).
//  Volume baixo por padrão (sala de aula). Música ambiente opcional.
//  Todos os sons são suaves: nada de "buzina de erro".
// ============================================================
import { prefs } from './util.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.somLigado = prefs.ler('som', true);
    this.musicaLigada = prefs.ler('musica', false);
    this.volume = 0.35;
    this._passoAlt = false;
    this._musica = null;
    // O navegador só libera áudio após um gesto do usuário
    const ligar = () => { this._garantir(); if (this.musicaLigada) this.iniciarMusica(); };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, ligar, { once: true, passive: true });
  }

  _garantir() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.ganhoSons = this.ctx.createGain();
    this.ganhoSons.gain.value = this.somLigado ? 1 : 0;
    this.ganhoSons.connect(this.master);
    this.ganhoMusica = this.ctx.createGain();
    this.ganhoMusica.gain.value = 0;
    this.ganhoMusica.connect(this.master);
    return this.ctx;
  }

  ligarSom(v) { this.somLigado = v; prefs.gravar('som', v); if (this.ganhoSons) this.ganhoSons.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.05); }
  ligarMusica(v) { this.musicaLigada = v; prefs.gravar('musica', v); if (v) this.iniciarMusica(); else this.pararMusica(); }

  // ── Primitivas ───────────────────────────────────────────────
  _tom({ freq = 440, tipo = 'sine', dur = 0.2, ganho = 0.3, atraso = 0, para = null, curva = 0.9 }) {
    const ctx = this._garantir(); if (!ctx || !this.somLigado) return;
    const t0 = ctx.currentTime + atraso;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t0);
    if (para) o.frequency.exponentialRampToValueAtTime(para, t0 + dur * curva);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(ganho, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ganhoSons);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  _ruido({ dur = 0.08, ganho = 0.2, freq = 1200, q = 1, atraso = 0 }) {
    const ctx = this._garantir(); if (!ctx || !this.somLigado) return;
    const t0 = ctx.currentTime + atraso;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(ganho, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.ganhoSons);
    src.start(t0);
  }

  // ── Sons do jogo ─────────────────────────────────────────────
  passo() { this._passoAlt = !this._passoAlt; this._ruido({ dur: 0.07, ganho: 0.12, freq: this._passoAlt ? 900 : 1100, q: 0.8 }); }
  pulo() { this._tom({ freq: 320, para: 640, tipo: 'sine', dur: 0.18, ganho: 0.18 }); }
  pouso() { this._tom({ freq: 160, para: 90, tipo: 'sine', dur: 0.14, ganho: 0.2 }); this._ruido({ dur: 0.05, ganho: 0.1, freq: 600 }); }
  agua() { this._ruido({ dur: 0.35, ganho: 0.18, freq: 500, q: 0.5 }); this._tom({ freq: 500, para: 180, tipo: 'sine', dur: 0.35, ganho: 0.12 }); }
  clique() { this._tom({ freq: 880, tipo: 'triangle', dur: 0.06, ganho: 0.12 }); }
  abrirPainel() { this._tom({ freq: 520, para: 780, tipo: 'triangle', dur: 0.16, ganho: 0.14 }); }
  fecharPainel() { this._tom({ freq: 700, para: 480, tipo: 'triangle', dur: 0.14, ganho: 0.12 }); }
  tecla() { this._tom({ freq: 1200 + Math.random() * 200, tipo: 'triangle', dur: 0.045, ganho: 0.08 }); }
  /** Letra encaixando no bloco (varia um pouco a cada vez). */
  encaixe(k = 0) {
    const base = 480 + (k % 5) * 40;
    this._tom({ freq: base, para: base * 0.75, tipo: 'triangle', dur: 0.14, ganho: 0.22 });
    this._ruido({ dur: 0.04, ganho: 0.14, freq: 2500, q: 1.5 });
  }
  /** Palavra certa: arpejo alegre. */
  acerto() {
    [523, 659, 784, 1047].forEach((f, i) => this._tom({ freq: f, tipo: 'sine', dur: 0.28, ganho: 0.2, atraso: i * 0.09 }));
    [523, 659, 784, 1047].forEach((f, i) => this._tom({ freq: f * 2, tipo: 'triangle', dur: 0.2, ganho: 0.05, atraso: i * 0.09 }));
  }
  estrela() { [1760, 2217, 2637, 3520].forEach((f, i) => this._tom({ freq: f, tipo: 'sine', dur: 0.25, ganho: 0.1, atraso: 0.35 + i * 0.07 })); }
  /** Resposta errada: duas notinhas suaves descendo, como um "hum, quase". */
  quase() { this._tom({ freq: 392, tipo: 'sine', dur: 0.22, ganho: 0.13 }); this._tom({ freq: 349, tipo: 'sine', dur: 0.3, ganho: 0.12, atraso: 0.18 }); }
  dica() { this._tom({ freq: 880, para: 1320, tipo: 'sine', dur: 0.2, ganho: 0.15 }); }
  zona() { [392, 523, 659, 784, 1047].forEach((f, i) => this._tom({ freq: f, tipo: 'triangle', dur: 0.4, ganho: 0.16, atraso: i * 0.11 })); }
  celebracao() {
    const acordes = [[523, 659, 784], [587, 740, 880], [659, 784, 988], [784, 988, 1175, 1568]];
    acordes.forEach((ac, i) => ac.forEach(f => this._tom({ freq: f, tipo: 'triangle', dur: 0.6, ganho: 0.12, atraso: i * 0.32 })));
    [1047, 1319, 1568, 2093].forEach((f, i) => this._tom({ freq: f, tipo: 'sine', dur: 0.5, ganho: 0.14, atraso: 1.4 + i * 0.1 }));
  }

  // ── Música ambiente generativa (suave, pentatônica) ──────────
  iniciarMusica() {
    const ctx = this._garantir(); if (!ctx || this._musica) return;
    const acordes = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]];
    const escala = [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5];
    const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 520; filtro.Q.value = 0.6;
    filtro.connect(this.ganhoMusica);
    const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
    lfo.frequency.value = 0.08; lfoG.gain.value = 140; lfo.connect(lfoG).connect(filtro.frequency); lfo.start();
    const vozes = [];
    let passo = 0;
    const tocarAcorde = () => {
      const ac = acordes[passo % acordes.length];
      const t = ctx.currentTime;
      vozes.forEach(v => { v.g.gain.setTargetAtTime(0.0001, t, 0.6); v.o.stop(t + 2.5); });
      vozes.length = 0;
      ac.forEach((f, i) => {
        for (const det of [-4, 4]) {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + i * 2;
          g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(0.045, t, 0.9);
          o.connect(g).connect(filtro); o.start(t);
          vozes.push({ o, g });
        }
      });
      passo++;
    };
    const melodia = () => {
      if (Math.random() < 0.55) {
        const f = escala[Math.floor(Math.random() * escala.length)];
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g).connect(this.ganhoMusica); o.start(t); o.stop(t + 1);
      }
    };
    tocarAcorde();
    this._musica = {
      acorde: setInterval(tocarAcorde, 4000),
      melodia: setInterval(melodia, 750),
      vozes, lfo, filtro,
    };
    this.ganhoMusica.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
  }

  pararMusica() {
    if (!this._musica || !this.ctx) return;
    const m = this._musica; this._musica = null;
    clearInterval(m.acorde); clearInterval(m.melodia);
    const t = this.ctx.currentTime;
    this.ganhoMusica.gain.setTargetAtTime(0, t, 0.5);
    setTimeout(() => { m.vozes.forEach(v => { try { v.o.stop(); } catch { /* já parou */ } }); try { m.lfo.stop(); } catch { /* idem */ } }, 2500);
  }
}
