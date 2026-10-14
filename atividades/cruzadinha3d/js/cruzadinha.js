// ============================================================
//  js/cruzadinha.js — Modelo da cruzadinha (fase 2: só o layout
//  da grade e dos totens; a mecânica de resposta entra na fase 3)
//
//  Formato do JSON de uma cruzadinha:
//  {
//    "titulo": "...", "disciplina": "Ciências", "ano": "3º ano", "tema": "ciencias",
//    "palavras": [ { "dica": "...", "resposta": "ÁGUA", "linha": 1, "coluna": 3, "direcao": "v" }, ... ]
//  }
//  linha/coluna começam em 0; direcao "h" (horizontal) ou "v" (vertical).
// ============================================================

/** Remove acentos/cedilha e põe em maiúsculas: "Água" → "AGUA". */
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '');
}

/** Letras da resposta como exibidas (com acento), uma por casa. */
export function letrasExibidas(resposta) {
  return [...String(resposta).toUpperCase()].filter(ch => /\p{L}/u.test(ch));
}

/**
 * Calcula as células ocupadas, a numeração dos totens e os limites da grade.
 * Palavras que começam na mesma casa dividem o mesmo número (padrão de cruzadinha).
 */
export function montarLayout(cruzadinha) {
  const palavras = (cruzadinha.palavras || []).map((p, i) => ({
    ...p,
    indice: i,
    normal: normalizar(p.resposta),
    letras: letrasExibidas(p.resposta),
    direcao: p.direcao === 'v' ? 'v' : 'h',
  }));

  const celulas = new Map(); // "l,c" → { l, c, letra, palavras: [indices] }
  for (const p of palavras) {
    p.letras.forEach((letra, k) => {
      const l = p.linha + (p.direcao === 'v' ? k : 0);
      const c = p.coluna + (p.direcao === 'h' ? k : 0);
      const chave = `${l},${c}`;
      const cel = celulas.get(chave) || { l, c, letra, palavras: [] };
      cel.palavras.push(p.indice);
      celulas.set(chave, cel);
    });
  }

  // Numeração por ordem de leitura (linha, depois coluna)
  const inicios = [...palavras].sort((a, b) => a.linha - b.linha || a.coluna - b.coluna);
  const numeroPorInicio = new Map();
  let n = 0;
  for (const p of inicios) {
    const chave = `${p.linha},${p.coluna}`;
    if (!numeroPorInicio.has(chave)) numeroPorInicio.set(chave, ++n);
    p.numero = numeroPorInicio.get(chave);
  }

  let linhas = 0, colunas = 0;
  for (const cel of celulas.values()) { linhas = Math.max(linhas, cel.l + 1); colunas = Math.max(colunas, cel.c + 1); }

  const totens = palavras.map(p => ({ l: p.linha, c: p.coluna, numero: p.numero, direcao: p.direcao, palavra: p.indice }));

  return { linhas, colunas, celulas: [...celulas.values()], totens, palavras };
}
