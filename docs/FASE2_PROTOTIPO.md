# Fase 2 — Protótipo do mundo (entregue)

Pasta: `atividades/cruzadinha3d/`. Sem build: copie a pasta para
`public_html/gamifica/atividades/cruzadinha3d/` pelo Gerenciador de Arquivos do cPanel
e abra `https://SEU-DOMINIO/gamifica/atividades/cruzadinha3d/index.php`.

## O que tem

| Arquivo | Função |
|---|---|
| `index.php` | Página do jogo (fase 2 abre direto em modo demonstração, sem banco). Importmap do Three.js 0.186.1 via jsDelivr. |
| `.htaccess` | Libera o CDN só nesta pasta (o `.htaccess` da raiz do Gamifica bloqueia scripts externos). |
| `css/jogo.css` | Interface com a paleta Gamifica (navy, papel, verde, dourado) e fontes Fraunces + Inter. |
| `js/main.js` | Orquestra: carregamento, qualidade, mundo, personagem, câmera, controles, HUD, menu. |
| `js/config.js` | Constantes (tamanho do bloco, física, câmera, níveis de qualidade). |
| `js/mundo.js` | Ilha: céu em gradiente, grama, areia, água animada, grade de blocos (`InstancedMesh`), totens, luzes, nuvens. |
| `js/colisao.js` | Colisão por caixas (sólidos e plataformas), degraus automáticos, queda na água. |
| `js/personagem.js` | Personagem de primitivas, animações por código (parado, andando, pulando, comemorando), avatar personalizável. |
| `js/camera.js` | Terceira pessoa suave, giro por mouse/toque, zoom limitado, não atravessa obstáculos. |
| `js/controles.js` | WASD/setas, Espaço, E/Enter, Esc; joystick virtual e botões no toque; pinça para zoom. |
| `js/totem.js` | Totem numerado que acende ao se aproximar. |
| `js/cruzadinha.js` | Lê o JSON da cruzadinha e monta o layout (células, numeração, totens). |
| `js/qualidade.js` | Detecção automática Baixa/Média/Alta + preferência salva. |
| `js/temas/*` | Tema Ciências completo; Geografia, Português e Matemática com paleta pronta. |
| `data/exemplo_ciencias.js` | Cruzadinha de exemplo (9 palavras, 3º ano). |

## Como testar

- Teclado: `W A S D` ou setas andam, `Espaço` pula, `E`/`Enter` interage com totem próximo,
  `Esc` abre o menu. Arraste com o mouse para girar a câmera; roda do mouse dá zoom.
- Celular/tablet: joystick à esquerda, botões "Pular" e "Ver" à direita, arraste na tela para girar,
  pinça para zoom.
- Pise nos blocos da cruzadinha (o personagem sobe sozinho), aproxime-se de um totem (acende e
  mostra "Totem por perto"), pressione `E` para ver a dica no aviso.
- Ande até a água: após 1 s o personagem volta ao último ponto seguro com uma mensagem gentil.
- `?debug=1` na URL mostra FPS e draw calls. `?qualidade=baixa|media|alta` força o nível.
- Menu: qualidade gráfica, reduzir movimento, mostrar controles de toque, voltar ao início.

## Medidas no teste automatizado (Chromium sem GPU, 1280×720)

| Qualidade | Draw calls | Triângulos |
|---|---|---|
| Baixa | 39 | ~5.100 |
| Média | ~105 | ~11.700 |
| Alta | ~120 | ~13.600 |
