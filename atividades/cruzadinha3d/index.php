<?php
// ============================================================
//  atividades/cruzadinha3d/index.php — Ilha das Palavras (cruzadinha 3D)
//
//  FASE 2 (protótipo): abre direto no modo demonstração, sem login
//  e sem banco. A integração com a sessão do aluno entra na fase 5
//  (este arquivo passa a carregar a cruzadinha da atividade e injetar
//  os dados no bloco #dadosJogo).
// ============================================================
$versao = '0.4.0';               // mude para invalidar o cache dos arquivos js/css
$three  = '0.186.1';             // mesma versão de js/config.js

// URL absoluta desta pasta (necessária para as metatags de compartilhamento:
// WhatsApp, Facebook, LinkedIn e X exigem endereços completos para as imagens).
$https    = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$pasta    = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$urlBase  = ($https ? 'https' : 'http') . '://' . $host . $pasta;
$urlPagina = $urlBase . '/index.php' . (isset($_GET['demo']) ? '?demo=1' : '');
$descricao = 'A cruzadinha virou um mundo 3D: ande sobre o tabuleiro, encontre os totens e resolva as palavras. '
           . 'Sem punição, tentativas ilimitadas. Funciona no celular, no tablet e no Chromebook, direto no navegador.';
$dados  = [
  'modo'    => 'demo',
  'jogador' => ['nome' => 'Visitante'],
  // 'cruzadinha' => (fase 5: vem do banco). Sem ela, o jogo usa data/exemplo_ciencias.js
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#161F38">
<title>Ilha das Palavras — Gamifica</title>
<meta name="description" content="<?= htmlspecialchars($descricao) ?>">

<!-- Compartilhamento: Open Graph (WhatsApp, Facebook, LinkedIn, Telegram) -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Gamifica">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="<?= htmlspecialchars($urlPagina) ?>">
<meta property="og:title" content="Ilha das Palavras — a cruzadinha em 3D">
<meta property="og:description" content="<?= htmlspecialchars($descricao) ?>">
<meta property="og:image" content="<?= htmlspecialchars($urlBase) ?>/img/compartilhar-1200x630.jpg">
<meta property="og:image:secure_url" content="<?= htmlspecialchars($urlBase) ?>/img/compartilhar-1200x630.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Ilha das Palavras: personagem explorando a cruzadinha 3D em uma ilha, com totens numerados e blocos de letras">
<meta property="og:image" content="<?= htmlspecialchars($urlBase) ?>/img/compartilhar-1080x1080.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1080">
<meta property="og:image:alt" content="Ilha das Palavras: cruzadinha 3D para explorar, sem punição e com tentativas ilimitadas">

<!-- X / Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Ilha das Palavras — a cruzadinha em 3D">
<meta name="twitter:description" content="<?= htmlspecialchars($descricao) ?>">
<meta name="twitter:image" content="<?= htmlspecialchars($urlBase) ?>/img/compartilhar-1200x630.jpg">
<meta name="twitter:image:alt" content="Ilha das Palavras: personagem explorando a cruzadinha 3D em uma ilha">

<!-- Ícones -->
<link rel="icon" type="image/png" sizes="32x32" href="img/icone-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="img/icone-192.png">
<link rel="icon" href="img/favicon.ico" sizes="any">
<link rel="apple-touch-icon" sizes="180x180" href="img/icone-180.png">
<meta name="apple-mobile-web-app-title" content="Ilha das Palavras">
<meta name="application-name" content="Ilha das Palavras">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/jogo.css?v=<?= $versao ?>">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/examples/jsm/"
  }
}
</script>
</head>
<body>
<canvas id="cena" tabindex="0" aria-label="Mundo 3D da cruzadinha"></canvas>

<!-- Dados da atividade (nunca dados pessoais além do primeiro nome) -->
<script id="dadosJogo" type="application/json"><?= json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>

<!-- Carregamento -->
<div id="carregamento" role="status" aria-live="polite">
  <div class="logo-ilha" aria-hidden="true">🏝️</div>
  <h1>Ilha das Palavras</h1>
  <p>Uma cruzadinha para explorar</p>
  <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><div id="carregamentoBarra" style="width:10%"></div></div>
  <div id="carregamentoTexto">Carregando o motor 3D…</div>
</div>

