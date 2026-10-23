// ============================================================
//  js/temas/geografia.js — Tema "Ilha dos Mapas" (relevo, rio, bússola)
//  Paleta e vegetação prontas; o marco temático (rosa dos ventos e rio)
//  entra na fase de acabamento.
// ============================================================
import ciencias from './ciencias.js';
import { criarVegetacao } from './pecas.js';

export default {
  ...ciencias,
  chave: 'geografia',
  nome: 'Ilha dos Mapas',
  disciplina: 'Geografia',
  ceu:   { topo: '#3F86C9', horizonte: '#E3EEF7' },
  nevoa: { cor: '#E3EEF7', perto: 30, longe: 140 },
  cores: {
    ...ciencias.cores,
    grama: '#8CBF5A', gramaEscura: '#6FA544', areia: '#E7D3A3', agua: '#2F8FD0',
    copa: '#5E9E3C', copaEscura: '#4A8030', pedra: '#A08C78',
  },
  decorar(ctx) {
    return decorarBasico(this, ctx, { pinheiros: 0.3 });
  },
};

/** Vegetação genérica usada pelos temas ainda sem marco próprio. */
export function decorarBasico(tema, ctx, { pinheiros = 0.5 } = {}) {
  const { scene, rnd, qualidade, colisao, areaLivre, raioIlha } = ctx;
  const veg = criarVegetacao(tema.cores);
  const d = qualidade.decoracao;
  let n = 0, t = 0;
  while (n < 36 * d && t++ < 800) {
    const a = rnd() * 6.283, r = rnd.entre(raioIlha - 4.5, raioIlha - 1.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!areaLivre(x, z, 1.2)) continue;
    const info = veg.arvore(x, z, rnd, rnd() < pinheiros ? 'pinheiro' : 'redonda');
    colisao.solidoCentro(x, z, info.raio * 2, info.raio * 2, info.altura);
    n++;
  }
  n = 0; t = 0;
  while (n < 16 * d && t++ < 400) {
    const a = rnd() * 6.283, r = rnd.entre(3, raioIlha - 2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!areaLivre(x, z, 1)) continue;
    const info = rnd() < 0.5 ? veg.arbusto(x, z, rnd) : veg.pedra(x, z, rnd);
    colisao.solidoCentro(x, z, info.raio * 1.6, info.raio * 1.6, info.altura);
    n++;
  }
  for (let i = 0; i < 50 * d; i++) { const a = rnd() * 6.283, r = rnd.entre(2, raioIlha - 1.5); veg.flor(Math.cos(a) * r, Math.sin(a) * r, rnd, rnd.escolher(tema.cores.flores)); }
  if (ctx.caminho) for (const [x, z] of ctx.caminho) veg.pedraCaminho(x, z, rnd);
  colisao.malhasCamera.push(...veg.construir(scene, qualidade));
  return { atualizar() {} };
}
