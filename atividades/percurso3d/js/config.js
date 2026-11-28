// ============================================================
//  js/config.js — Constantes do jogo "Cidade do Saber"
//  Gamifica · atividade percurso3d
// ============================================================

export const THREE_VERSAO = '0.186.1';

export const CORES_MARCA = { navy: '#161F38', papel: '#FBF7EF', verde: '#286456', dourado: '#E0A537' };

/** Cores dos 6 jogadores (carrinho, bandeira e HUD). */
export const CORES_JOGADORES = [
  { chave: 'dourado', hex: '#E0A537', nome: 'Dourado' },
  { chave: 'azul',    hex: '#3E7CB1', nome: 'Azul' },
  { chave: 'vermelho', hex: '#D9433B', nome: 'Vermelho' },
  { chave: 'verde',   hex: '#58A55C', nome: 'Verde' },
  { chave: 'roxo',    hex: '#9B59B6', nome: 'Roxo' },
  { chave: 'rosa',    hex: '#E9607A', nome: 'Rosa' },
];

/** 8 bairros de 5 casas (cor da placa). */
export const BAIRROS = [
  { nome: 'Azul-claro', hex: '#8FD3F4' }, { nome: 'Laranja', hex: '#F7B267' }, { nome: 'Coral', hex: '#F4845F' },
  { nome: 'Rosa', hex: '#E9607A' }, { nome: 'Roxo', hex: '#9B59B6' }, { nome: 'Verde', hex: '#58A55C' },
  { nome: 'Amarelo', hex: '#F2C14E' }, { nome: 'Azul', hex: '#3E7CB1' },
];

export const CONFIG = {
  casas: 40,                 // casas por volta (a casa 0 é a Largada/Chegada)
  voltasPadrao: 1,
  maxJogadores: 6,
  pontos: {
    acerto: 10,              // por pergunta certa (além da estrela)
    volta: 50,               // por volta completa
    selo: 10,                // por museu visitado
    obra: 30,                // por prédio construído
    consolacao: 10,          // ao tirar uma carta "volte"
    desafioTodos: 20,        // quando todos acertam o desafio-relâmpago
  },
  estrelas: { acerto: 1, volta: 5, desafioTodos: 1 },
  obra: { custoEstrelas: 3 },
  tempoPergunta: 45,         // segundos
  tempoDesafio: 20,
  ventoAFavor: 1,            // bônus no dado para quem está em último
  ia: { facil: 0.4, medio: 0.6, dificil: 0.8, atrasoMs: 900 },
  mundo: { larguraPista: 4.2, alturaViaduto: 4.8 },
  camera: { fov: 36, seguirDist: 9.5, seguirAltura: 8.5, suavidade: 4 },
};

/** Qualidade gráfica. */
export const QUALIDADE = {
  baixa: { pixelRatioMax: 1,   antialias: false, sombras: 0,    arvores: 30, pos: false },
  media: { pixelRatioMax: 1.5, antialias: true,  sombras: 2048, arvores: 60, pos: true },
  alta:  { pixelRatioMax: 2,   antialias: true,  sombras: 4096, arvores: 80, pos: true },
};
