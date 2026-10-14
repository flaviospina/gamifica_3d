// ============================================================
//  js/gerador.js — Gerador automático de layout de cruzadinha
//  Entrada: lista de { dica, resposta }. Saída: palavras com linha,
//  coluna e direção, mais a lista das que não couberam.
//  Sem dependências: roda no navegador (editor do professor) e em testes.
// ============================================================
import { normalizar, letrasExibidas } from './cruzadinha.js';
import { criarAleatorio } from './util.js';

/**
 * @param itens       [{ dica, resposta }]
 * @param opcoes      { tentativas: 60, seed: 1, maxLado: 15 }
 * @returns { palavras: [{dica, resposta, linha, coluna, direcao}], naoCouberam: [resposta], linhas, colunas }
 */
export function gerarLayout(itens, opcoes = {}) {
  const { tentativas = 60, seed = 1, maxLado = 15 } = opcoes;
  const rnd = criarAleatorio(seed);
  const palavras = itens
    .map((it, i) => ({ ...it, indice: i, normal: normalizar(it.resposta), letras: letrasExibidas(it.resposta) }))
    .filter(p => p.normal.length >= 2);

  let melhor = null;
  for (let t = 0; t < tentativas; t++) {
    const ordem = [...palavras].sort((a, b) => b.normal.length - a.normal.length || (rnd() - 0.5));
    if (t > 0) { // embaralha mantendo as longas na frente (mais chance de cruzamentos)
      for (let i = ordem.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); if (Math.abs(ordem[i].normal.length - ordem[j].normal.length) <= 2) [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
    }
    const resultado = montar(ordem, maxLado, rnd);
    const pontos = resultado.colocadas.length * 10000 - resultado.area * 2 + resultado.cruzamentos * 50;
    if (!melhor || pontos > melhor.pontos) melhor = { ...resultado, pontos };
    if (resultado.colocadas.length === palavras.length && resultado.area <= (maxLado * maxLado) * 0.45) break;
  }

  // Normaliza coordenadas para começar em (0,0)
  const minL = Math.min(...melhor.colocadas.map(p => p.linha));
  const minC = Math.min(...melhor.colocadas.map(p => p.coluna));
  const saida = melhor.colocadas
    .sort((a, b) => a.indice - b.indice)
    .map(p => ({ dica: p.dica, resposta: p.resposta, linha: p.linha - minL, coluna: p.coluna - minC, direcao: p.direcao }));
  let linhas = 0, colunas = 0;
  for (const p of saida) {
    linhas = Math.max(linhas, p.linha + (p.direcao === 'v' ? letrasExibidas(p.resposta).length : 1));
    colunas = Math.max(colunas, p.coluna + (p.direcao === 'h' ? letrasExibidas(p.resposta).length : 1));
  }
  return { palavras: saida, naoCouberam: melhor.naoCouberam.map(p => p.resposta), linhas, colunas };
}

function montar(ordem, maxLado, rnd) {
  const grade = new Map();      // "l,c" → { letra, h: bool, v: bool }
  const colocadas = [];
  const naoCouberam = [];
  let cruzamentos = 0;
  let minL = 0, maxL = 0, minC = 0, maxC = 0;

  const chave = (l, c) => `${l},${c}`;
  const letraEm = (l, c) => grade.get(chave(l, c))?.letra ?? null;

  /** Testa se a palavra cabe em (l, c, dir). Retorna número de cruzamentos ou -1. */
  const cabe = (p, l, c, dir) => {
    const n = p.normal.length;
    const dl = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0;
    // Casa antes do início e depois do fim devem estar vazias
    if (letraEm(l - dl, c - dc) !== null) return -1;
    if (letraEm(l + dl * n, c + dc * n) !== null) return -1;
    let cruz = 0;
    for (let k = 0; k < n; k++) {
      const ll = l + dl * k, cc = c + dc * k;
      const atual = grade.get(chave(ll, cc));
      if (atual) {
        if (atual.letra !== p.normal[k]) return -1;
        if (atual[dir]) return -1;          // já existe palavra nesta direção passando aqui
        cruz++;
      } else {
        // Sem vizinhos laterais (evita palavras "coladas" formando sequências inválidas)
        if (dir === 'h' && (letraEm(ll - 1, cc) !== null || letraEm(ll + 1, cc) !== null)) return -1;
        if (dir === 'v' && (letraEm(ll, cc - 1) !== null || letraEm(ll, cc + 1) !== null)) return -1;
      }
    }
    // Limite de tamanho da grade
    const nMinL = Math.min(minL, l), nMaxL = Math.max(maxL, l + dl * (n - 1));
    const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + dc * (n - 1));
    if (nMaxL - nMinL + 1 > maxLado || nMaxC - nMinC + 1 > maxLado) return -1;
    return cruz;
  };

  const colocar = (p, l, c, dir, cruz) => {
    const n = p.normal.length;
    const dl = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const ll = l + dl * k, cc = c + dc * k;
      const cel = grade.get(chave(ll, cc)) || { letra: p.normal[k], h: false, v: false };
      cel[dir] = true;
      grade.set(chave(ll, cc), cel);
    }
    minL = Math.min(minL, l); maxL = Math.max(maxL, l + dl * (n - 1));
    minC = Math.min(minC, c); maxC = Math.max(maxC, c + dc * (n - 1));
    cruzamentos += cruz;
    colocadas.push({ ...p, linha: l, coluna: c, direcao: dir });
  };

  ordem.forEach((p, idx) => {
    if (idx === 0) { colocar(p, 0, 0, 'h', 0); return; }
    let melhor = null;
    // Para cada letra da palavra, procura a mesma letra já na grade
    for (let k = 0; k < p.normal.length; k++) {
      for (const [ch, cel] of grade) {
        if (cel.letra !== p.normal[k]) continue;
        const [gl, gc] = ch.split(',').map(Number);
        for (const dir of ['h', 'v']) {
          if (cel[dir]) continue; // essa direção já está ocupada aqui
          const l = gl - (dir === 'v' ? k : 0), c = gc - (dir === 'h' ? k : 0);
          const cruz = cabe(p, l, c, dir);
          if (cruz < 1) continue;
          // Pontuação: mais cruzamentos e grade mais compacta
          const nMinL = Math.min(minL, l), nMaxL = Math.max(maxL, l + (dir === 'v' ? p.normal.length - 1 : 0));
          const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + (dir === 'h' ? p.normal.length - 1 : 0));
          const area = (nMaxL - nMinL + 1) * (nMaxC - nMinC + 1);
          const pontos = cruz * 100 - area + rnd() * 5;
          if (!melhor || pontos > melhor.pontos) melhor = { l, c, dir, cruz, pontos };
        }
      }
    }
    if (melhor) colocar(p, melhor.l, melhor.c, melhor.dir, melhor.cruz);
    else naoCouberam.push(p);
  });

  const area = (maxL - minL + 1) * (maxC - minC + 1);
  return { colocadas, naoCouberam, cruzamentos, area };
}
