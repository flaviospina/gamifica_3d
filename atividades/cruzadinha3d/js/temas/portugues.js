// ============================================================
//  js/temas/portugues.js — Tema "Ilha-Biblioteca" (livros gigantes)
//  Paleta pronta; livros gigantes como obstáculos entram no acabamento.
// ============================================================
import ciencias from './ciencias.js';
import { decorarBasico } from './geografia.js';

export default {
  ...ciencias,
  chave: 'portugues',
  nome: 'Ilha-Biblioteca',
  disciplina: 'Português',
  ceu:   { topo: '#E8A95B', horizonte: '#FFF1D6' },
  nevoa: { cor: '#FFF1D6', perto: 28, longe: 75 },
  luz: { ...ciencias.luz, sol: '#FFE2B8', ceu: '#FFE9C9', chao: '#8C7A4A' },
  cores: {
    ...ciencias.cores,
    grama: '#A9C96A', gramaEscura: '#8FB252', areia: '#F0DDB0', agua: '#5BA8C8',
    copa: '#7FB457', copaEscura: '#6A9A48', tronco: '#7A4E22',
  },
  decorar(ctx) { return decorarBasico(this, ctx, { pinheiros: 0.2 }); },
};
