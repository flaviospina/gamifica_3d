# Fase 4 — Interface e acabamento (entregue)

Versão `0.4.0`. Publicação: substituir a pasta `atividades/cruzadinha3d` inteira e abrir com Ctrl+F5.

## O que tem

| Módulo | Função |
|---|---|
| `js/audio.js` | Sons por Web Audio (sem arquivos): passos, pulo, pouso, água, abrir/fechar painel, tecla, encaixe da letra, acerto (arpejo), estrela, "quase" (duas notas suaves), dica, zona aberta, celebração. Música ambiente generativa opcional (pentatônica, volume baixo). Preferências salvas. |
| `js/avatar.js` | Tela "Monte seu explorador": cor da roupa (6), cabelo (6), tom de pele (5), acessório (4) + "Surpresa". Aparece na primeira vez e no menu. Escolha salva localmente (fase 5: perfil do aluno). |
| `js/mapa2d.js` | Modo mapa 2D: grade tradicional clicável, pistas horizontais/verticais, setas movem entre casas, Enter abre a palavra. Mesma lógica e pontuação. Grade encolhe para caber no celular. Com o mapa aberto o 3D não renderiza (poupa bateria). |
| HUD | Título, barra de progresso, palavras, estrelas, pontos, cronômetro (só com desafio de tempo), botões Mapa / Som / Menu. |
| Menu | Mapa 2D, mudar explorador, como jogar, voltar ao início, recomeçar; qualidade, sons, música, texto maior, reduzir movimento, controles de toque. |

## Acessibilidade

- Tudo jogável só com teclado: WASD/setas, Espaço, E/Enter, M (mapa), Esc (fecha o que estiver aberto, senão abre o menu). No mapa 2D: Tab e setas.
- Estado nunca só por cor: 🔒 nas pistas trancadas, ✓ nas letras certas, cadeado nas casas fixas, ⭐ nas estrelas, ✅ nas resolvidas.
- "Texto maior nas dicas", "Reduzir movimento" (câmera sem balanço, sem partículas), sons e música desligáveis, "Ouvir dica" (Web Speech pt-BR).
- `aria-live` nas mensagens, `role="dialog"` nas sobreposições, rótulos descritivos nas casas da grade 2D.

## Como testar

1. Primeira abertura: a tela do explorador aparece com a câmera de frente para o personagem. Mude cores e veja ao vivo.
2. Aperte `M`: mapa 2D. Use as setas para andar pelas casas e `Enter` para responder. Volte ao 3D: as letras já estão nos blocos.
3. Menu → ligue "Música ambiente"; clique no alto-falante do HUD para silenciar tudo.
4. Menu → "Texto maior nas dicas" e abra um totem.
5. No celular: botões redondos de mapa e som ao lado do Menu; o mapa 2D cabe na tela.
