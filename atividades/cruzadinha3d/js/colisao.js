// ============================================================
//  js/colisao.js — Colisão simples por caixas delimitadoras (AABB)
//  Sem motor de física: o mundo é uma lista de sólidos (bloqueiam) e
//  plataformas (pode-se andar em cima). O chão base é a ilha.
// ============================================================
import { CONFIG } from './config.js';

export class Colisao {
  constructor() {
    this.solidos = [];       // { minX, maxX, minZ, maxZ, minY, maxY }
    this.plataformas = [];   // { minX, maxX, minZ, maxZ, topo, base }
    this.malhasCamera = [];  // meshes usados no raycast da câmera
  }

  adicionarSolido(caixa) { this.solidos.push(caixa); return caixa; }

  /** Sólido a partir de centro e tamanho (atalho para decorações). */
  solidoCentro(x, z, largura, profundidade, altura = 3, y0 = -1) {
    return this.adicionarSolido({
      minX: x - largura / 2, maxX: x + largura / 2,
      minZ: z - profundidade / 2, maxZ: z + profundidade / 2,
      minY: y0, maxY: y0 + altura,
    });
  }

  adicionarPlataforma(p) { this.plataformas.push(p); return p; }

  /** Altura do terreno base e se está na água. */
  terreno(x, z) {
    const d = Math.hypot(x, z);
    if (d <= CONFIG.mundo.raioAreia) return { altura: 0, agua: false };
    return { altura: CONFIG.mundo.nivelAgua, agua: true };
  }

  /**
   * Superfície em que os pés podem apoiar na posição (x, z).
   * Considera plataformas cujo topo esteja até degrauMax acima dos pés
   * (subida automática de degraus) ou abaixo (queda).
   */
  superficie(x, z, yPes) {
    const t = this.terreno(x, z);
    let melhor = t.altura;
    let plataforma = null;
    const limite = yPes + CONFIG.personagem.degrauMax;
    for (const p of this.plataformas) {
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      if (p.topo <= limite && p.topo > melhor) { melhor = p.topo; plataforma = p; }
    }
    return { altura: melhor, agua: t.agua && !plataforma, plataforma };
  }

  /**
   * Move um círculo (raio r) no plano XZ deslizando pelas caixas.
   * Retorna a posição final. Plataformas altas demais viram paredes.
   */
  moverHorizontal(pos, dx, dz, raio, alturaPersonagem) {
    const pes = pos.y;
    const cabeca = pos.y + alturaPersonagem;
    const paredes = [];
    for (const s of this.solidos) {
      if (s.maxY > pes + 0.05 && s.minY < cabeca) paredes.push(s);
    }
    const degrau = pes + CONFIG.personagem.degrauMax;
    for (const p of this.plataformas) {
      if (p.topo > degrau && (p.base ?? -10) < cabeca) paredes.push(p);
    }

    let x = pos.x + dx;
    let z = pos.z;
    for (const c of paredes) x = this._empurrarX(x, z, raio, c, dx);
    z = pos.z + dz;
    for (const c of paredes) z = this._empurrarZ(x, z, raio, c, dz);

    // Limite absoluto do mundo
    const d = Math.hypot(x, z);
    if (d > CONFIG.mundo.limite) { x *= CONFIG.mundo.limite / d; z *= CONFIG.mundo.limite / d; }
    return { x, z };
  }

  _empurrarX(x, z, r, c, dx) {
    if (z + r <= c.minZ || z - r >= c.maxZ) return x;
    if (x + r > c.minX && x - r < c.maxX) {
      return dx > 0 ? c.minX - r : dx < 0 ? c.maxX + r : x;
    }
    return x;
  }

  _empurrarZ(x, z, r, c, dz) {
    if (x + r <= c.minX || x - r >= c.maxX) return z;
    if (z + r > c.minZ && z - r < c.maxZ) {
      return dz > 0 ? c.minZ - r : dz < 0 ? c.maxZ + r : z;
    }
    return z;
  }
}
