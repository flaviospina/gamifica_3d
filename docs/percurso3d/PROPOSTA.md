# Cidade do Saber · jogo de percurso 3D (proposta para aprovação)

Branch: `claude/percurso-3d`. Nada do jogo foi programado ainda: só a cena-conceito que gerou as
imagens 4K desta pasta (`atividades/percurso3d/conceito/`). O jogo só começa depois da aprovação
do layout, das regras e da metodologia abaixo.

## 1. Conceito

Uma cidade em miniatura (diorama) com uma pista sinuosa em forma de "8" que começa e termina no
mesmo lugar: o arco **Largada · Chegada**. No cruzamento do "8" a pista sobe num **viaduto** e passa
por cima dela mesma. Em volta: prédios coloridos, uma torre, um museu com cúpula, parque com lago
e chafariz, árvores e lampiões. Cada jogador é um **carrinho** com bandeirinha na cor dele.

A volta tem **40 casas** em 8 bairros de 5 casas (cada bairro com uma cor, como no tabuleiro do
Banco Imobiliário). A partida é de 1 a 3 voltas, escolhidas pelo professor.

## 2. Quem joga

| Modo | Como |
| --- | --- |
| Sozinho contra o computador | o aluno e 1 a 3 "carrinhos do computador" |
| Até 6 na mesma tela | passa o dispositivo (celular, tablet ou PC) na vez de cada um |
| Até 6 online | sala com código de 6 letras; cada um no seu aparelho; turnos sincronizados |
| Misto | 2 alunos + computador, 4 alunos + computador, etc. |

O computador responde certo numa taxa escolhida pelo professor (fácil 40 %, médio 60 %, difícil 80 %).

## 3. A vez de um jogador

1. **Joga os dados** (1 dado de 6, com animação 3D). O carrinho percorre a pista casa a casa.
2. **Cai numa casa** e acontece o evento dela:

| Casa | O que acontece | Recompensa |
| --- | --- | --- |
| **Pergunta** (24 casas) | pergunta de múltipla escolha do banco do professor, com 4 alternativas | acertou: **+1 estrela** e avança **+2 casas**. Errou: fica onde está, vê a resposta certa com a explicação e recebe uma **dica** (a mesma pergunta volta mais tarde no jogo) |
| **Desafio-relâmpago** (4 casas, na entrada e saída do viaduto) | todos os jogadores respondem a mesma pergunta ao mesmo tempo (20 s) | cada um que acerta avança 1 casa; se **todos** acertam, todos ganham 1 estrela extra |
| **Sorte** (4 casas) | carta sempre boa | "Atalho pelo viaduto: +3 casas", "Patrocínio: a próxima pergunta vale 2 estrelas", "Mutirão: todos avançam 1 casa", "Dados dourados: joga de novo" |
| **Obra** (4 casas, uma por lado da cidade) | troca estrelas por um prédio no terreno do seu bairro | o prédio aparece na cidade 3D para todos, com o nome do aluno na placa; a cidade da turma cresce de partida em partida |
| **Museu / Estação** (3 casas) | curiosidade de 1 parágrafo sobre o tema, lida ou ouvida | **selo** colecionável; 8 selos = insígnia "Explorador da Cidade" |
| **Largada · Chegada** (1 casa) | completou a volta | **+5 estrelas** e confete |

3. Passa a vez. Rodada completa = todos jogaram uma vez.

## 4. Sem punição (regra inegociável do Gamifica)

- Ninguém volta casa, perde estrela, perde a vez ou paga nada. Errar só adia.
- A pergunta errada **volta** mais tarde; acertar na segunda vez vale a estrela normalmente.
- **Vento a favor:** quem está em último joga com +1 no dado. Mantém todo mundo na disputa até o fim.
- A partida só termina quando **todos** completam as voltas (os primeiros torcem e participam dos
  desafios-relâmpago enquanto esperam). Todo mundo "chega".
- O computador nunca ganha estrelas de Obra: a cidade é construída só por alunos.

## 5. Como vira XP no Gamifica

| Fonte | XP |
| --- | --- |
| Casas percorridas (participação) | XP da atividade × casas / (40 × voltas) |
| Estrelas (acertos) | 25 % do XP × estrelas / estrelas possíveis |
| Primeiro a completar as voltas | insígnia "Chave da Cidade" (sem XP extra: o mérito é o acerto, não a sorte do dado) |
| 8 selos | insígnia "Explorador da Cidade" |
| Obras construídas | aparecem no perfil do aluno e no "mapa da turma" |

Vale o melhor resultado; jogar de novo nunca reduz. Mesmo quem errou tudo recebe o XP de
participação por ter percorrido a pista.

## 6. O que o professor configura

- Tema e ano, 1 a 3 voltas, taxa de acerto do computador.
- **Banco de perguntas**: digita no editor (pergunta, 4 alternativas, certa, explicação curta),
  importa de um quiz já existente no Gamifica ou usa um banco pronto de exemplo.
- Modo permitido: só computador, mesma tela, online ou todos.
- Relatório por aluno: perguntas certas e erradas por assunto, estrelas, selos, obras, tempo.

## 7. Metodologia de desenvolvimento (fases, cada uma com aprovação)

| Fase | Entrega |
| --- | --- |
| 1 · Esta proposta | imagens 4K, regras, aprovação |
| 2 · Tabuleiro 3D | gerador da pista em "8" com viaduto, cidade, carrinhos, câmera que acompanha, modo demo navegável |
| 3 · Motor de regras | dado, movimento, eventos das casas, perguntas, estrelas, selos, obras; sozinho contra o computador e até 6 na mesma tela |
| 4 · Online | salas por código, turnos sincronizados (PHP + MySQL, sem WebSocket, compatível com HostGator), reconexão |
| 5 · Gamifica | tipo de atividade `percurso3d`, editor de perguntas, XP e insígnias, relatório, cidade da turma |
| 6 · Polimento | som, acessibilidade, mapa 2D para quem está sem 3D, celular, QA |

Tecnologia: a mesma da Ilha das Palavras (PHP 8.2 + MySQL, módulos ES + Three.js por importmap,
sem build). Reaproveita o mapa 2D de reserva, a detecção de WebGL, o diagnóstico e o cache já resolvidos.

## 8. Decisões abertas (responda junto com a aprovação)

1. Nome: "Cidade do Saber" ou outro?
2. Peões: carrinhos (como nas imagens) ou o explorador da Ilha das Palavras ao volante?
3. Obras: manter a mecânica de construir prédios com estrelas? Ela é o elo mais forte com o Banco Imobiliário.
4. Online na primeira versão ou só depois de "sozinho" e "mesma tela" estarem prontos?
