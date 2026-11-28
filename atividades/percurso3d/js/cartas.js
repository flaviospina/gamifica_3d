// ============================================================
//  js/cartas.js — As surpresas escondidas em cada casa.
//  Cada casa recebe uma carta no início da partida; a placa mostra "?"
//  até alguém cair nela. Nada tira pontos: até "volte" vem com consolação.
// ============================================================
import { CONFIG } from './config.js';

/**
 * Tipos de carta. `efeito` é interpretado por regras.js.
 *   rotulo   — texto curto que aparece na placa 3D depois de revelada
 *   titulo   — manchete do cartão
 *   texto    — explicação para o jogador
 */
export const TIPOS = {
  pergunta:  { rotulo: 'PERG', titulo: 'Pergunta!', texto: 'Responda para ganhar uma estrela e avançar 2 casas. Errou? Fica no lugar, vê a resposta e a pergunta volta depois.', cor: '#FBF7EF' },
  avance3:   { rotulo: '+3', titulo: 'Vento nas costas!', texto: 'O trânsito abriu: avance 3 casas.', cor: '#D7F5E1', efeito: { andar: 3 } },
  avance2:   { rotulo: '+2', titulo: 'Sinal verde!', texto: 'Avance 2 casas.', cor: '#D7F5E1', efeito: { andar: 2 } },
  volte1:    { rotulo: '-1', titulo: 'Esqueceu a mochila!', texto: `Volte 1 casa para buscar. De consolação, ganhe ${CONFIG.pontos.consolacao} pontos.`, cor: '#FFE6CC', efeito: { andar: -1, pontos: CONFIG.pontos.consolacao } },
  volte2:    { rotulo: '-2', titulo: 'Rua interditada!', texto: `Volte 2 casas e pegue o desvio. De consolação, ganhe ${CONFIG.pontos.consolacao} pontos.`, cor: '#FFE6CC', efeito: { andar: -2, pontos: CONFIG.pontos.consolacao } },
  bonus50:   { rotulo: '+50', titulo: 'Tesouro da cidade!', texto: 'Você achou 50 pontos escondidos.', cor: '#FFF3C4', efeito: { pontos: 50 } },
  bonus20:   { rotulo: '+20', titulo: 'Moedas na calçada!', texto: 'Ganhe 20 pontos.', cor: '#FFF3C4', efeito: { pontos: 20 } },
  denovo:    { rotulo: 'DADO', titulo: 'Dados dourados!', texto: 'Jogue os dados de novo.', cor: '#FFF3C4', efeito: { denovo: true } },
  desafio:   { rotulo: 'TODOS', titulo: 'Desafio-relâmpago!', texto: 'Todos respondem a mesma pergunta. Quem acerta avança 1 casa. Se todos acertam, todos ganham uma estrela.', cor: '#E3ECFF', efeito: { desafio: true } },
  museu:     { rotulo: 'MUSEU', titulo: 'Museu da cidade', texto: 'Leia a curiosidade e ganhe um selo.', cor: '#EAE3FF', efeito: { museu: true } },
  obra:      { rotulo: 'OBRA', titulo: 'Terreno à venda', texto: `Troque ${CONFIG.obra.custoEstrelas} estrelas por um prédio com o seu nome na cidade. As estrelas continuam contando no placar.`, cor: '#FFE1EE', efeito: { obra: true } },
  mutirao:   { rotulo: 'TODOS +1', titulo: 'Mutirão!', texto: 'Obras na avenida: todos os jogadores avançam 1 casa.', cor: '#D7F5E1', efeito: { todos: 1 } },
  carona:    { rotulo: 'CARONA', titulo: 'Carona!', texto: 'Pule para a casa do jogador logo à sua frente. Se ninguém está à frente, ganhe 20 pontos.', cor: '#D7F5E1', efeito: { carona: true } },
  atalho:    { rotulo: 'ATALHO', titulo: 'Atalho pelo viaduto!', texto: 'Avance 4 casas pelo caminho de cima.', cor: '#D7F5E1', efeito: { andar: 4 } },
  largada:   { rotulo: 'LARGADA', titulo: 'Largada e Chegada', texto: 'Cada volta completa vale 5 estrelas e 50 pontos.', cor: '#FFF3C4' },
};

/** Quantas cartas de cada tipo entram nas 39 casas (a casa 0 é a Largada). */
export const DISTRIBUICAO = [
  ['pergunta', 15], ['avance3', 2], ['avance2', 2], ['volte1', 2], ['volte2', 1],
  ['bonus50', 2], ['bonus20', 2], ['denovo', 2], ['desafio', 3], ['museu', 3],
  ['obra', 2], ['mutirao', 1], ['carona', 1], ['atalho', 1],
];

/** Monta o baralho embaralhado para as casas 1..N-1 (a 0 é sempre largada). */
export function distribuirCartas(rnd, totalCasas = CONFIG.casas) {
  const baralho = [];
  for (const [tipo, n] of DISTRIBUICAO) for (let i = 0; i < n; i++) baralho.push(tipo);
  while (baralho.length < totalCasas - 1) baralho.push('pergunta');
  const emb = rnd.embaralhar(baralho).slice(0, totalCasas - 1);
  // Garante que as casas 1 e 2 não sejam "volte" (ninguém volta para trás da largada logo de cara)
  for (const i of [0, 1]) if (emb[i].startsWith('volte')) { const j = emb.findIndex((t, k) => k > 2 && t === 'pergunta'); if (j > 0) [emb[i], emb[j]] = [emb[j], emb[i]]; }
  return ['largada', ...emb];
}

export const CURIOSIDADES_PADRAO = [
  { titulo: 'O ar que a gente não vê', texto: 'Quase 78 % do ar é nitrogênio e só 21 % é oxigênio. O gás carbônico, que as plantas usam, é menos de 0,05 %.' },
  { titulo: 'Plantas respiram?', texto: 'Sim. As plantas fazem fotossíntese de dia, mas respiram o tempo todo, assim como nós, consumindo um pouco do oxigênio que produzem.' },
  { titulo: 'Água que viaja', texto: 'A mesma água que cai na chuva hoje já pode ter passado por um rio, por uma nuvem e por um dinossauro, há milhões de anos.' },
];
