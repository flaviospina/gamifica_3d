// ============================================================
//  js/temas/index.js — Registro de temas visuais por disciplina
// ============================================================
import ciencias from './ciencias.js';
import geografia from './geografia.js';
import portugues from './portugues.js';
import matematica from './matematica.js';

export const TEMAS = { ciencias, geografia, portugues, matematica };

/** Aceita a chave do tema ou o nome da disciplina (com ou sem acento). */
export function obterTema(chaveOuDisciplina = 'ciencias') {
  const k = String(chaveOuDisciplina).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (TEMAS[k]) return TEMAS[k];
  if (k.startsWith('cienc')) return ciencias;
  if (k.startsWith('geog'))  return geografia;
  if (k.startsWith('port') || k.startsWith('lingua')) return portugues;
  if (k.startsWith('mat'))   return matematica;
  return ciencias;
}
