# Cidade do Saber · direção de arte

Estilo-alvo: **3D cartoon de longa-metragem de animação**, apresentado como um **diorama de mesa**
(cidade em miniatura sobre uma base, vista de cima em 3/4). A sensação é de um brinquedo de qualidade:
tudo arredondado, limpo, colorido e iluminado por um estúdio, sem ruído fotográfico.

Fontes desta direção: a cena-conceito renderizada em `atividades/percurso3d/conceito/` (imagens 4K em
`docs/percurso3d/`), a paleta da marca Gamifica e, como referência só de **estilo**, caixas de jogos de
tabuleiro de cidade em miniatura (prédios coloridos de alturas variadas sobre uma base, peças e dados
grandes). Nenhum logotipo, nome, layout de tabuleiro ou personagem de terceiros é reproduzido.

## Linguagem de formas

- Prédios: caixas com **chanfro generoso** (raio ≈ 3 % da largura), telhados planos com platibanda,
  caixa-d'água, antena e ar-condicionado como "adereços de telhado". Alturas em 3 famílias: casa
  (2–3 andares), prédio (4–7) e marco (torre escalonada, museu com cúpula).
- Pista: fita de asfalto com meio-fio claro, casas do percurso como **placas chanfradas** coloridas
  sobre o asfalto, viaduto com pernas finas e guarda-corpo branco.
- Árvores: copa em gota (esfera levemente alongada) sobre tronco curto; arbustos em cachos de 3 esferas.
- Peões: **carrinhos** compactos, capô arredondado, rodas grandes, bandeirinha com a inicial do jogador.
- Dados e cartas em escala de brinquedo (um dado tem o tamanho de meio carrinho).
- Proporções gerais "chibi": objetos mais largos e baixos que na realidade, silhueta legível a 64 px.
- Personagens (se entrarem): cabeça grande, olhos expressivos, mãos simplificadas, corpo compacto.

## Materiais

- Plástico/argila **fosca com brilho suave** (roughness 0,55–0,8), sem metalness exceto pequenos
  detalhes (cúpula, espira, guarda-corpo: 0,2–0,4).
- Texturas **pintadas à mão**: janelas como retângulos chatos de duas tonalidades, grama com
  pontilhado de dois verdes, asfalto cinza-azulado uniforme com faixas creme e tracejado amarelo.
- Água do lago: azul claro liso, levemente espelhado; nada de ondas realistas.
- Vidro (cabine dos carrinhos, lampiões): azul-gelo translúcido.
- Sem ruído, sem sujeira, sem desgaste, sem fotos.

## Luz

- Principal **quente** (#FFF0D6) de cima-esquerda, ~55° de elevação, sombras macias e curtas.
- Preenchimento **frio** suave (hemisfério céu #DCEBFF / chão #2E4A7A).
- Contraluz azul-claro (#9CC4FF) vindo de trás-direita, destacando as silhuetas.
- Oclusão de ambiente suave nas bases dos prédios e sob as copas.
- Lampiões acesos de leve (emissivo discreto), bloom quase imperceptível.
- Vinheta sutil nas bordas; grão fino (2 %) para "pele de filme".

## Cor

| Papel | Hex |
| --- | --- |
| Base/fundo azul (mesa e céu) | #1F4E9A (horizonte) → #5E9BE6 (alto) |
| Grama | #6FBF4A (sombra #4E9A3A, luz #9ED95E) |
| Asfalto | #4A4F58 · faixas #F5F0DC · tracejado #F2C14E |
| Destaque interativo (dourado da marca) | #E0A537 |
| Verde da marca (UI, acertos) | #286456 |
| Navy da marca (UI, texto) | #161F38 |
| Papel (UI) | #FBF7EF |
| Prédios | rosa #E9607A · vermelho #D9433B · amarelo #F2C14E · verde #58A55C · azul #3E7CB1 · creme #F5EAD3 · laranja #EE8B3A · teal #3BA9A0 · roxo #9B59B6 |
| Bairros do percurso (8 grupos) | #8FD3F4 · #F7B267 · #F4845F · #E9607A · #9B59B6 · #58A55C · #F2C14E · #3E7CB1 |
| Jogadores (6) | #E0A537 · #3E7CB1 · #D9433B · #58A55C · #9B59B6 · #E9607A |

Saturação alta e limpa. O dourado é reservado para o que o jogador pode tocar (casa atual, botão
de dados, carta Sorte, destaque da vez).

## Câmera

- **Tabuleiro / key art**: isométrica 3/4, ~35–40° de elevação, lente 32–36° (sem grande-angular),
  diorama inteiro no quadro com margem de base azul em volta.
- **Props isolados** (prédio, árvore, lampião, carrinho, dado, carta): 3/4 a 30° de elevação,
  objeto inteiro centralizado, sombra de contato suave, fundo neutro para recorte.
- **Personagens**: frontal 3/4 levemente de baixo.
- **Em jogo**: câmera que acompanha o carrinho da vez a ~8 m, 35° de elevação, com transição suave
  para a vista aérea no fim da rodada.

## Acabamento

- Sem contorno de linha; a leitura vem de chanfro + luz + cor.
- Nível de detalhe médio: cada prédio tem 2–4 adereços de telhado, nunca fachadas complexas.
- Texto e números **sempre em código** (HUD, placas de casa, bandeirinhas), nunca dentro das
  imagens geradas.
- Nada de logotipos, marcas d'água ou nomes de produtos nas imagens.

## Como a arte gerada entra no jogo (three.js)

Base procedural continua (pista, placas, HUD). A geração por IA entra em três frentes, nesta ordem:
1. **Âncora** (`art/_anchor.png`): define o visual; referência obrigatória de todo o lote.
2. **Props em vista 3/4** → modelos 3D (GLB) por imagem→3D, com remesh de 2–10 mil triângulos,
   pivô na base, escala em metros (prédio médio ≈ 4 × 6 × 4 m, carrinho ≈ 1,1 × 2,0 m).
3. **Texturas pintadas** (grama, asfalto, fachadas) como atlas 1024², e **key art** da capa/compartilhamento.
Render: ACES Filmic, sRGB, sombras PCF suaves 2048–4096, hemisférica + direcional quente + contraluz
fria, ambiente de estúdio azul, bloom sutil, vinheta e grão leves, profundidade de campo tilt-shift
na vista aérea para reforçar a miniatura.
