# Cidade do Saber · jogo de percurso 3D (Gamifica)

Jogo de tabuleiro em 3D para 1 a 6 jogadores: uma cidade em miniatura com pista em "8" e viaduto,
40 casas com surpresas escondidas e perguntas da matéria. Sem punição: nada tira pontos, estrelas
ou a vez de ninguém.

## Como abrir

Publique a pasta `atividades/percurso3d` no servidor (PHP 8.2, sem build) e abra `index.php`.
Nesta versão a página roda em **modo demonstração**: não pede login e usa `data/perguntas_demo.js`.

Parâmetros úteis: `?qualidade=baixa|media|alta`, `?semwebgl=1` (força o mapa 2D), `?semente=42`
(mesma distribuição de casas), `?rapido=1` (acelera a partida; só para testes).

## Como se joga

1. Tela inicial: escolha de 1 a 6 jogadores (pessoa ou computador), 1 a 3 voltas e o nível do computador.
2. Na vez: **jogar o dado** (botão, Espaço ou Enter) e **dirigir o carrinho** até a casa marcada —
   segure `↑`/`W` no teclado ou o botão ▲ no celular; `←` `→` mudam de faixa. O carrinho para sozinho
   na casa certa. No menu há um piloto automático para quem preferir.
3. A casa revela a surpresa (toda casa começa com "?") e ela fica à mostra para todos.
4. A partida termina quando todos completam as voltas.

## Casas (39 + Largada)

| Carta | Qtde | Efeito |
| --- | --- | --- |
| PERG | 15 | pergunta: acerto = 1 estrela, 10 pontos e +2 casas; erro = fica, vê a resposta e a pergunta volta |
| +2 · +3 · ATALHO | 2 · 2 · 1 | avança 2, 3 ou 4 casas |
| -1 · -2 | 2 · 1 | volta casas e ganha 10 pontos de consolação (nunca desfaz uma volta) |
| +20 · +50 | 2 · 2 | pontos |
| DADO | 2 | joga de novo |
| TODOS | 3 | desafio-relâmpago: todos respondem; quem acerta anda 1; se todos acertam, +1 estrela e +20 pontos |
| TODOS +1 | 1 | mutirão: todos avançam 1 casa |
| CARONA | 1 | pula até o jogador à frente (ou 20 pontos se for o primeiro) |
| MUSEU | 3 | curiosidade + selo (+10 pontos) |
| OBRA | 2 | troca 3 estrelas por um prédio com o nome do aluno (+30 pontos) |

Volta completa: 5 estrelas e 50 pontos. Quem está em último joga o dado com +1 (vento a favor).

XP (prévia no modo demonstração): participação = XP × casas percorridas ÷ total; acertos = 25 % do XP × taxa de acerto.

## Arquivos

- `js/regras.js` — motor de regras puro (sem DOM); `tools/teste_regras.mjs` simula 300 partidas e confere
  que pontos, estrelas e progresso nunca diminuem: `node tools/teste_regras.mjs`.
- `js/pista.js` (geometria), `js/cidade3d.js` (cenário), `js/carrinho.js`, `js/visao3d.js`, `js/visao2d.js`
  (mapa e minimapa; tela principal quando não há WebGL), `js/partida.js` (condução da partida), `js/ui.js`,
  `js/controles.js`, `js/audio.js`, `js/cartas.js`, `data/perguntas_demo.js`.
- `art/` — direção de arte, âncora de estilo e prompts; `conceito/` — cena usada nas imagens-modelo.

## Próximas etapas

- Integração com o Gamifica: tipo de atividade `percurso3d`, editor de perguntas do professor, gravação de XP,
  insígnias, relatório e a cidade da turma (obras persistentes).
- Modo online por sala com código.
- Assets 3D gerados a partir da âncora de estilo (prédios, carrinhos, árvores).
