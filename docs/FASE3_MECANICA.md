# Fase 3 — Mecânica da cruzadinha (entregue)

Versão `0.3.0` da pasta `atividades/cruzadinha3d/`. Publicação igual à fase 2: substituir a pasta inteira
no cPanel e abrir com Ctrl+F5.

## O que tem

| Módulo | Função |
|---|---|
| `js/cruzadinha.js` | Modelo: layout da grade + `EstadoCruzadinha` (resolvidas, letras visíveis, dicas, serialização). Normaliza acentos/cedilha na comparação. |
| `js/gerador.js` | Gerador automático de layout: recebe só palavras + dicas, monta a grade com cruzamentos válidos e devolve as que não couberam. |
| `js/letras.js` | Blocos de letra 3D instanciados (um draw call) com atlas de glifos desenhado em canvas; caem do céu com quique. Letra só na face de cima. |
| `js/painel.js` | Painel da dica: casinhas da palavra, letras de cruzamento travadas (🔒), digitação por teclado físico ou virtual, Enter responde, Esc fecha, botão "Ouvir" (Web Speech pt-BR). |
| `js/progressao.js` | Zonas: as palavras são divididas em até 3 zonas por número; totens das zonas 2 e 3 ficam no alto de pilares de pedra e descem quando o aluno atinge o limiar (⅓ e ⅔ das palavras). |
| `js/celebracao.js` | Final: a grade sobe, um pedestal emerge com placa com o primeiro nome do aluno, câmera gira, confete, depois a tela de resultado. |
| `js/pontuacao.js` | Regra "A": palavras = 100% do XP; estrela de autonomia (palavra sem dica) até +25%; desafio de tempo opcional +10%. |
| `js/particulas.js` | Poeira do pouso das letras, brilhos ao liberar zonas, confete. Desliga com "reduzir movimento". |
| `js/progresso.js` | Progresso parcial em `localStorage` (modo demo). A fase 5 troca pelo servidor. |
| `js/mensagens.js` | Mensagens de incentivo variadas; nunca "errado", nunca vermelho. |
| `data/exemplo_portugues.js` | Segunda cruzadinha de exemplo (12 palavras, 4º ano), gerada pelo gerador automático. |

## Regras "sem punição" implementadas

- Resposta errada: nada muda no estado. As letras na posição certa ficam **douradas com ✓**; as outras "quicam" e saem; mensagem de incentivo.
- Dica ("Revelar uma letra"): sempre disponível, não desconta. A palavra apenas deixa de ganhar a estrela.
- Palavras cujas letras ficaram todas visíveis (cruzamentos + dicas) completam sozinhas.
- Tentativas ilimitadas. O botão "Recomeçar cruzadinha" (menu) só apaga o progresso parcial local.
- Totens trancados só dependem de progresso; com dicas ilimitadas, nenhum aluno fica preso.

## Como testar

1. Aproxime-se do totem 1 e aperte `E` (ou toque em "Ver"). Digite; `Enter` responde.
2. Erre de propósito: veja as letras certas em dourado e a mensagem gentil.
3. Clique em "💡 Revelar uma letra" em outra palavra: a letra cai no tabuleiro na hora.
4. Observe os totens 5 em diante sobre pilares. Ao resolver 3 palavras, eles descem com brilho.
5. Feche a aba e volte: as palavras resolvidas continuam no tabuleiro.
6. Complete tudo: celebração (6 s) e tela de resultado. "Continuar explorando" deixa o monumento na ilha.
7. `?cruzadinha=portugues` abre o segundo exemplo (tema Ilha-Biblioteca).
8. Menu → "Recomeçar cruzadinha" zera o progresso local.

## Formato JSON (para o cadastro na fase 5)

```json
{
  "titulo": "Seres vivos e a natureza", "disciplina": "Ciências", "ano": "3º ano", "tema": "ciencias",
  "xp": 100, "desafioTempo": { "ativo": false, "segundos": 600 },
  "palavras": [ { "dica": "...", "resposta": "ÁGUA", "linha": 1, "coluna": 3, "direcao": "v" } ]
}
```
