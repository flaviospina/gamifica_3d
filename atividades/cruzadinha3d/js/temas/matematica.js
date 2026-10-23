// ============================================================
//  js/temas/matematica.js — Tema "Ilha Geométrica" (sólidos e números)
//  Paleta pronta; sólidos e blocos numerados entram no acabamento.
// ============================================================
import ciencias from './ciencias.js';
import { decorarBasico } from './geografia.js';

export default {
  ...ciencias,
  chave: 'matematica',
  nome: 'Ilha Geométrica',
  disciplina: 'Matemática',
  ceu:   { topo: '#5B6EE0', horizonte: '#E2E9FF' },
  nevoa: { cor: '#E2E9FF', perto: 30, longe: 140 },
  cores: {
    ...ciencias.cores,
    grama: '#7CC7B5', gramaEscura: '#5FAE9C', areia: '#EDE3C3', agua: '#4E86E6',
    copa: '#5AAE8E', copaEscura: '#46937A', pedra: '#B2B7C9',
  },
  decorar(ctx) { return decorarBasico(this, ctx, { pinheiros: 0.5 }); },
};