<!-- HUD -->
<div id="hudTopo" class="hud">
  <div class="cartao hud-cartao">
    <div id="hudTitulo">Ilha das Palavras</div>
    <div id="hudTema"></div>
    <div class="hud-progresso" aria-hidden="true"><div id="hudBarra"></div></div>
    <div class="hud-linha"><span id="hudPalavras"></span> <span id="hudEstrelas" title="Estrelas de autonomia">⭐ 0</span> <span id="hudPontos">0 pts</span> <span id="hudTempo" hidden></span></div>
  </div>
  <div class="hud-botoes">
    <button id="btnMapa" class="botao redondo" type="button" title="Mapa 2D (M)" aria-label="Abrir mapa 2D da cruzadinha">🗺️</button>
    <button id="btnSom" class="botao redondo" type="button" title="Som" aria-label="Ligar ou desligar os sons" aria-pressed="true">🔊</button>
    <button id="btnMenu" class="botao" type="button" aria-haspopup="dialog">☰ Menu</button>
  </div>
</div>
<div id="dicaInteracao" class="hud" hidden>Totem por perto! <kbd>E</kbd> para ver a dica</div>
<div id="aviso" class="hud" role="status" aria-live="polite" hidden></div>
<div id="hudAjuda" class="hud">
  <kbd>W A S D</kbd> ou setas: andar · <kbd>Espaço</kbd>: pular · <kbd>E</kbd>: totem<br>
  arraste o mouse: girar · roda: zoom · <kbd>M</kbd>: mapa 2D · <kbd>Esc</kbd>: menu
</div>
<div id="hudFps" hidden>— fps</div>

<!-- Controles de toque -->
<div id="controlesToque" aria-hidden="true">
  <div id="joystick"><div id="joystickPino"></div></div>
  <button id="btnPular" class="btnToque" type="button"><span>⤒</span>Pular</button>
  <button id="btnInteragir" class="btnToque" type="button"><span>✦</span>Ver</button>
</div>

<!-- Painel da dica -->
<div id="painelDica" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="dicaNumero" hidden>
  <div class="painel painel-dica">
    <div class="dica-cabecalho">
      <span id="dicaNumero" class="dica-numero">1 →</span>
      <div class="dica-botoes">
        <button id="btnOuvir" class="botao secundario mini" type="button" title="Ouvir a dica" aria-label="Ouvir a dica">🔊 Ouvir</button>
        <button id="btnFecharDica" class="botao secundario mini" type="button" aria-label="Fechar painel">✕</button>
      </div>
    </div>
    <p id="dicaTexto" class="dica-texto"></p>
    <div class="casinhas-wrap">
      <div id="casinhas" class="casinhas" aria-live="polite"></div>
      <input id="entradaResposta" class="entrada-oculta" type="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" aria-label="Digite a resposta, uma letra por casa" enterkeyhint="done">
    </div>
    <div id="dicaMensagem" class="dica-mensagem" role="status" aria-live="polite"></div>
    <div class="acoes">
      <button id="btnRevelar" class="botao secundario" type="button">💡 Revelar uma letra</button>
      <button id="btnResponder" class="botao dourado" type="button">Responder ✓</button>
    </div>
    <div class="dica-rodape">Dicas não tiram pontos. Resolver sem dica ganha uma ⭐ extra.</div>
  </div>
</div>

<!-- Resultado final -->
<div id="resultado" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="resNome" hidden>
  <div class="painel painel-resultado">
    <div class="res-trofeu" aria-hidden="true">🏆</div>
    <h2 id="resNome">Parabéns!</h2>
    <p class="res-sub">Você completou a Ilha das Palavras.</p>
    <dl class="res-grade">
      <div><dt>Palavras</dt><dd id="resPalavras">0/0</dd></div>
      <div><dt>Estrelas ⭐</dt><dd id="resEstrelas">0</dd></div>
      <div><dt>Dicas usadas</dt><dd id="resDicas">0</dd></div>
      <div><dt>Tempo</dt><dd id="resTempo">0:00</dd></div>
    </dl>
    <table class="res-pontos">
      <tr><td>Palavras resolvidas</td><td id="resBase">0</td></tr>
      <tr><td>Bônus de autonomia</td><td id="resBonusEstrelas">+0</td></tr>
      <tr id="resBonusTempoLinha"><td>Bônus de tempo</td><td id="resBonusTempo">+0</td></tr>
      <tr class="total"><td>Pontuação</td><td id="resTotal">0</td></tr>
    </table>
    <p id="resDemo" class="res-demo" hidden>Modo demonstração: nada foi gravado.</p>
    <div class="acoes">
      <button id="btnJogarDeNovo" class="botao secundario" type="button">Jogar de novo</button>
      <button id="btnContinuarExplorando" class="botao" type="button">Continuar explorando</button>
    </div>
  </div>
</div>

