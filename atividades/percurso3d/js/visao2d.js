// ============================================================
//  js/visao2d.js — Mapa 2D da cidade em canvas. Serve de minimapa
//  no jogo 3D e de tela principal quando o aparelho não tem WebGL.
//  Usa a mesma pista e as mesmas regras.
// ============================================================
import { BAIRROS, CORES_JOGADORES } from './config.js';
import { TIPOS } from './cartas.js';

export class Visao2D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./pista.js').Pista} pista
   * @param {{cartas:string[], rotulos?:boolean, cheia?:boolean}} o
   */
  constructor(canvas, pista, { cartas, rotulos = false, cheia = false }) {
    this.tipo = '2d';
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.pista = pista; this.cartas = cartas;
    this.rotulos = rotulos; this.cheia = cheia;
    this.reveladas = new Map([[0, 'largada']]); this.carros = new Map(); this.obras = [];
    this.destaque = null; this.foco = null; this.tempo = 0;
    this._a = {};
    this.redimensionar();
  }

  redimensionar() {
    const cv = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cheia ? window.innerWidth : cv.clientWidth || 180, h = this.cheia ? window.innerHeight : cv.clientHeight || 180;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    if (this.cheia) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    this.w = cv.width; this.h = cv.height; this.dpr = dpr;
    // Mundo de -33..33 nos dois eixos, com folga para a HUD na tela cheia
    const margemTopo = this.cheia ? 90 * dpr : 0, margemBase = this.cheia ? 110 * dpr : 0;
    const util = Math.min(this.w, this.h - margemTopo - margemBase);
    this.esc = util / 68; this.ox = this.w / 2; this.oy = margemTopo + (this.h - margemTopo - margemBase) / 2;
  }

  _xy(x, z) { return [this.ox + x * this.esc, this.oy + z * this.esc]; }

  definirCarros(jogadores) { for (const j of jogadores) this.carros.set(j.id, { cor: CORES_JOGADORES[j.cor % CORES_JOGADORES.length].hex, letra: (j.nome[0] || '?').toUpperCase(), s: 0, faixa: 0 }); }
  posicionar(id, s, faixa = 0) { const c = this.carros.get(id); if (c) { c.s = s; c.faixa = faixa; } }
  focar(id) { this.foco = id; }
  visaoGeral() {}
  revelarCasa(k, tipo) { this.reveladas.set(k, tipo); }
  destacarCasa(k) { this.destaque = k; }
  adicionarObra(obra, nome, cor) { const a = this.pista.amostra(obra.casa); const o = { x: a.p.x + a.l.x * 5, z: a.p.z + a.l.z * 5, cor: CORES_JOGADORES[cor % CORES_JOGADORES.length].hex, nivel: obra.nivel, nome }; this.obras.push(o); return o; }
  comemorar() {}

  render(dt) {
    this.tempo += dt;
    const { ctx: c, pista, esc } = this, N = pista.N;
    c.clearRect(0, 0, this.w, this.h);
    if (this.cheia) { const g = c.createLinearGradient(0, 0, 0, this.h); g.addColorStop(0, '#163F85'); g.addColorStop(1, '#1F4E9A'); c.fillStyle = g; c.fillRect(0, 0, this.w, this.h); }
    // Base e grama
    const [bx, by] = this._xy(-32, -32), lado = 64 * esc;
    c.fillStyle = '#1F4E9A'; c.beginPath(); c.roundRect(bx - 1.2 * esc, by - 1.2 * esc, lado + 2.4 * esc, lado + 2.4 * esc, 2.5 * esc); c.fill();
    c.fillStyle = '#6FBF4A'; c.beginPath(); c.roundRect(bx, by, lado, lado, 1.5 * esc); c.fill();
    // Lago
    { const [lx, ly] = this._xy(-16, -1); c.fillStyle = '#E8D9B0'; c.beginPath(); c.ellipse(lx, ly, 7 * esc, 4.9 * esc, 0, 0, 6.3); c.fill(); c.fillStyle = '#3DA6D9'; c.beginPath(); c.ellipse(lx, ly, 6.2 * esc, 4.3 * esc, 0, 0, 6.3); c.fill(); }
    // Pista: primeiro o trecho do chão, depois o viaduto por cima (com contorno, para ler o cruzamento)
    const traco = (filtro, cor, larg) => {
      c.strokeStyle = cor; c.lineWidth = larg * esc; c.lineCap = 'round'; c.lineJoin = 'round';
      let aberto = false; c.beginPath();
      for (let i = 0; i <= N; i += 2) {
        const k = i % N, p = pista.centro[k];
        if (!filtro(k)) { aberto = false; continue; }
        const [x, y] = this._xy(p.x, p.z);
        if (!aberto) { c.moveTo(x, y); aberto = true; } else c.lineTo(x, y);
      }
      c.stroke();
    };
    traco(() => true, '#4A4F58', 4.2);
    traco((k) => pista.alturas[k] > 1.2, '#F4F1E8', 5.6);
    traco((k) => pista.alturas[k] > 1.2, '#5A606B', 4.2);
    // Obras
    for (const o of this.obras) { const [x, y] = this._xy(o.x, o.z), t = (1.6 + o.nivel * 0.3) * esc; c.fillStyle = o.cor; c.strokeStyle = '#161F38'; c.lineWidth = 0.15 * esc; c.beginPath(); c.roundRect(x - t / 2, y - t / 2, t, t, 0.3 * esc); c.fill(); c.stroke(); }
    // Casas
    const tam = 2.5 * esc;
    for (let k = 0; k < pista.casas; k++) {
      const a = pista.amostra(k, this._a), [x, y] = this._xy(a.p.x, a.p.z), tipo = this.reveladas.get(k);
      const def = tipo ? TIPOS[tipo] : null;
      c.save(); c.translate(x, y); c.rotate(Math.atan2(a.t.z, a.t.x));
      c.fillStyle = BAIRROS[Math.floor(k / 5) % BAIRROS.length].hex; c.beginPath(); c.roundRect(-tam / 2, -tam / 2, tam, tam, 0.4 * esc); c.fill();
      if (def) { c.fillStyle = def.cor; c.beginPath(); c.roundRect(-tam * 0.36, -tam * 0.36, tam * 0.72, tam * 0.72, 0.25 * esc); c.fill(); }
      if (this.destaque === k) { c.strokeStyle = '#E0A537'; c.lineWidth = (0.35 + Math.sin(this.tempo * 6) * 0.12) * esc; c.beginPath(); c.roundRect(-tam * 0.62, -tam * 0.62, tam * 1.24, tam * 1.24, 0.5 * esc); c.stroke(); }
      c.restore();
      if (this.rotulos) {
        c.fillStyle = '#161F38'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const txt = def ? (def.rotulo.length > 5 ? def.rotulo.split(' ')[0].slice(0, 5) : def.rotulo) : '?';
        c.font = `700 ${Math.max(9, (txt.length > 3 ? 0.62 : 1.05) * esc)}px Inter, Arial, sans-serif`;
        c.fillText(txt, x, y + 0.05 * esc);
        c.font = `600 ${Math.max(7, 0.55 * esc)}px Inter, Arial, sans-serif`; c.fillStyle = 'rgba(22,31,56,.7)';
        c.fillText(String(k), x - a.l.x * 2.1 * esc - a.t.x * 0, y - a.l.z * 2.1 * esc);
      }
    }
    // Carrinhos (o da vez por último e maior)
    const ordem = [...this.carros.entries()].sort((p, q) => (p[0] === this.foco) - (q[0] === this.foco));
    for (const [id, car] of ordem) {
      const a = pista.amostra(car.s, this._a), [x, y] = this._xy(a.p.x + a.l.x * car.faixa, a.p.z + a.l.z * car.faixa);
      const r = (id === this.foco ? 1.25 : 0.95) * esc * (this.cheia ? 1 : 1.5);
      c.fillStyle = car.cor; c.strokeStyle = '#fff'; c.lineWidth = 0.22 * esc * (this.cheia ? 1 : 1.5);
      c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.stroke();
      if (this.rotulos || id === this.foco) { c.fillStyle = '#fff'; c.font = `700 ${r * 1.1}px Inter, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(car.letra, x, y + r * 0.06); }
    }
  }
}
