// ============================================================
//  js/pontuacao.js — Regra de pontuação (espelhada no servidor, fase 5)
//
//  Regra aprovada ("A"): só soma, nunca desconta.
//   · Palavras resolvidas valem 100% do XP da atividade, proporcionalmente.
//   · Estrela de autonomia (palavra sem dica): até +25% extra.
//   · Desafio de tempo (opcional, ligado pelo professor): +10% se concluir
//     toda a cruzadinha dentro do tempo alvo.
// ============================================================
export const PESOS = { estrela: 0.25, tempo: 0.10 };

export function calcularPontuacao({ total, resolvidas, estrelas, xp = 100, desafioTempo = false, tempoSeg = 0, tempoAlvoSeg = 0 }) {
  if (!total) return { base: 0, estrelas: 0, tempo: 0, total: 0 };
  const base = Math.round(xp * resolvidas / total);
  const bonusEstrelas = Math.round(xp * PESOS.estrela * estrelas / total);
  const completa = resolvidas === total;
  const bonusTempo = (desafioTempo && completa && tempoAlvoSeg > 0 && tempoSeg <= tempoAlvoSeg) ? Math.round(xp * PESOS.tempo) : 0;
  return { base, estrelas: bonusEstrelas, tempo: bonusTempo, total: base + bonusEstrelas + bonusTempo };
}

export function formatarTempo(seg) {
  seg = Math.max(0, Math.floor(seg));
  const m = Math.floor(seg / 60), s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