<!-- Menu -->
<div id="menu" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="menuTitulo" hidden>
  <div class="painel painel-menu">
    <h2 id="menuTitulo">Opções</h2>
    <div class="menu-colunas">
      <div>
        <h3>Jogo</h3>
        <button id="btnMenuMapa" class="botao secundario largo" type="button">🗺️ Mapa 2D da cruzadinha</button>
        <button id="btnMenuAvatar" class="botao secundario largo" type="button">🧑 Mudar meu explorador</button>
        <button id="btnComoJogar" class="botao secundario largo" type="button">❓ Como jogar</button>
        <button id="btnVoltarInicio" class="botao secundario largo" type="button">🏝️ Voltar ao início da ilha</button>
        <button id="btnReiniciar" class="botao secundario largo" type="button">🔄 Recomeçar cruzadinha</button>
      </div>
      <div>
        <h3>Acessibilidade e som</h3>
        <label>Qualidade gráfica
          <select id="selQualidade"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select>
        </label>
        <label>Sons do jogo <input type="checkbox" id="chkSom"></label>
        <label>Música ambiente <input type="checkbox" id="chkMusica"></label>
        <label>Texto maior nas dicas <input type="checkbox" id="chkTextoGrande"></label>
        <label>Reduzir movimento (câmera e partículas) <input type="checkbox" id="chkMovimento"></label>
        <label>Mostrar controles de toque <input type="checkbox" id="chkToque"></label>
      </div>
    </div>
    <div class="acoes">
      <button id="btnFecharMenu" class="botao" type="button">Continuar jogando</button>
    </div>
  </div>
</div>

<!-- Como jogar -->
<div id="ajuda" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="ajudaTitulo" hidden>
  <div class="painel">
    <h2 id="ajudaTitulo">Como jogar</h2>
    <ol class="ajuda-lista">
      <li><b>Explore a ilha.</b> No computador: <kbd>W A S D</kbd> ou setas para andar, <kbd>Espaço</kbd> para pular, arraste o mouse para girar a câmera. No celular: joystick e botões.</li>
      <li><b>Encontre os totens numerados.</b> Chegue perto, aperte <kbd>E</kbd> (ou toque em "Ver") e leia a dica. Pode ouvir a dica em voz alta.</li>
      <li><b>Digite a resposta</b> nas casinhas e aperte <kbd>Enter</kbd>. Acertou? As letras caem do céu no tabuleiro!</li>
      <li><b>Errou? Sem problema.</b> Nada é perdido. As letras na posição certa ficam douradas para ajudar.</li>
      <li><b>Precisa de ajuda?</b> "Revelar uma letra" sempre funciona e não tira pontos. Resolver sem dica ganha uma ⭐ extra.</li>
      <li><b>Abra caminhos.</b> Alguns totens ficam no alto de pilares: resolva palavras e eles descem.</li>
      <li><b>Prefere a cruzadinha de sempre?</b> O mapa 2D (<kbd>M</kbd>) mostra a grade tradicional, clicável, com a mesma pontuação.</li>
    </ol>
    <div class="acoes"><button id="btnFecharAjuda" class="botao" type="button">Entendi!</button></div>
  </div>
</div>

<!-- Personalização do explorador -->
<div id="telaAvatar" class="sobreposicao lateral" role="dialog" aria-modal="true" aria-labelledby="avatarTitulo" hidden>
  <div class="painel painel-avatar">
    <h2 id="avatarTitulo">Monte seu explorador</h2>
    <p class="res-sub">Escolha como você quer aparecer na ilha. Dá para mudar depois no menu.</p>
    <div id="avatarOpcoes"></div>
    <div class="acoes">
      <button id="btnAvatarAleatorio" class="botao secundario" type="button">🎲 Surpresa</button>
      <button id="btnAvatarComecar" class="botao dourado" type="button">Começar a explorar →</button>
    </div>
  </div>
</div>

<!-- Mapa 2D -->
<div id="mapa2d" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="mapaTitulo" hidden>
  <div class="painel painel-mapa">
    <div class="dica-cabecalho">
      <h2 id="mapaTitulo">Mapa da cruzadinha</h2>
      <button id="btnFecharMapa" class="botao secundario mini" type="button">Voltar ao 3D ✕</button>
    </div>
    <p class="mapa-ajuda">Clique em uma casa ou em uma pista para responder. Setas movem entre as casas; <kbd>Enter</kbd> abre.</p>
    <div class="mapa-corpo">
      <div class="mapa-grade-wrap"><table id="grade2d" class="grade2d" role="grid"></table></div>
      <div class="mapa-pistas">
        <h3>Horizontais →</h3><div id="pistasH" class="pistas-lista"></div>
        <h3>Verticais ↓</h3><div id="pistasV" class="pistas-lista"></div>
      </div>
    </div>
    <div id="mapaStatus" class="dica-mensagem" role="status" aria-live="polite"></div>
  </div>
</div>

<!-- Carregador externo: erros de CDN/CSP viram mensagem na tela -->
<script type="module" src="js/boot.js?v=<?= $versao ?>"></script>
</body>
</html>
