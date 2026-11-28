// Teste do motor de regras: simula partidas inteiras só com o computador
// e confere as garantias de "sem punição".  Uso: node tools/teste_regras.mjs
import { Regras } from '../js/regras.js';
import { CONFIG } from '../js/config.js';
import { DISTRIBUICAO } from '../js/cartas.js';
import banco from '../data/perguntas_demo.js';

let falhas = 0;
const ok = (cond, msg) => { if (!cond) { falhas++; console.log('FALHOU:', msg); } };

ok(DISTRIBUICAO.reduce((s, [, n]) => s + n, 0) === CONFIG.casas - 1, 'a distribuição cobre as 39 casas');

function simular(semente, nJog, voltas) {
  const r = new Regras({ jogadores: Array.from({ length: nJog }, (_, i) => ({ nome: 'J' + i, ia: true, nivel: ['facil', 'medio', 'dificil'][i % 3] })), perguntas: banco.perguntas, curiosidades: banco.curiosidades, voltas, semente });
  const snap = () => r.jogadores.map((j) => ({ pontos: j.pontos, estrelas: j.estrelas, maxPos: j.maxPos, selos: j.selos.size, obras: j.obras.length }));
  let antes = snap(), turnos = 0;
  const conferir = (onde) => {
    const agora = snap();
    agora.forEach((a, i) => {
      const b = antes[i];
      ok(a.pontos >= b.pontos, `${onde}: pontos diminuíram (${b.pontos} → ${a.pontos})`);
      ok(a.estrelas >= b.estrelas, `${onde}: estrelas diminuíram`);
      ok(a.maxPos >= b.maxPos, `${onde}: progresso diminuiu`);
      ok(a.selos >= b.selos && a.obras >= b.obras, `${onde}: selo/obra sumiu`);
      const j = r.jogadores[i];
      ok(j.pos >= 0 && j.pos <= r.total, `${onde}: posição fora do tabuleiro (${j.pos})`);
      ok(r.estrelasDisponiveis(j) >= 0, `${onde}: estrelas disponíveis negativas`);
    });
    antes = agora;
  };
  while (!r.encerrada && turnos < 5000) {
    turnos++;
    const j = r.atual;
    ok(!j.terminou, 'jogador que já chegou não deveria jogar');
    let repeticoes = 0, denovo = true;
    while (denovo && repeticoes++ < 3 && !j.terminou) {
      denovo = false;
      const dado = r.rolar(j);
      ok(dado.dado >= 1 && dado.dado <= 6 && dado.bonus >= 0, 'dado válido');
      const voltaAntes = Math.floor(j.pos / r.casas);
      r.mover(j, r.destino(j, dado.passos));
      if (j.terminou) break;
      const casa = r.casaDe(j.pos), tipo = r.tipoEm(j.pos);
      r.revelar(casa);
      const e = r.efeito(j, tipo);
      if (e.pergunta) { const q = r.sortearPergunta(j); const res = r.responder(j, q, r.iaResponde(j, q)); if (res.certa) r.mover(j, r.destino(j, 2)); }
      if (e.para !== undefined) { ok(Math.floor(e.para / r.casas) >= voltaAntes || e.para >= j.pos, 'recuo não pode tirar volta'); r.mover(j, e.para); }
      if (e.todos) for (const o of r.ativos()) r.mover(o, r.destino(o, e.todos));
      if (e.desafio) { const q = r.perguntaDesafio(); const resp = new Map(r.jogadores.map((o) => [o.id, r.iaResponde(o, q)])); const d = r.resolverDesafio(q, resp); for (const id of d.acertaram) { const o = r.jogadores[id]; if (!o.terminou) r.mover(o, r.destino(o, 1)); } }
      if (e.museu) r.visitarMuseu(j, casa);
      if (e.obra && r.podeConstruir(j)) r.construir(j, casa);
      if (e.denovo) denovo = true;
      conferir(`semente ${semente} turno ${turnos} (${tipo})`);
    }
    r.proximaVez();
  }
  ok(r.encerrada, `semente ${semente}: a partida deveria terminar (turnos ${turnos})`);
  ok(r.jogadores.every((j) => j.terminou && j.maxPos === r.total), `semente ${semente}: todos chegam`);
  const res = r.resultado();
  ok(res.every((x) => x.xp.participacao === r.xp), 'quem completa recebe o XP de participação inteiro');
  ok(new Set(res.map((x) => x.ordem)).size === nJog, 'ordens de chegada distintas');
  return { turnos, rodadas: r.rodada, res };
}

let somaRodadas = 0, n = 0;
for (let s = 1; s <= 300; s++) { const r = simular(s * 7919, 1 + (s % 6), 1 + (s % 3)); somaRodadas += r.rodadas; n++; }
const ex = simular(42, 4, 1);
console.log('exemplo (4 jogadores, 1 volta):', ex.rodadas, 'rodadas;', ex.res.map((x) => `${x.nome}#${x.ordem} ${x.pontos}pts ${x.estrelas}★ xp${x.xp.total}`).join(' | '));
console.log(`${n} partidas simuladas, média de ${(somaRodadas / n).toFixed(1)} rodadas. Falhas: ${falhas}`);
process.exit(falhas ? 1 : 0);
