# Fase 6 · Passe visual "cinematográfico" (scorecard)

Passe guiado pela skill `threejs-aaa-graphics-builder` (`.claude/skills/`): capturar a cena em jogo,
pontuar 10 categorias (0 placeholder · 1 básico · 2 premium estilizado · 3 vitrine), atacar as
superfícies mais fracas e medir de novo com números do renderer. Capturas em `docs/capturas/`.

## Regra que guiou tudo

> "Glow não transforma primitivas em AAA. Primeiro forma autoral, depois material, luz e, por último, efeitos."

Por isso o passe começou pelos objetos que o jogador olha o tempo todo (totem, cruzadinha, chão)
e só então mexeu em céu, água e pós-processamento.

## O que mudou (versão 0.5.5)

| Superfície | Antes | Depois |
| --- | --- | --- |
| Totem (interação central) | cilindro cinza + cubo com número + bola | base de pedras facetadas, poste de madeira com anéis e braço, placa de madeira com número queimado, lampião de vidro que acende dourado ao chegar (tremula) e verde ao resolver, cadeado dourado quando fechado |
| Cruzadinha | peças claras soltas na grama | laje de arenito com friso dourado (vira um monumento), peças com friso escuro e chanfro claro na borda |
| Pilares das zonas | cilindro + anel cinza, 2 malhas | coluna talhada (fuste, capitel, anel) em arenito, 1 malha |
| Céu | gradiente plano, sol em malha separada | gradiente com faixa quente baixa, disco e halo do sol no shader (−2 draw calls) |
| Água | cor + ondas | fresnel para o céu, cintilação por ruído, reflexo do sol largo (roughness 0.38) |
| Horizonte | 5 ilhas em 25 malhas | 11 rochas facetadas em 1 malha, 6 ilhas em 2 malhas, 7 serras (pico + 2 ombros) a 105–130 u dentro da névoa |
| Névoa | 26–95 | 30–150 (as serras aparecem como silhueta; a água ao longe clareia) |
| Kit de cenário | árvores, arbustos, flores, cogumelos | + 9 palmeiras na areia (instanciadas), areia molhada na beira, 6 lampiões de jardim com chama tremulante ao longo do caminho e nos cantos da laje, mancha escura sob cada árvore (aterramento), rochas facetadas em vez de icosaedros |
| Nuvens | baixas (9–14 u) e perto, 9 segmentos | altas (17–28 u), longe (1,3–3,2 × raio), 14 segmentos, leve emissivo |
| Pós | bloom 0,28 / grade quente / vinheta 0,28 | bloom 0,32 (limiar 0,85) / grade quente + lift das sombras / vinheta 0,34 / grão 2,5 % |
| Estação de pesquisa | ~14 malhas | partes estáticas fundidas por material (antena continua girando) |
| HUD | cartão branco | cartão "papel" com borda dourada e relevo |

## Scorecard (desktop 1280×720, qualidade média/alta; celular 390×780, média)

| Categoria | Antes | Depois | Evidência |
| --- | --- | --- | --- |
| Direção de arte | 2 | 2,5 | paleta fim de tarde aplicada em céu, água, laje, madeira, HUD e luz prática |
| Herói (explorador) | 2 | 2 | sem mudança neste passe (rosto, cachos, gola, botas já autorais) |
| Obstáculos (pilares/zonas) | 1 | 2 | coluna talhada em arenito, cadeado no totem fechado |
| Interações (totens, peças) | 1,5 | 2,5 | totem com 3 estados legíveis à distância (apagado/dourado/verde), peças com friso |
| Mundo | 2 | 2,5 | camadas: laje · caminho com lampiões · vegetação · praia com palmeiras · rochas · ilhas · serras |
| Materiais | 1,5 | 2 | madeira, arenito, ladrilho com friso, vidro do lampião, água com fresnel |
| Luz/render | 2 | 2,5 | sol no céu, reflexo na água, névoa em profundidade, grão e vinheta disciplinados |
| VFX/movimento | 2 | 2 | chama tremulante, lampião balança, cintilação da água (mantidos partículas e pulsos) |
| UI/HUD | 2 | 2 | cartão papel; mesma hierarquia |
| Evidência de desempenho | 2 | 3 | tabela abaixo, antes/depois, custo documentado |

Média: antes 1,8 · depois 2,3. Limiar "premium" da skill: todas ≥ 2 e média ≥ 2,3 — atingido no
desktop; no celular o orçamento de draw calls fica acima do ponto de partida (ver abaixo).

## Diagnóstico do renderer (pior vista em jogo)

| Métrica | Antes (desktop) | Depois (desktop, vista ampla) | Depois (celular) | Orçamento inicial |
| --- | --- | --- | --- | --- |
| Draw calls | 265 | 270 | 194 | 300 / 150 |
| Triângulos | 269 k | 393 k | 280 k | 750 k / 300 k |
| Geometrias | 93 | 99 | 93 | 300 / 200 |
| Texturas | 41 | 45 | 36 | 60 / 40 |
| Programas (shaders) | 48 | 53 | 53 | — |
| Passes de pós além de render+output | 2 | 2 | 2 (média) · 0 (baixa) | 2 / 0–1 |
| Sombras | 1 luz, 1024/2048 | 1 luz, 1024/2048 | 1024 | ≤ 2 luzes, ≤ 2048 |
| Teto de pixels | — | 3,2 Mpx | 3,2 Mpx | DPR 2 / 1,5–2 |

**Compromisso documentado (celular):** 194 draw calls contra os 150 do ponto de partida. A diferença
vem dos 9 totens (4 malhas cada: estrutura fundida, placa, vidro, núcleo) e dos animais (45 malhas).
Mitigação já embutida: a qualidade "baixa" (escolhida automaticamente em aparelhos fracos e após uma
perda de contexto) corta animais pela metade, desliga pós e sombras, e o guarda de FPS reduz a carga ao
vivo quando ficar abaixo de 22 fps no primeiro minuto. Próximo corte possível, se necessário:
instanciar vidro e núcleo dos totens (−18 calls) e fundir corpo dos coelhos/cervo (−10).

## Falhas automáticas da skill (checadas)

- Captura dominada por placeholders ou vazio: não.
- Herói = primitiva + brilho: não.
- HUD só de cartões retangulares: cartão único de status + botões redondos; aceitável.
- Névoa/bloom/partículas no lugar de geometria: não (bloom limiar 0,85, só lampiões, friso e peças resolvidas).
- UI sobre o caminho de jogo: não (HUD nos cantos; aviso central some em 3–7 s).
- Jogável por entrada real: sim (testes Playwright de teclado e toque).
- Sem diagnóstico do renderer: tabela acima.

## O que ainda fica abaixo de 3 (próximo passe, se quiser)

- Herói: textura de tecido/costura na roupa, sombra de contato mais escura, expressão ao acertar.
- VFX: anel de luz no chão quando o totem acende; rastro de estrelinhas ao ganhar estrela.
- Materiais: variação de rugosidade nas copas (hoje só cor).
- Celular: instanciar partes dos totens para voltar aos 150 draw calls.
