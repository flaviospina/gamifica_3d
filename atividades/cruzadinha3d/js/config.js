// ============================================================
//  js/config.js — Constantes do jogo "Ilha das Palavras"
//  Gamifica · atividade cruzadinha 3D
// ============================================================

/** Versão do Three.js fixada no importmap do index.php (mantenha igual). */
export const THREE_VERSAO = '0.186.1';

/** Paleta da marca Gamifica (interface: painéis, botões, textos). */
export const CORES_MARCA = {
  navy:    '#161F38',
  papel:   '#FBF7EF',
  verde:   '#286456',
  dourado: '#E0A537',
};

export const CONFIG = {
  /** Cada casa da cruzadinha é um bloco de 1 unidade. */
  ladrilho: {
    tamanho: 1,        // lado do bloco (unidades do mundo)
    altura:  0.35,     // altura do bloco acima do chão
    folga:   0.06,     // espaço entre blocos vizinhos
  },

  personagem: {
    velocidade:   4.0,  // unidades/segundo
    aceleracao:   18,   // quão rápido chega na velocidade
    giro:         12,   // suavidade da rotação para a direção do movimento
    pulo:         6.2,  // velocidade vertical inicial do pulo
    gravidade:    17,
    raio:         0.32, // raio da colisão horizontal
    altura:       1.5,  // altura total (olhos/câmera)
    degrauMax:    0.5,  // sobe degraus até esta altura sem pular
    coyote:       0.12, // segundos após sair de uma borda em que ainda pode pular
  },

  camera: {
    fov:        55,
    distancia:  7,
    distMin:    3.5,
    distMax:    11,
    pitch:      0.55,   // inclinação inicial (radianos)
    pitchMin:   0.12,
    pitchMax:   1.25,
    suavidade:  9,      // maior = segue mais rápido
    alturaAlvo: 1.1,    // ponto do personagem que a câmera olha
    sensMouse:  0.0045,
    sensToque:  0.0065,
    margemColisao: 0.35,
  },

  mundo: {
    raioIlha:    19,    // raio da parte de grama
    raioAreia:   21,    // raio onde começa a água
    nivelAgua:  -0.45,
    limite:      26,    // além disso o personagem é trazido de volta
  },

  agua: {
    tempoAteVoltar: 0.9, // segundos "na água" antes de reaparecer
  },

  interacao: {
    raio: 1.9,          // distância para um totem acender
  },
};

/** Qualidade gráfica: parâmetros por nível. */
export const QUALIDADE = {
  baixa: { pixelRatioMax: 1,   antialias: false, sombras: 0,    decoracao: 0.45, nuvens: 0, particulas: 0.3 },
  media: { pixelRatioMax: 1.5, antialias: true,  sombras: 1024, decoracao: 0.8,  nuvens: 4, particulas: 0.7 },
  alta:  { pixelRatioMax: 2,   antialias: true,  sombras: 2048, decoracao: 1,    nuvens: 8, particulas: 1 },
};
